---
description: Sweep session findings, write a resume note for this project, and prepare for /clear
---

Prepare this session to be cleared. Do the following, in order.

## 1. Check whether Claude Orchestrator testing mode is active

Check whether `~/.claude/orchestrator-testing.md` exists.

**If it exists:** its first non-empty line is the absolute path to `lessons.md` in the private
Claude-Orchestrator-Notes repo. **Note which branch that repo is on before you write anything** —
it decides how step 2 proceeds. Review this session for friction or successes specifically about
the **Claude Orchestrator plugin itself** (routing decisions, agent behavior, spec quality —
not the substance of whatever project you were actually working in). Apply the same promotion bar
already used in `lessons.md`: only log something that recurred, or was notable/severe enough to
justify logging alone. Don't log routine, uneventful use.

**Write your entries to a new file, not to `lessons.md`.** Create
`pending-lessons/<YYYYMMDD-HHMMSS>-<short-kebab-slug-from-the-entry-heading>.md` alongside
`lessons.md` in that repo, holding this session's entries in the same format `lessons.md` uses.
Create the `pending-lessons/` directory if it does not exist.

A separate file per sweep is the whole point. Every sweep used to append to the tail of one shared
file, so every open PR conflicted with the last and none of them ever merged — fourteen of them, at
one point, none merged in three weeks. Distinct files never collide, so these merge in any order.
A later review session folds the pending entries into `lessons.md` with a status on each and
deletes them; that collection step is where the reading happens, and the directory being non-empty
is what says it is due.

Two rules for the entries themselves, non-negotiable:
- **Describe the orchestrator's behavior only, project-agnostically.** Never quote actual project
  code, file paths, identifiers, or business logic from the project you were working in — that's
  the real leak-prevention mechanism, not where the file happens to live.
- Mark each entry **verified** (you re-ran or re-checked the thing) or **asserted** (you're
  reporting an impression without re-checking) — this is the load-bearing field, more important
  than which project it came from.

**If it doesn't exist:** skip this step entirely. Testing mode is off; there's nothing to sweep.

## 2. Open a PR for the pending-lessons file, if you wrote one

Only do this if step 1 actually wrote a fragment — skip entirely if testing mode was off or nothing
cleared the promotion bar.

**A new file cannot conflict with anything, so there is no dirty-tree check here.** The file you are
committing did not exist a moment ago: no other session has edited it, no other branch touches it,
and staging it by path cannot pick up anything else. Other dirty or untracked files in that repo are
irrelevant and never a reason to abort.

**If the repo is not on its default branch:** don't create a branch or open a PR. Leave the fragment
in place and tell the user plainly that an unexpected branch stopped you — only a human can say
where that work belongs.

**Otherwise:** in the Claude-Orchestrator-Notes repo (not this one), note its current branch first
so you can switch back at the end. Then:

1. Create a new branch off its default branch, named `lessons/<same-timestamp-and-slug-as-the-file>`.
2. Stage and commit **only the one file you wrote** — never `git add -A`, and never touch
   `lessons.md`. Write a plain commit message describing what was logged.
3. Push the branch and open a PR against the repo's default branch (`gh pr create`). **Write the PR
   body using the `pr-format` skill** — use its lessons-entry variant. That skill is the only
   definition of this project's PR format; do not restate or summarize it here.
4. Switch back to whatever branch the repo was on before step 1.

**Do not merge this PR now.** Merging a fragment PR is filing, not judgment — it moves the file onto
the default branch, still pending, still unread. The judgment happens at a review session, over the
`pending-lessons/` directory.

If branch creation, commit, push, or PR creation fails for any reason, report it plainly and move
on — don't let it block the rest of this command.

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

## 5. Tell the user to clear

End your reply with exactly this, on its own line, so it's impossible to miss:

**Findings swept — run /clear now.**
