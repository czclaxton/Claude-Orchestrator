---
description: Sweep session findings, write a resume note for this project, and prepare for /clear
---

Prepare this session to be cleared. Do the following, in order.

## 1. Check whether Claude Orchestrator testing mode is active

Check whether `~/.claude/orchestrator-testing.md` exists.

**If it doesn't exist:** skip this step entirely. Testing mode is off; there's nothing to sweep.

**If it exists:** its first non-empty line is the absolute path to `lessons.md`. It is valid if
it is absolute and its parent directory exists; `lessons.md` itself need not exist. If the config
is empty, invalid, or unreadable, report the problem and continue at step 3; don't invent a path.
Call that parent directory the **Notes directory**; write `records/` beside the configured file.
Find its containing **Notes repo** with `git -C "$notes_dir" rev-parse --show-toplevel`; the Notes
directory need not be the git root. **Note its branch before writing anything** (including detached
HEAD). If there is no git repo or remote, still write eligible records, skip committing, and report
the saved files. Use a private, dedicated Notes repo: testing mode authorizes direct default-branch
pushes, including on existing installations; it does not open lesson PRs.

Review this session for friction or successes specifically about the **Claude Orchestrator plugin
itself** (routing decisions, agent behavior, spec quality). Describe the orchestrator's behavior,
project-agnostically; omit the project's substance, identifiers, and business logic. Only log
something that recurred, or was notable/severe enough to justify logging alone. Don't log routine,
uneventful use.

### Receipts and anonymization

**No receipt, no record.** Each finding needs evidence a later reader can use to confirm the claim:

- The exact command or action and the output showing the result, excerpted and anonymized.
- Before/after artifact text, or a quoted line with an explanation of what was wrong.
- Counts together with how they were counted.
- A persistent public source (URL or public-repo commit), with what it shows.

Embed the evidence itself or the persistent public source in `receipt`. Saying "verified",
"confirmed", or "I checked" is not evidence. A session ID, private link, or local log pointer
is not a receipt. If evidence cannot be retained safely, skip the finding. Count findings dropped
for lack of a safe receipt and report that count (including zero) in the wrap-up reply.

Anonymize the whole record, including receipts and prose, while keeping the mechanism visible:
project names → `[project]`; client/company names → `[client]`; people → their role (e.g.
`[developer]` or `[user]`); file paths → `[path]/<basename>` only when the basename matters and is
safe, otherwise `[path]`; private-system URLs → `[private-url]`. Include no session IDs, actual
project paths, or secrets. Keep command and code shapes only as minimal anonymized excerpts needed
to show the orchestrator's behavior; do not copy project code or substance. Public-source URLs may
remain only if they disclose no private context.

### Record format

Search existing `records/` first, using headings and `class`, and read likely matches for the same
mechanism. Also consult legacy `pending-lessons/` fragments and `lessons.md` where relevant; leave
them unchanged. A repeat with nothing new is an `occurrence`, linked to the earlier ID or legacy
fragment filename. A finding with new information is `new`; link a related earlier record when
applicable, otherwise use `recurrence_of: none`. Each repeat still needs its own receipt.

If no finding clears the bar with a safe receipt, write no new file; still run step 2 to recover
earlier pending records. Otherwise, write one new `records/<YYYYMMDD-HHMMSS>.md` per wrap-up,
containing one or more records. Use **UTC** for the filename timestamp and each record's date;
the timestamp in every ID must equal its containing file's timestamp. Create
`records/` if needed; never overwrite an existing file (choose a fresh timestamp on collision).
Use a short, generic level-four Markdown heading (`####`) per record, then a fenced YAML block
followed by at most five lines of prose: what happened, what it cost, what would have prevented it.
Never append to `lessons.md`. The fields for a `new` record are:

| Field | Value / rule |
|---|---|
| `id`, `date`, `kind` | `L-<YYYYMMDD-HHMMSS>-<n>` (stable, never reused; n starts at 1), `YYYY-MM-DD`, `new` or `occurrence` |
| `recurrence_of` | Earlier record ID, legacy fragment filename, or `none` |
| `class` | One class from the fixed list below, or `other: <name>` (quote this YAML value) |
| `polarity`, `severity` | `failure` / `success`; `low` / `medium` / `high` (high = wrong result reached the user, or work lost) |
| `caught_by` | `user` / `reviewer` / `cross-family` / `self` / `check` / `luck` / `not-caught` |
| `cost` | Rough minutes or rework rounds |
| `engines` | Quoted comma-separated string of `provider-model (effort)` entries, e.g. `"provider-model (high), provider-model (unknown)"`; `unknown` if unavailable |
| `module` | The v2 module this informs: `Interviewer`, `Planner`, `Orchestrator`, `Router`, `Workers`, `Reviewer`, `Scribe`, `Maintenance`, `Auditor`, `Human`, `Docs`, `Other`; use `Other` if unsure |
| `receipt` | Required evidence as above; use a YAML block scalar for multiline excerpts |
| `refutes`, `refuted_by` | Earlier/later record ID, or `none`; link claims shown false |

An **`occurrence`** contains only `id`, `date`, `kind: occurrence`, `recurrence_of`, `receipt`,
`caught_by`, and one-line `what_differs` (`nothing` is allowed). Do not repeat the full narrative.
For a refutation, the new record's `refutes` is authoritative. Set the earlier record's
`refuted_by` too if it is in this same new file; otherwise report its ID for the periodic audit
to fill in the backlink. Do not edit or stage older files in this sweep. A missing `refuted_by`
backlink does not invalidate a refutation.

Fixed classes: `false-success` (exit 0 / empty / inert check), `brief-carries-false-fact`,
`report-overclaims`, `handoff-lost-or-wrong`, `scope-or-permission-mismatch`, `routing-wrong-lane`,
`review-missed-defect`, `review-caught-defect`, `stale-state-or-fact`, `concurrency-conflict`,
`tooling-or-harness-fault`, `user-correction`, plus `other: <name>`. Only a periodic audit extends
the fixed list.

Two invented, generic examples from separate files: the first in `records/20260102-100000.md`,
the occurrence in `records/20260103-110000.md` refers to it:

#### Empty check reported as a pass

```yaml
id: L-20260102-100000-1
date: 2026-01-02
kind: new
recurrence_of: none
class: false-success
polarity: failure
severity: medium
caught_by: reviewer
cost: 5 minutes
engines: unknown
module: Reviewer
receipt: |
  Command: check-runner --path [path]
  Output: "0 tests collected; exit 0". Report: "All tests passed."
refutes: none
refuted_by: none
```
The orchestrator treated an empty check as proof. Rework took five minutes; require a test count.

#### Empty check repeated

```yaml
id: L-20260103-110000-1
date: 2026-01-03
kind: occurrence
recurrence_of: L-20260102-100000-1
receipt: |
  Command: check-runner --path [path]
  Output: "0 tests collected; exit 0". Report: "All tests passed."
caught_by: self
what_differs: Self caught the empty check before the final report.
```

## 2. Recover pending records, scan, commit, and push

Work in the **Notes repo**, never the current project's repo. At the start, discover earlier
untracked `records/<YYYYMMDD-HHMMSS>.md` files beside the configured `lessons.md`, as well as the
new file (if any). Validate their record format and receipts, and process each independently;
do not adopt modifications to tracked records. Also discover unpushed record commits below.
Do this even if step 1 wrote nothing. Skip only when there is no pending work.

For Git operations, work from the containing git root. Set `record_path` to the exact
repository-relative path of the file being processed, and `scan_terms` to the repository-relative
path of the Notes directory's `records/.scan-terms` (these may include a subdirectory prefix).
If there is no repo, leave the files saved and report that committing was skipped.

### Scan each file in full

Before first use, ask the user to create the private `records/.scan-terms` beside their records,
with one client/project name per line. Never invent its contents, print them, or add this list to
the public plugin. An absent list skips only the term scan and must be reported as
`term scan not run: no list`. Do not block the remaining secret/identifier scans on that absence.

Run this exact **Bash + Node** command after setting `record_path` and `scan_terms` as above.
It reads UTF-8 and BOM-marked UTF-16 LE/BE, strips BOMs/CRs and surrounding term whitespace,
reports the effective term count to stderr, and searches terms as case-insensitive literal
substrings. A nonempty list yielding zero terms, invalid encoding, or any read error fails the
scan. Stdout contains matching **line numbers only** (one per line); stderr contains only safe
status messages. Exit codes: 0 = clean, 1 = hits, 2 = failed/incomplete scan.

```bash
node - "$record_path" "$scan_terms" <<'NODE'
const fs = require('fs');
const { TextDecoder } = require('util');
function readText(path) {
  const bytes = fs.readFileSync(path);
  let encoding = 'utf-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = 'utf-16le';
  if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = 'utf-16be';
  const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
  if (text.includes('\0')) throw new Error('encoding');
  return { text: text.replace(/^\uFEFF/, ''), size: bytes.length };
}
try {
  const [file, list] = process.argv.slice(2);
  if (!file || !list) throw new Error('arguments');
  const record = readText(file).text;
  let terms = [];
  try {
    const source = readText(list);
    terms = source.text.split(/\r\n|\n|\r/).map(s => s.replace(/\uFEFF/g, '').trim())
      .filter(Boolean).map(s => s.toLowerCase());
    if (source.size > 0 && terms.length === 0) throw new Error('empty terms');
    console.error(`term count: ${terms.length}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    console.error('term scan not run: no list');
  }
  const patterns = [
    /\bsk-(?:[a-z]+-)?[a-z0-9_-]{12,}/i,
    /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/i,
    /\b(?:gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,})/i,
    /\b(?:xox[baprs]-[a-z0-9-]{10,}|AIza[a-z0-9_-]{30,})/i,
    /-----BEGIN (?:[A-Z0-9]+ )*(?:PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----/i,
    /\b(?:api[_-]?key|access[_-]?token|token|secret|password)\b["']?\s*[:=]\s*["']?[a-z0-9_+/.=-]{16,}/i,
    /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@\[\]]+:[^\s@/\[\]]+@/i,
    /\b[A-Z]:[\\/][^\s<>"'`]+/i,
    /\\\\[^\s\\]+\\[^\s]+/,
    /(?:^|[\s("'`=])(?:~\/|\/(?!\/))[a-z0-9_.~-]+(?:\/[^\s<>"'`]*)?/i,
    /\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/i,
    /\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+\b/i
  ];
  const hits = [];
  record.split(/\r\n|\n|\r/).forEach((line, index) => {
    const lower = line.toLowerCase();
    if (terms.some(term => lower.includes(term)) || patterns.some(p => p.test(line))) {
      hits.push(index + 1);
    }
  });
  for (const line of hits) console.log(line);
  console.error(hits.length ? 'scan stopped: flagged lines' : 'scan clean');
  process.exitCode = hits.length ? 1 : 0;
} catch (_) {
  console.error('scan failed: unreadable input, invalid encoding, or unusable term list');
  process.exitCode = 2;
}
NODE
```

This also flags common API keys, private-key headers, credential assignments and URL passwords,
absolute paths (including home-relative paths), UUID-shaped IDs, and email addresses. Placeholders
such as `[path]` and `[secret]` are not credentials. This heuristic can miss unusual secrets,
identifiers, split tokens, and names absent from the list, and can flag innocent text. Manually
review anonymization and the whole receipt too; a clean scan is not proof that publication is safe.

**On any hit: stop that file's automatic commit/push.** Show only its matching line numbers and
ask the user to resolve them. Leave it in place and continue other safe work and steps 3 onward
without waiting. Only an explicit **yes for the specific flagged lines** can authorize retaining
a false positive; no response is not approval. Actual secrets/private identifiers must be removed.
A failed/incomplete scan cannot be waived. After any edit or on a later retry, scan the full final
contents again; never silently override a hit. A blocked untracked file does not stop a clean file;
a blocked committed record stops pushing every commit that would publish it.

### Synchronize and guard the outgoing history

1. Determine the intended remote and its actual default branch with
   `git ls-remote --symref "$remote" HEAD` (use `origin` only if it is the intended remote;
   stop if ambiguous). Do not assume a branch name or trust a cached default ref. If discovery
   fails, leave files uncommitted and report why. **If the repo was not on this default branch
   in step 1, or is no longer on it**, leave files in place; report the unexpected branch or
   detached HEAD. Do not switch branches or create a worktree.
2. Fetch before committing: `git fetch "$remote" "refs/heads/$default"`, then capture
   `remote_tip=$(git rev-parse FETCH_HEAD)`. Inspect **every** commit in `"$remote_tip..HEAD"`,
   not just HEAD or the net diff. An allowed record commit has exactly one parent, is nonempty,
   and adds only timestamp-named `.md` files in this Notes directory's `records/`, with no other changed paths
   (especially no `.scan-terms`). Check each commit with
   `git diff-tree --no-commit-id --name-status -r "$oid"` and check its parent count. Refuse
   committing or pushing if any outgoing commit fails this rule. Do not reset, amend, or hide it.
3. Recover allowed unpushed commits too: validate each record's format/receipts and scan the full
   blob **as committed**, not just the working-tree copy. Materialize `git show "$oid:$path"`
   into a private temporary file, run the exact scanner above with that temporary `record_path`
   and the same `scan_terms`, then remove the copy and restore `record_path`. Require the fixed safe
   subject below on queued commits too; report other subjects without echoing them. Do not rewrite
   them automatically.
4. Run `git merge --ff-only "$remote_tip"` before making a new commit; preserve unrelated staged,
   dirty, and untracked files. If it cannot fast-forward because of local edits, stop and report;
   never auto-stash or discard changes. If histories diverge with only allowed, scanned record
   commits ahead, first retry pushing those queued commits using the rejection recovery below;
   make no new commit until they are synchronized and this fast-forward-only check succeeds.

### Commit one scanned file and push

After successful synchronization, recheck the default branch and the file's final contents:

1. Stage **only the exact new/untracked file being processed** with `git add -- "$record_path"`,
   never `git add -A`. Never stage `lessons.md`, the scan list, tracked records, or unrelated work.
   Inspect `git diff --cached -- "$record_path"` against the scanned contents; any change requires
   another full scan. Unrelated staged changes stay staged and must not enter this commit.
2. Use only this fixed message, with the file's UTC timestamp and number of records substituted:
   `git commit --only -m "Lesson records $timestamp ($count)" -- "$record_path"`.
   Do not include finding text, project identifiers, or free-form descriptions in commit messages.
3. Verify `git show --format= --name-only HEAD` lists **exactly** `"$record_path"`, and verify
   the committed blob equals the scanned contents. On a mismatch, do not push, amend, or reset;
   report that the commit needs attention. Recheck the entire outgoing range using the rules above
   immediately before every push, including retries. Never push an unrelated commit.
4. Push explicitly: `git push "$remote" "HEAD:refs/heads/$default"`. No lesson branch, PR,
   force-push, or automatic rewriting of other work.

**One rejection recovery per wrap-up:** if a push is rejected because the remote advanced, fetch
again, capture its fresh tip, and recheck that **all** local outgoing commits are allowed, scanned
record commits. Recheck the branch and require a clean index and tracked working tree; staged or
tracked edits mean leave commits queued and report, without auto-stashing. Untracked files may
remain only if Git can preserve them. Then allow **one**
`git rebase "$remote_tip"` and retry the explicit push once, after checking the rewritten commits,
paths, safe subjects, and full record blobs again. Abort this rebase on conflict with
`git rebase --abort` and report; never resolve conflicts by dropping records or overwriting remote
work. Other errors, a second rejection, or non-record commits stop automatic retry. The queued-commit
recovery above uses this same one-rebase/one-retry budget.

If discovery, writing, scanning, synchronization, commit, or push fails, report whether each
pending file is uncommitted or committed but not pushed. Keep it for a later wrap-up retry; do not
claim it was published. Carry unresolved stops into the step-3 resume note and repeat them
prominently **immediately above the final clear line** in step 6, so they cannot be buried by the
rest of the command. Include the dropped-for-no-receipt count there too. No failure in steps 1–2
blocks the rest of `/wrap-up`.

## 3. Write a resume note for this project

Read the existing `RESUME-PROMPT.md` at the root of the current project in full before updating it.
Treat overwriting a handoff note as a merge, not a write. Carry every thread in the existing note
forward, or state explicitly in the new note that it was deliberately closed. Never drop a thread
silently. A second run in the same session updates the existing note with the work since the last
run. Do not append everything or rewrite from memory. If no note exists, create one.

Write the merged note to `RESUME-PROMPT.md` — a process
artifact, not a deliverable. If this project is a git repository, make sure the file is excluded
via `.git/info/exclude` (not `.gitignore` — that file stays reserved for the user's own concerns),
adding it there if it isn't already present.

The note should let a fresh session with no memory of this conversation pick up exactly where this
one left off. Cover, briefly:
- What's actually been decided and done, versus what's still open or in progress
- The single next concrete action, stated plainly
- Anything a fresh session would otherwise have to re-derive or re-litigate

Keep it tight — this is a working note for the next session, not a report for a reader.

## 4. Mark that findings were swept

Write `~/.claude/orchestrator-wrapup-sentinel.json` with a timestamp, e.g.
`{"wrapped_up_at": "<ISO-8601 timestamp>"}`. This is what lets the `SessionStart` hook confirm
`/wrap-up` actually ran before the next `/clear`, instead of assuming it did.

## 5. Run any handoff check the user's instructions require

If the user's own instructions (global or project `CLAUDE.md`) ask for a check of the handoff note at
wrap-up — a cold read, or a review by another agent or engine — run it now, against the note written
in step 3, fix what it finds, and say in one line what ran. If their instructions allow skipping it,
say "skipped" and why; never skip silently. If their instructions say nothing about it, skip this step.

## 6. Tell the user to clear

End your reply with exactly this, on its own line, so it's impossible to miss:

**Findings swept — run /clear now.**
