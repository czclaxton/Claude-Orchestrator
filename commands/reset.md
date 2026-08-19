---
description: Sweep session findings, write a resume note for this project, and prepare for /clear
---

Prepare this session to be cleared. Do the following, in order.

## 1. Check whether Claude Orchestrator testing mode is active

Check whether `~/.claude/orchestrator-testing.md` exists.

**If it exists:** its first non-empty line is the absolute path to `lessons.md` in the private
Claude-Orchestrator-Notes repo. Review this session for friction or successes specifically about
the **Claude Orchestrator plugin itself** (routing decisions, agent behavior, spec quality —
not the substance of whatever project you were actually working in). Apply the same promotion bar
already used in that file: only log something that recurred, or was notable/severe enough to
justify logging alone. Don't log routine, uneventful use.

For anything that clears that bar, append an entry to that `lessons.md` file, following its
existing format. Two rules, non-negotiable:
- **Describe the orchestrator's behavior only, project-agnostically.** Never quote actual project
  code, file paths, identifiers, or business logic from the project you were working in — that's
  the real leak-prevention mechanism, not where the file happens to live.
- Mark each entry **verified** (you re-ran or re-checked the thing) or **asserted** (you're
  reporting an impression without re-checking) — this is the load-bearing field, more important
  than which project it came from.

**If it doesn't exist:** skip this step entirely. Testing mode is off; there's nothing to sweep.

## 2. Write a resume note for this project

Write (overwrite, don't append) `RESUME-PROMPT.md` at the root of the current project — a process
artifact, not a deliverable. If this project is a git repository, make sure the file is excluded
via `.git/info/exclude` (not `.gitignore` — that file stays reserved for the user's own concerns),
adding it there if it isn't already present.

The note should let a fresh session with no memory of this conversation pick up exactly where this
one left off. Cover, briefly:
- What's actually been decided and done, versus what's still open or in progress
- The single next concrete action, stated plainly
- Anything a fresh session would otherwise have to re-derive or re-litigate

Keep it tight — this is a working note for the next session, not a report for a reader.

## 3. Mark that findings were swept

Write `~/.claude/orchestrator-reset-sentinel.json` with a timestamp, e.g.
`{"reset_at": "<ISO-8601 timestamp>"}`. This is what lets the `SessionStart` hook confirm `/reset`
actually ran before the next `/clear`, instead of assuming it did.

## 4. Tell the user to clear

End your reply with exactly this, on its own line, so it's impossible to miss:

**Findings swept — run /clear now.**
