'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { decode, readTerms, scan, recordCount, STOPS } = require('./file-lesson-records');
const script = path.join(__dirname, 'file-lesson-records.js');
const transcript = process.env.LESSON_FILING_TRANSCRIPT === '1';

function record(stamp = '20261114-120000', receipt = 'Command: check-runner\n  Output: 0 tests collected; exit 0.') {
  return `#### Empty check reported as a pass

\`\`\`yaml
id: L-${stamp}-1
date: 2026-11-14
kind: new
recurrence_of: none
class: false-success
polarity: failure
severity: medium
caught_by: self
cost: 5 minutes
engines: unknown
module: Reviewer
receipt: |
  ${receipt}
refutes: none
refuted_by: none
\`\`\`
Require a test count before reporting a pass.
`;
}

function fixture(t, { nested = true, log = false } = {}) {
  const temp = fs.mkdtempSync(path.join(__dirname, '.lesson-record-tests-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const home = path.join(temp, 'home');
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  const env = { ...process.env, HOME: home, USERPROFILE: home, GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: path.join(temp, 'global.gitconfig'), GIT_TERMINAL_PROMPT: '0', LC_ALL: 'C' };
  fs.writeFileSync(env.GIT_CONFIG_GLOBAL, '');
  const local = path.join(temp, 'notes');
  const remote = path.join(temp, 'remote.git');
  function show(line) {
    if (transcript && log) console.log(line.replaceAll(JSON.stringify(temp).slice(1, -1), '[scratch]')
      .replaceAll(temp.replaceAll('\\', '/'), '[scratch]').replaceAll(temp, '[scratch]'));
  }
  function git(cwd, ...args) {
    show(`$ git -C ${JSON.stringify(cwd)} ${args.map(a => JSON.stringify(a)).join(' ')}`);
    const result = spawnSync('git', ['-C', cwd, ...args], { env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    if (result.stdout.trim()) show(result.stdout.trim());
    return result.stdout.trim();
  }
  git(temp, 'init', '--bare', '--initial-branch=main', remote);
  git(temp, 'clone', remote, local);
  function identity(repo) {
    git(repo, 'config', 'user.name', 'Test User');
    git(repo, 'config', 'user.email', 'test@example.invalid');
    git(repo, 'config', 'core.autocrlf', 'true');
  }
  identity(local);
  fs.writeFileSync(path.join(local, 'README.md'), 'Notes repository.\n');
  git(local, 'add', '--', 'README.md');
  git(local, 'commit', '-m', 'Initialize notes');
  git(local, 'push', 'origin', 'HEAD:refs/heads/main');
  const notes = nested ? path.join(local, 'nested', 'notes') : local;
  const records = path.join(notes, 'records');
  fs.mkdirSync(records, { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'orchestrator-testing.md'), `${path.join(notes, 'lessons.md')}\n`);
  show('$ # Config first line is [scratch]/notes/nested/notes/lessons.md; no lessons.md is needed.');
  const prefix = path.relative(local, records).split(path.sep).join('/');
  function write(stamp = '20261114-120000', receipt) {
    const file = `${prefix}/${stamp}.md`;
    // Exercise real CRLF worktree input with core.autocrlf=true.
    fs.writeFileSync(path.join(local, file), record(stamp, receipt).replace(/\n/g, '\r\n'));
    show(`$ # Write CRLF record ${file} with fixture receipt ${JSON.stringify(receipt || 'empty check output')}`);
    return file;
  }
  function run(expected) {
    show(`$ node ${JSON.stringify(script)}`);
    const result = spawnSync(process.execPath, [script], { env, encoding: 'utf8' });
    show(result.stdout.trim());
    show(`exit ${result.status}`);
    assert.equal(result.stderr, '', 'the script must not leak Git output or input data');
    assert.equal(result.status, expected, result.stdout);
    return result.stdout;
  }
  function second() {
    const other = path.join(temp, 'second');
    git(temp, 'clone', remote, other);
    identity(other);
    return other;
  }
  function commit(file, stamp = '20261114-120000') {
    git(local, 'add', '--', file);
    git(local, 'commit', '--only', '-m', `Lesson records ${stamp} (1)`, '--', file);
  }
  return { temp, env, home, local, remote, records, prefix, git, write, run, second, commit, show };
}

test('scanner accepts slash commands, Claude config paths, versions, and placeholders', () => {
  for (const clean of ['/wrap-up', '/claude-orchestrator:wrap-up', '~/.claude/x.md',
    '~/.claude/plugins/cache/x.md', 'pkg@1.2.3', '[path]/file.md', '[secret]']) {
    assert.deepEqual(scan(clean), [], clean);
  }
});

test('scanner flags literal terms, two-segment paths, emails, UUIDs, and secrets by line only', () => {
  for (const hit of ['PRIVATE client', '/home/project', '~/project/file', 'C:\\project\\file',
    '\\\\host\\share', 'person@example.com', 'person@example.1a',
    '00112233-4455-6677-8899-aabbccddeeff', 'sk-abcdefghijklmnop',
    'AKIA0123456789ABCDEF', 'ghp_abcdefghijklmnopqrst', 'xoxb-12345678901',
    '-----BEGIN PRIVATE KEY-----', 'password=abcdefghijklmnop', 'https://user:pass@example.invalid',
    '~/.claude/sk-abcdefghijklmnop']) {
    assert.deepEqual(scan(`clean\n${hit}`, ['private']), [2], hit);
  }
  assert.deepEqual(scan('a+b\naxb', ['a+b']), [1]);
});

test('term decoding handles BOM/CRLF, UTF-16 LE/BE, and fails closed', t => {
  const temp = fs.mkdtempSync(path.join(__dirname, '.lesson-record-tests-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const file = path.join(temp, '.scan-terms');
  for (const bytes of [Buffer.from('\uFEFF Private \r\n Client \r\n'),
    Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('Private\r\nClient\r\n', 'utf16le')]),
    Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from('Private\r\nClient\r\n', 'utf16le').swap16()])]) {
    fs.writeFileSync(file, bytes);
    assert.deepEqual(readTerms(file), ['private', 'client']);
    assert.deepEqual(scan('A PRIVATE example', readTerms(file)), [1]);
  }
  for (const bytes of [Buffer.from('\uFEFF \r\n'), Buffer.from([0xff]), Buffer.from('a\0b')]) {
    fs.writeFileSync(file, bytes);
    assert.throws(() => readTerms(file));
  }
  assert.throws(() => readTerms(temp));
  assert.throws(() => decode(Buffer.from([0xff, 0xfe, 0x41])));
  assert.equal(readTerms(path.join(temp, 'absent')), null);
});

test('record structure requires matching IDs, date, and a nonempty receipt', () => {
  assert.equal(recordCount(record(), 'records/20261114-120000.md'), 1);
  assert.equal(recordCount(record().replace('receipt: |\n  Command: check-runner\n  Output: 0 tests collected; exit 0.', 'receipt: |'), 'records/20261114-120000.md'), 0);
  assert.equal(recordCount(record(), 'records/20261114-120001.md'), 0);
});

test('CRLF clean record commits and pushes while preserving unrelated staged work', t => {
  const f = fixture(t, { log: true });
  f.show('CASE: clean CRLF record, core.autocrlf=true');
  const file = f.write();
  fs.writeFileSync(path.join(f.local, 'unrelated.txt'), 'keep staged\n');
  f.git(f.local, 'add', '--', 'unrelated.txt');
  const output = f.run(0);
  assert.match(output, /OK: records pushed/);
  assert.equal(f.git(f.local, 'diff', '--cached', '--name-only'), 'unrelated.txt');
  assert.equal(f.git(f.local, 'show', '--format=', '--name-only', 'HEAD'), file);
  assert.equal(f.git(f.local, 'rev-parse', 'HEAD'), f.git(f.remote, 'rev-parse', 'main'));
  assert.ok(!f.git(f.local, 'show', `HEAD:${file}`).includes('\r'));
});

test('term hit stops, leaves record untracked, and never prints the term', t => {
  const f = fixture(t, { log: true });
  f.show('CASE: private term hit');
  fs.writeFileSync(path.join(f.records, '.scan-terms'), '\uFEFF SyntheticClient \r\n');
  const file = f.write(undefined, 'Command: SyntheticClient check\n  Output: no tests; exit 0.');
  f.show('$ # Private .scan-terms contains the synthetic test term, UTF-8 BOM + CRLF.');
  const output = f.run(10);
  assert.match(output, /SCAN HIT: .* lines 16/);
  assert.ok(!output.includes('SyntheticClient'));
  assert.equal(f.git(f.local, 'ls-files', '--', file), '');
  assert.equal(f.git(f.local, 'rev-parse', 'HEAD'), f.git(f.remote, 'rev-parse', 'main'));
});

test('record mentioning /wrap-up files and pushes', t => {
  const f = fixture(t, { log: true });
  f.show('CASE: slash command receipt');
  f.write(undefined, 'Command: /wrap-up\n  Output: no tests; exit 0.');
  f.run(0);
  assert.equal(f.git(f.local, 'rev-parse', 'HEAD'), f.git(f.remote, 'rev-parse', 'main'));
});

function race(f, { repeat = false, conflict = false } = {}) {
  const second = f.second();
  const file = conflict ? `${f.prefix}/20261114-120000.md` : 'remote-update.txt';
  fs.mkdirSync(path.dirname(path.join(second, file)), { recursive: true });
  fs.writeFileSync(path.join(second, file), 'Remote update.\n');
  f.git(second, 'add', '--', file);
  f.git(second, 'commit', '-m', 'Remote advance during push');
  // Git invokes pre-push AFTER reading the remote refs: this second clone's push
  // makes the script's first actual push fail with a real non-fast-forward rejection.
  const secondArg = `'${second.replaceAll('\\', '/').replaceAll("'", "'\\''")}'`;
  const hook = `#!/bin/sh\n${repeat ? `git -C ${secondArg} commit --allow-empty -m 'Advance again' >/dev/null 2>&1\n` : 'rm -- "$0"\n'}git -C ${secondArg} push origin HEAD:refs/heads/main >/dev/null 2>&1\n`;
  fs.writeFileSync(path.join(f.local, '.git', 'hooks', 'pre-push'), hook, { mode: 0o755 });
  f.show('$ # pre-push hook runs: git -C [scratch]/second push origin HEAD:refs/heads/main');
  f.show('$ # Hook removes itself; remote advances after Git reads refs and before its first push.');
}

test('real push rejection fetches, rebases only records once, and retries successfully', t => {
  const f = fixture(t, { log: true });
  f.show('CASE: rejected first push, one rebase and retry');
  f.write();
  race(f);
  const output = f.run(0);
  assert.match(output, /RETRY: remote advanced; rebasing record commits once/);
  assert.match(output, /OK: records pushed after one rebase/);
  assert.equal((output.match(/RETRY:/g) || []).length, 1);
  assert.equal(f.git(f.local, 'rev-parse', 'HEAD'), f.git(f.remote, 'rev-parse', 'main'));
  assert.match(f.git(f.local, 'log', '-3', '--format=%s'), /^Lesson records 20261114-120000 \(1\)\nRemote advance during push\nInitialize notes$/);
});

test('race fixture causes an actual rejected push', t => {
  const f = fixture(t);
  f.commit(f.write());
  race(f);
  const result = spawnSync('git', ['-C', f.local, 'push', '--porcelain', 'origin', 'HEAD:refs/heads/main'], { env: f.env, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /\[(?:remote )?rejected\] \((?:fetch first|non-fast-forward|failed to update ref)\)/);
});

test('blocked untracked file does not block another clean record', t => {
  const f = fixture(t);
  const bad = f.write(undefined, 'Command: /private/project\n  Output: no tests.');
  const good = f.write('20261114-120001');
  f.run(10);
  assert.equal(f.git(f.local, 'ls-files', '--', bad), '');
  assert.equal(f.git(f.remote, 'ls-tree', '-r', '--name-only', 'main', '--', good), good);
});

test('every outgoing commit is checked, including changes hidden by a later reversal', t => {
  const f = fixture(t);
  f.write();
  fs.writeFileSync(path.join(f.local, 'outside.txt'), 'unrelated\n');
  f.git(f.local, 'add', '--', 'outside.txt');
  f.git(f.local, 'commit', '-m', 'Unrelated outgoing change');
  f.git(f.local, 'rm', '--', 'outside.txt');
  f.git(f.local, 'commit', '-m', 'Undo unrelated change');
  f.run(7);
});

test('unpushed committed blobs are scanned even when worktree was sanitized', t => {
  const f = fixture(t);
  const file = f.write(undefined, 'Command: /private/project\n  Output: no tests.');
  f.commit(file);
  fs.writeFileSync(path.join(f.local, file), record());
  f.run(10);
  assert.notEqual(f.git(f.local, 'rev-parse', 'HEAD'), f.git(f.remote, 'rev-parse', 'main'));
});

test('queued record commits recover without a new untracked record', t => {
  const f = fixture(t);
  const file = f.write();
  f.commit(file);
  const other = f.second();
  fs.writeFileSync(path.join(other, 'advance.txt'), 'remote advance\n');
  f.git(other, 'add', '--', 'advance.txt');
  f.git(other, 'commit', '-m', 'Advance remote');
  f.git(other, 'push', 'origin', 'HEAD:refs/heads/main');
  assert.match(f.run(0), /OK: records pushed after one rebase/);
});

test('committed clean-filter output is scanned and stops publication on a hit', t => {
  const f = fixture(t);
  f.write();
  const filter = path.join(f.temp, 'filter.js');
  fs.writeFileSync(filter, "process.stdin.resume(); process.stdin.on('end', () => process.stdout.write('password=abcdefghijklmnop\\n'));\n");
  f.git(f.local, 'config', 'filter.test.clean', `"${process.execPath.replaceAll('\\', '/')}" "${filter.replaceAll('\\', '/')}"`);
  fs.writeFileSync(path.join(f.local, '.git', 'info', 'attributes'), '*.md filter=test\n');
  f.run(10);
  assert.notEqual(f.git(f.local, 'rev-parse', 'HEAD'), f.git(f.remote, 'rev-parse', 'main'));
});

test('rejection recovery refuses unrelated staged work', t => {
  const f = fixture(t);
  f.write();
  fs.writeFileSync(path.join(f.local, 'unrelated.txt'), 'keep staged\n');
  f.git(f.local, 'add', '--', 'unrelated.txt');
  race(f);
  f.run(15);
  assert.equal(f.git(f.local, 'diff', '--cached', '--name-only'), 'unrelated.txt');
});

test('rebase conflicts abort without overwriting records', t => {
  const f = fixture(t);
  f.write();
  race(f, { conflict: true });
  f.run(16);
  assert.equal(f.git(f.local, 'status', '--porcelain', '--untracked-files=no'), '');
  assert.equal(f.git(f.local, 'log', '-1', '--format=%s'), 'Lesson records 20261114-120000 (1)');
});

test('a second rejection stops after exactly one rebase and retry', t => {
  const f = fixture(t);
  f.write();
  race(f, { repeat: true });
  const output = f.run(17);
  assert.equal((output.match(/RETRY:/g) || []).length, 1);
});

test('a server hook rejection does not trigger a rebase', t => {
  const f = fixture(t);
  f.write();
  fs.writeFileSync(path.join(f.remote, 'hooks', 'pre-receive'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  assert.ok(!f.run(14).includes('RETRY:'));
});

test('unexpected branch, ambiguous remote, malformed record, and invalid terms stop distinctly', t => {
  const f = fixture(t);
  f.write();
  f.git(f.local, 'checkout', '-b', 'other');
  f.run(5);
  f.git(f.local, 'checkout', 'main');
  f.git(f.local, 'remote', 'add', 'extra', f.remote);
  f.run(4);
  f.git(f.local, 'remote', 'remove', 'extra');
  fs.writeFileSync(path.join(f.records, '.scan-terms'), Buffer.from([0xff]));
  f.run(9);
  fs.unlinkSync(path.join(f.records, '.scan-terms'));
  fs.writeFileSync(path.join(f.records, '20261114-120000.md'), 'No receipt\n');
  f.run(8);
  assert.equal(new Set(Object.values(STOPS).map(([code]) => code)).size, Object.keys(STOPS).length);
});

test('session-start advertises the absolute script path only in testing mode', t => {
  const f = fixture(t);
  const hook = path.join(__dirname, '..', 'hooks', 'session-start.js');
  const pluginRoot = path.resolve(__dirname, '..');
  const env = { ...f.env, CLAUDE_PLUGIN_ROOT: pluginRoot };
  const result = spawnSync(process.execPath, [hook], { env, input: '{}', encoding: 'utf8' });
  assert.equal(result.status, 0);
  const context = JSON.parse(result.stdout).hookSpecificOutput.additionalContext;
  assert.ok(context.includes(`Lesson-filing script path: ${JSON.stringify(script)}`));
  fs.unlinkSync(path.join(f.home, '.claude', 'orchestrator-testing.md'));
  const off = spawnSync(process.execPath, [hook], { env, input: '{}', encoding: 'utf8' });
  assert.equal(off.status, 0);
  assert.ok(!off.stdout.includes('Lesson-filing script path:'));
});

test('a non-timestamp Markdown file is reported, rather than silently skipped', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.records, 'mistyped.md'), record());
  assert.match(f.run(8), /INVALID RECORD: .*mistyped.md/);
});
