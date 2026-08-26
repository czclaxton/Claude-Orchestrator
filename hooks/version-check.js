'use strict';

/**
 * Version drift check for the SessionStart hook.
 *
 * Answers one question: is the plugin code this session actually loaded the
 * newest code available? There are three states, not two, and the third is the
 * one people miss:
 *
 *   running  < installed   ->  you already updated; the session hasn't restarted
 *   installed < available  ->  a newer version exists upstream; run the update
 *   otherwise              ->  say nothing
 *
 * "running" is whatever CLAUDE_PLUGIN_ROOT points at — the exact copy this
 * session loaded. "installed" is the newest version sitting in the plugin
 * cache. They differ for the whole span between `claude plugin update` and the
 * next restart, which is precisely when a naive two-way check reports "up to
 * date" while the session keeps executing old code.
 *
 * Never blocks. The hook runs on every session start with a 10s timeout, so
 * nothing here waits on a network round trip: git-sourced marketplaces are
 * checked by a detached background process that writes a cache file, and this
 * run reports whatever the cache already held. The practical effect is that
 * upstream news surfaces one session later than it landed. That is the price
 * of never delaying a session start, and it is the right trade.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const PLUGINS_DIR = path.join(CLAUDE_DIR, 'plugins');
const CACHE_ROOT = path.join(PLUGINS_DIR, 'cache');
const MARKETPLACES_ROOT = path.join(PLUGINS_DIR, 'marketplaces');
const SETTINGS = path.join(CLAUDE_DIR, 'settings.json');
const CHECK_CACHE = path.join(CLAUDE_DIR, 'orchestrator-version-check.json');

const PLUGIN_NAME = 'claude-orchestrator';
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/** Read and parse JSON, returning null on any failure. Callers treat null as "unknown". */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** Compare dotted numeric versions. Returns <0, 0, or >0. Non-numeric segments sort as 0. */
function compareVersions(a, b) {
  const pa = String(a).split('.');
  const pb = String(b).split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = parseInt(pa[i], 10) || 0;
    const nb = parseInt(pb[i], 10) || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

/**
 * The version this session actually loaded, read from the manifest inside
 * CLAUDE_PLUGIN_ROOT rather than inferred from the directory name — the
 * directory name is a convention, the manifest is the fact.
 */
function runningVersion() {
  const root = process.env.CLAUDE_PLUGIN_ROOT;
  if (!root) return null;
  const manifest = readJson(path.join(root, '.claude-plugin', 'plugin.json'));
  return manifest && manifest.version ? String(manifest.version) : null;
}

/**
 * Locate this plugin in the cache. Returns { marketplace, dir, newest } or null.
 * The marketplace name is discovered rather than assumed, because a user may
 * have added this plugin under a marketplace name of their own choosing.
 */
function findInstalled() {
  let marketplaces;
  try {
    marketplaces = fs.readdirSync(CACHE_ROOT, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of marketplaces) {
    if (!entry.isDirectory()) continue;
    const pluginDir = path.join(CACHE_ROOT, entry.name, PLUGIN_NAME);
    let versions;
    try {
      versions = fs.readdirSync(pluginDir, { withFileTypes: true })
        .filter((v) => v.isDirectory())
        .map((v) => v.name);
    } catch {
      continue;
    }
    if (versions.length === 0) continue;

    versions.sort(compareVersions);
    return {
      marketplace: entry.name,
      dir: pluginDir,
      newest: versions[versions.length - 1],
    };
  }
  return null;
}

/** The marketplace's source record from settings, or null if it isn't declared there. */
function marketplaceSource(name) {
  const settings = readJson(SETTINGS);
  const known = settings && settings.extraKnownMarketplaces;
  const entry = known && known[name];
  return entry && entry.source ? entry.source : null;
}

/**
 * What the source currently offers.
 *
 * A directory source is a local path, so it is read synchronously and the exact
 * version is always known. A git source cannot be read without the network, so
 * this returns whatever a previous background check cached, and schedules a
 * refresh when that cache is stale.
 */
function availableFrom(source, marketplace) {
  if (!source) return { kind: 'unknown' };

  if (source.source === 'directory' && source.path) {
    const manifest = readJson(path.join(source.path, '.claude-plugin', 'plugin.json'));
    if (manifest && manifest.version) {
      return { kind: 'version', version: String(manifest.version) };
    }
    return { kind: 'unknown' };
  }

  // Git-backed marketplaces are local clones. Comparing the clone's tip against
  // the server's tip needs the network, so it happens out of band.
  const clone = path.join(MARKETPLACES_ROOT, marketplace);
  if (!fs.existsSync(path.join(clone, '.git'))) return { kind: 'unknown' };

  const cache = readJson(CHECK_CACHE) || {};
  const record = cache[marketplace];
  const age = record && record.checkedAt ? Date.now() - Date.parse(record.checkedAt) : Infinity;

  if (!Number.isFinite(age) || age > STALE_AFTER_MS) {
    scheduleRefresh(marketplace, clone);
  }

  if (record && record.behind === true) return { kind: 'behind' };
  return { kind: 'unknown' };
}

/**
 * Start the network check in a process that outlives this hook.
 *
 * Detached with no stdio, and unref'd, so the hook exits immediately no matter
 * how long the git call takes or whether it hangs.
 */
function scheduleRefresh(marketplace, clone) {
  try {
    const child = spawn(
      process.execPath,
      [path.join(__dirname, 'version-check.js'), '--refresh', marketplace, clone],
      { detached: true, stdio: 'ignore' }
    );
    child.unref();
  } catch {
    // Best-effort. A failed refresh means one more session without the notice.
  }
}

/**
 * The background half: ask the server for its tip and compare against the
 * clone's. Deliberately `ls-remote` rather than `fetch` — it is one round trip,
 * writes nothing, and reuses whatever git credentials the user already has, so
 * private marketplaces work with no token handling here.
 *
 * This reports *that* the marketplace moved, not which version it moved to.
 * Naming the version would mean fetching the objects and locating the plugin's
 * manifest inside a marketplace whose layout varies by publisher. The weaker
 * claim is the one that can be made honestly and cheaply.
 */
function refresh(marketplace, clone) {
  const finish = (behind) => {
    const cache = readJson(CHECK_CACHE) || {};
    cache[marketplace] = { checkedAt: new Date().toISOString(), behind };
    try {
      fs.writeFileSync(CHECK_CACHE, JSON.stringify(cache, null, 2) + '\n');
    } catch {
      // Best-effort.
    }
  };

  const git = (args, done) => {
    let out = '';
    try {
      const proc = spawn('git', ['-C', clone].concat(args), { stdio: ['ignore', 'pipe', 'ignore'] });
      proc.stdout.on('data', (d) => { out += d.toString(); });
      proc.on('error', () => done(null));
      proc.on('close', (code) => done(code === 0 ? out.trim() : null));
    } catch {
      done(null);
    }
  };

  git(['ls-remote', 'origin', 'HEAD'], (remote) => {
    if (!remote) return finish(false);
    const remoteHash = remote.split(/\s+/)[0];
    git(['rev-parse', 'HEAD'], (localHash) => {
      if (!localHash || !remoteHash) return finish(false);
      finish(remoteHash !== localHash);
    });
  });
}

/**
 * Returns a sentence for the session, or null when there is nothing to say.
 * Silence is the common case and the correct one — a notice on every start
 * stops being read.
 */
function versionNotice() {
  const running = runningVersion();
  const installed = findInstalled();
  if (!installed) return null;

  // Highest priority: the update already happened and only a restart is missing.
  // Reporting "up to date" here would be true of the files and false of the session.
  if (running && compareVersions(running, installed.newest) < 0) {
    return (
      `Claude Orchestrator ${installed.newest} is installed, but this session is running ` +
      `${running}. Restart Claude Code to pick it up — the update wrote new files, it did not ` +
      `swap what is already loaded.`
    );
  }

  const source = marketplaceSource(installed.marketplace);
  const available = availableFrom(source, installed.marketplace);

  if (available.kind === 'version' && compareVersions(installed.newest, available.version) < 0) {
    return (
      `Claude Orchestrator ${available.version} is available (you have ${installed.newest}). ` +
      `Update with: claude plugin marketplace update ${installed.marketplace} && ` +
      `claude plugin update ${PLUGIN_NAME}@${installed.marketplace}`
    );
  }

  if (available.kind === 'behind') {
    return (
      `The ${installed.marketplace} marketplace has moved upstream since you last synced it, so a ` +
      `newer Claude Orchestrator may be available (you have ${installed.newest}). Check with: ` +
      `claude plugin marketplace update ${installed.marketplace} && ` +
      `claude plugin update ${PLUGIN_NAME}@${installed.marketplace}`
    );
  }

  return null;
}

if (require.main === module && process.argv[2] === '--refresh') {
  refresh(process.argv[3], process.argv[4]);
} else {
  module.exports = { versionNotice, compareVersions };
}
