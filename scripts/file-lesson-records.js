#!/usr/bin/env node
'use strict';

// No dependencies, prompts, scan overrides, or raw Git/error output. Exit codes and
// status text are stable; only filenames, line numbers, and counts are variable.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { TextDecoder } = require('util');

const STOPS = {
  config: [2, 'STOP: invalid or unreadable testing config'],
  repo: [3, 'STOP: no notes repository; files remain saved'],
  remote: [4, 'STOP: remote or remote default branch unavailable or ambiguous'],
  branch: [5, 'STOP: notes repository is not on the remote default branch'],
  git: [6, 'STOP: cannot inspect repository'],
  history: [7, 'STOP: outgoing history contains an ineligible commit'],
  format: [8, 'STOP: record format or receipt needs attention'],
  scan: [9, 'STOP: scan failed; unreadable input, invalid encoding, or unusable term list'],
  hit: [10, 'STOP: scan flagged lines; anonymize and rerun'],
  sync: [11, 'STOP: fast-forward failed; files and commits remain pending'],
  commit: [12, 'STOP: record commit failed; inspect pending state'],
  verify: [13, 'STOP: committed record verification failed; commit remains queued'],
  push: [14, 'STOP: push failed; commits remain queued'],
  dirty: [15, 'STOP: rebase requires a clean index and tracked working tree'],
  rebase: [16, 'STOP: rebase failed; commits remain queued'],
  retry: [17, 'STOP: push retry failed; commits remain queued'],
  abort: [18, 'STOP: rebase abort failed; repository needs attention'],
};
class Stop extends Error {
  constructor(reason) { super(reason); this.reason = reason; }
}
function stop(reason) { throw new Stop(reason); }
function status(text) { process.stdout.write(`${text}\n`); }
function fileStatus(text, file, lines = []) {
  status(`${text}: ${JSON.stringify(file)}${lines.length ? ` lines ${lines.join(',')}` : ''}`);
}
function decode(bytes) {
  let encoding = 'utf-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le';
  if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be';
  const text = new TextDecoder(encoding, { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  if (text.includes('\0')) throw new Error('encoding');
  return text;
}
function readTerms(file) {
  let bytes;
  try { bytes = fs.readFileSync(file); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  const terms = decode(bytes).split(/\r\n|\n|\r/)
    .map(s => s.replace(/\uFEFF/g, '').trim().toLowerCase()).filter(Boolean);
  if (bytes.length && !terms.length) throw new Error('empty terms');
  return terms;
}
const SECRETS = [
  /\bsk-(?:[a-z]+-)?[a-z0-9_-]{12,}/i,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/i,
  /\b(?:gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,})/i,
  /\b(?:xox[baprs]-[a-z0-9-]{10,}|AIza[a-z0-9_-]{30,})/i,
  /-----BEGIN (?:[A-Z0-9]+ )*(?:PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----/i,
  /\b(?:api[_-]?key|access[_-]?token|token|secret|password)\b["']?\s*[:=]\s*["']?[a-z0-9_+/.=-]{16,}/i,
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@\[\]]+:[^\s@/\[\]]+@/i,
  /\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/i,
];
function scan(text, terms = []) {
  const hits = [];
  text.split(/\r\n|\n|\r/).forEach((line, index) => {
    // Slash commands have one segment. Only this documented Claude config prefix
    // is exempt; a secret/email/term in that prefix is still scanned below.
    const paths = line.replace(/~\/\.claude\/[^\s<>"'`)]*/g, '[claude-config]');
    const hasPath = /(?:^|[\s("'`=])(?:~\/|\/(?!\/))[a-z0-9_.~-]+\/[^\s<>"'`/)]+/i.test(paths)
      || /\b[a-z]:[\\/][^\s<>"'`\\/]+[\\/][^\s<>"'`\\/]+/i.test(paths)
      || /\\\\[^\s\\]+\\[^\s\\]+/.test(paths);
    const emails = line.match(/\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/gi) || [];
    const hasEmail = emails.some(email => /[a-z]/i.test(email.slice(email.lastIndexOf('.') + 1)));
    if (terms.some(term => line.toLowerCase().includes(term)) || hasPath || hasEmail
      || SECRETS.some(pattern => pattern.test(line))) hits.push(index + 1);
  });
  return hits;
}

// Structural validation only: the session still judges receipt quality and truth.
// Accept the command's flat YAML fields and indented block scalars, without a YAML dependency.
function recordCount(text, file) {
  text = text.replace(/\r\n|\r/g, '\n');
  const timestamp = path.posix.basename(file, '.md');
  if (!/^\d{8}-\d{6}$/.test(timestamp)) return 0;
  const blocks = [...text.matchAll(/^#### .+\r?\n+```yaml\r?\n([\s\S]*?)^```[ \t]*\r?$/gm)];
  if (!blocks.length || (text.match(/^```yaml\s*$/gm) || []).length !== blocks.length) return 0;
  const date = `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;
  for (let i = 0; i < blocks.length; i++) {
    const fields = new Map();
    let current;
    for (const line of blocks[i][1].split(/\r?\n/)) {
      if (!line.trim()) continue;
      const field = /^([a-z_]+):[ \t]*(.*)$/.exec(line);
      if (field) {
        if (fields.has(field[1])) return 0;
        current = field[1];
        fields.set(current, field[2]);
      } else if (/^\s/.test(line) && current) fields.set(current, `${fields.get(current)}\n${line.trim()}`);
      else return 0;
    }
    const value = key => (fields.get(key) || '').replace(/^(["'])(.*)\1$/s, '$2');
    if (value('id') !== `L-${timestamp}-${i + 1}` || value('date') !== date) return 0;
    const kind = value('kind');
    if (!['new', 'occurrence'].includes(kind)) return 0;
    const required = kind === 'new'
      ? ['recurrence_of', 'class', 'polarity', 'severity', 'caught_by', 'cost', 'engines', 'module', 'receipt', 'refutes', 'refuted_by']
      : ['recurrence_of', 'receipt', 'caught_by', 'what_differs'];
    if (required.some(key => !value(key).trim())) return 0;
    if (!value('receipt').replace(/^[|>][+-]?\s*/, '').trim()) return 0;
  }
  return blocks.length;
}

function run() {
  const config = path.join(os.homedir(), '.claude', 'orchestrator-testing.md');
  if (!fs.existsSync(config)) { status('OK: testing mode off'); return; }
  let notes;
  try {
    const configured = decode(fs.readFileSync(config)).split(/\r\n|\n|\r/).find(line => line.trim());
    if (!configured || !path.isAbsolute(configured.trim())) stop('config');
    notes = path.dirname(configured.trim());
    if (!fs.statSync(notes).isDirectory()) stop('config');
  } catch (_) { stop('config'); }
  const records = path.join(notes, 'records');
  const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_LITERAL_PATHSPECS: '1',
    GIT_EDITOR: 'true', GIT_SEQUENCE_EDITOR: 'true', GCM_INTERACTIVE: 'never', LC_ALL: 'C' };
  let root = notes;
  function git(args) {
    // A credential prompt or stalled network must not hold wrap-up: time out and stop instead.
    const result = spawnSync('git', ['-C', root, ...args], { env: gitEnv, maxBuffer: 32 * 1024 * 1024,
      timeout: 60 * 1000 });
    return { ok: !result.error && result.status === 0, bytes: result.stdout || Buffer.alloc(0) };
  }
  function must(args, reason = 'git') {
    const result = git(args);
    if (!result.ok) stop(reason);
    return result.bytes.toString('utf8').trim();
  }
  root = must(['rev-parse', '--show-toplevel'], 'repo');
  const prefix = path.relative(root, records).split(path.sep).join('/');
  if (prefix === '..' || prefix.startsWith('../') || path.isAbsolute(prefix)) stop('repo');
  const branchAtStart = must(['symbolic-ref', '--quiet', '--short', 'HEAD'], 'branch');
  // A record left staged by an earlier failed commit is not "others": unstage it so it is found again.
  const stagedNew = must(['diff', '--cached', '--name-only', '--diff-filter=A', '-z', '--', `${prefix}/`])
    .split('\0').filter(file => path.posix.dirname(file) === prefix
      && /^\d{8}-\d{6}\.md$/.test(path.posix.basename(file)));
  for (const file of stagedNew) must(['reset', '-q', '--', file], 'commit');
  const listed = must(['ls-files', '--others', '--exclude-standard', '-z', '--', `${prefix}/`]);
  const pending = listed.split('\0').filter(file => path.posix.dirname(file) === prefix && file.endsWith('.md')).sort();
  const remotes = must(['remote'], 'remote').split('\n').filter(Boolean);
  if (remotes.length !== 1) stop('remote');
  const remote = remotes[0];
  // Multiple fetch/push URLs could publish somewhere other than the inspected repo.
  const urls = must(['remote', 'get-url', '--all', remote], 'remote').split('\n');
  const pushUrls = must(['remote', 'get-url', '--push', '--all', remote], 'remote').split('\n');
  if (urls.length !== 1 || pushUrls.length !== 1 || urls[0] !== pushUrls[0]) stop('remote');
  const symref = must(['ls-remote', '--symref', remote, 'HEAD'], 'remote');
  const match = /^ref: refs\/heads\/(.+)\tHEAD$/m.exec(symref);
  if (!match) stop('remote');
  const branch = match[1];
  function checkBranch() {
    if (branchAtStart !== branch || must(['symbolic-ref', '--quiet', '--short', 'HEAD'], 'branch') !== branch) stop('branch');
  }
  checkBranch();
  let terms;
  try { terms = readTerms(path.join(records, '.scan-terms')); }
  catch (_) { stop('scan'); }
  status(terms === null ? 'term scan not run: no list' : `term count: ${terms.length}`);
  terms = terms || [];
  const blocked = new Set();
  let pendingReason;
  function inspect(bytes, file) {
    let text;
    try { text = decode(bytes); }
    catch (_) { fileStatus('SCAN FAILED', file); return 'scan'; }
    const hits = scan(text, terms);
    if (hits.length) { fileStatus('SCAN HIT', file, hits); return 'hit'; }
    const count = recordCount(text, file);
    if (!count) { fileStatus('INVALID RECORD', file); return 'format'; }
    return count;
  }
  for (const file of pending) {
    let result;
    try {
      const absolute = path.join(root, file);
      if (!fs.lstatSync(absolute).isFile()) throw new Error('not a regular file');
      result = inspect(fs.readFileSync(absolute), file);
    }
    catch (_) { fileStatus('SCAN FAILED', file); result = 'scan'; }
    if (typeof result !== 'number') {
      blocked.add(file);
      pendingReason = pendingReason || result;
      fileStatus('PENDING: record remains uncommitted', file);
    } else fileStatus('SCAN CLEAN', file);
  }
  let tip;
  function fetch() {
    must(['fetch', '--no-tags', remote, `refs/heads/${branch}`], 'remote');
    tip = must(['rev-parse', 'FETCH_HEAD']);
    status('OK: fetched remote default branch');
  }
  function outgoing() {
    return must(['rev-list', '--reverse', `${tip}..HEAD`]).split('\n').filter(Boolean);
  }
  const reportedQueued = new Set();
  function checkOutgoing() {
    checkBranch();
    const commits = outgoing();
    for (const oid of commits) {
      if (must(['rev-list', '--parents', '-n', '1', oid]).split(' ').length !== 2) stop('history');
      const entries = must(['diff-tree', '--no-commit-id', '--name-status', '--no-renames', '-r', '-z', oid]).split('\0');
      if (!entries[0]) stop('history');
      let count = 0;
      let timestamp;
      for (let i = 0; i < entries.length && entries[i]; i += 2) {
        const [change, file] = [entries[i], entries[i + 1]];
        if (change !== 'A' || !file || !file.startsWith(`${prefix}/`)
          || !/^\d{8}-\d{6}\.md$/.test(file.slice(prefix.length + 1))) stop('history');
        const stamp = path.posix.basename(file, '.md');
        if (timestamp && timestamp !== stamp) stop('history');
        timestamp = stamp;
        if (!/^100(?:644|755) blob /.test(must(['ls-tree', oid, '--', file]))) stop('history');
        if (!reportedQueued.has(file)) {
          fileStatus('QUEUED: record committed but not pushed', file);
          reportedQueued.add(file);
        }
        const blob = git(['show', `${oid}:${file}`]);
        if (!blob.ok) stop('scan');
        const result = inspect(blob.bytes, file);
        if (typeof result !== 'number') stop(result);
        count += result;
      }
      if (must(['show', '-s', '--format=%B', oid]) !== `Lesson records ${timestamp} (${count})`) stop('history');
    }
    return commits;
  }
  let retried = false;
  function push() {
    checkOutgoing();
    const pushed = git(['push', '--porcelain', remote, `HEAD:refs/heads/${branch}`]);
    if (pushed.ok) { status('OK: records pushed'); return; }
    if (retried) stop('retry');
    if (!/\[(?:remote )?rejected\] \((?:fetch first|non-fast-forward|failed to update ref)\)/.test(pushed.bytes.toString('utf8'))) stop('push');
    status('REJECTED: push rejected; checking remote advance');
    retried = true;
    const previous = tip;
    fetch();
    // Retry only an advance of the inspected remote, never auth/network errors or a force update.
    if (!git(['merge-base', '--is-ancestor', previous, tip]).ok
      || git(['merge-base', '--is-ancestor', tip, 'HEAD']).ok) stop('push');
    checkOutgoing();
    if (must(['status', '--porcelain', '--untracked-files=no'])) stop('dirty');
    status('RETRY: remote advanced; rebasing record commits once');
    if (!git(['rebase', tip]).ok) {
      if (!git(['rebase', '--abort']).ok) stop('abort');
      stop('rebase');
    }
    checkOutgoing();
    if (!git(['push', '--porcelain', remote, `HEAD:refs/heads/${branch}`]).ok) stop('retry');
    status('OK: records pushed after one rebase');
  }
  fetch();
  const queued = checkOutgoing();
  if (!git(['merge', '--ff-only', tip]).ok) {
    if (!queued.length || git(['merge-base', '--is-ancestor', tip, 'HEAD']).ok) stop('sync');
    // Diverged queued records use the very same rejection/rebase budget as new records.
    push();
    fetch();
    if (!git(['merge', '--ff-only', tip]).ok) stop('sync');
  }
  for (const file of pending) {
    if (blocked.has(file)) continue;
    checkBranch();
    // Recheck after synchronization and reject any path that has become tracked or a symlink.
    if (must(['ls-files', '--', file])) stop('sync');
    let result;
    try {
      const absolute = path.join(root, file);
      if (!fs.lstatSync(absolute).isFile()) stop('scan');
      result = inspect(fs.readFileSync(absolute), file);
    } catch (_) { stop('scan'); }
    if (typeof result !== 'number') { pendingReason = pendingReason || result; continue; }
    const timestamp = path.posix.basename(file, '.md');
    must(['add', '--', file], 'commit');
    if (!git(['commit', '--only', '-m', `Lesson records ${timestamp} (${result})`, '--', file]).ok) {
      // Unstage so the next run rediscovers the record instead of silently skipping it.
      git(['reset', '-q', '--', file]);
      stop('commit');
    }
    fileStatus('OK: record committed', file);
    const changed = must(['diff-tree', '--no-commit-id', '--name-only', '-r', '-z', 'HEAD']);
    if (changed !== `${file}\0`) stop('verify');
    const blob = git(['show', `HEAD:${file}`]);
    if (!blob.ok) stop('verify');
    // Git may normalize CRLF or apply clean filters. Scan the actual committed blob;
    // byte equality with a working-tree read is neither required nor sufficient.
    const verified = inspect(blob.bytes, file);
    if (typeof verified !== 'number') stop(verified);
    if (verified !== result) stop('verify');
    fileStatus('OK: committed blob scanned', file);
    reportedQueued.add(file);
    checkOutgoing();
  }
  if (outgoing().length) push();
  else if (!pending.length) status('OK: no pending records');
  if (pendingReason) stop(pendingReason);
  status('OK: lesson filing complete');
}

if (require.main === module) {
  try { run(); }
  catch (error) {
    const [code, message] = STOPS[error instanceof Stop ? error.reason : 'git'];
    status(message);
    process.exitCode = code;
  }
}
module.exports = { decode, readTerms, scan, recordCount, STOPS };
