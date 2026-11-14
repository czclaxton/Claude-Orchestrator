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

## 2. File and recover pending records

Write any eligible record file using section 1, then run this step even if no new file was written.
Validate the format and receipts of earlier untracked timestamp-named records before filing them.
Do not adopt modifications to tracked records. Review the whole record for anonymization too:
a clean heuristic scan cannot prove it is safe or that its receipt supports the claim.

Run `node` with **the lesson-filing script path given in the session-start message**, quoted as
one argument. If that message has no path, find `scripts/file-lesson-records.js` with the fallback
glob `~/.claude/plugins/cache/claude-orchestrator/claude-orchestrator/*/scripts/file-lesson-records.js`.
Select the installed version matching this session; if it is absent or ambiguous, report that stop.
Do not use `${CLAUDE_PLUGIN_ROOT}` in this command file or reconstruct the filing procedure by hand.

The script reads `~/.claude/orchestrator-testing.md` itself, resolves the Notes repo and its
`records/.scan-terms`, recovers pending files and unpushed record commits, scans their contents,
fetches the actual default branch, and files only eligible records with fixed commit messages.
It checks every outgoing commit and scans the committed blobs before pushing. It permits one
fetch, rebase, and push retry after a rejection when only eligible record commits are outgoing.
It preserves unrelated staged and dirty work; those edits can prevent synchronization or retry.
Never stage, commit, rebase, or push Notes records by hand, and never override a script stop.

The private term list is `records/.scan-terms`, one client/project name per line; the user creates
it. Never invent, print, or publish its contents. If it is absent, the script reports
`term scan not run: no list` and the other secret, path, email, and UUID scans still run: relay that
line in the final summary and continue. Do not stop or ask the user for the list during wrap-up.
The script never prints a matched term or record text, only filenames and matching line numbers.
Relay its status lines verbatim, including missing-list notices and every unresolved stop.
Exit 0 means the reported operation succeeded; a nonzero exit means filing needs attention.

**On a hit in this session's own file, re-anonymize the flagged lines and rerun the script.**
Ask the user only about lines you believe are false positives; show filenames and line numbers,
never the matched private text. Resolve those lines safely and rerun; do not bypass the scanner.
For an earlier pending file, report the flagged lines for correction. A failed scan cannot be waived.
A blocked untracked record does not prevent other clean records from filing; a blocked committed
record prevents publishing the outgoing history containing it. Keep pending files for a later retry.

Report whether stopped work is uncommitted or committed but not pushed; never claim it was filed.
Keep unresolved stops in the wrap-up reply, **immediately above the final clear line** in step 6,
together with the dropped-for-no-safe-receipt count (including zero).
No failure in steps 1-2 blocks step 3 or later steps.

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
