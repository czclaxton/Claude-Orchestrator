---
description: Deliberately reload context for this project - read the resume note, check git state, and summarize where things stand
---

Give the user a proper "catch me up" for this project, beyond whatever context the session-start
hook already injected automatically. Do the following:

1. If `RESUME-PROMPT.md` exists at the project root, read it in full.
2. Run `git status` (and `git log --oneline -10` if useful) in the current repo to see what's
   actually true right now — uncommitted changes, unpushed commits, current branch. Treat this as
   the source of truth over the resume note if they disagree; the note may be stale.
3. If the resume note references other directories as related working state (e.g. a companion
   repo), check their git status too.
4. Summarize concisely: what's done, what's still open, and the single next concrete action.
   Reconcile the resume note against what git actually shows — don't just restate the file.

If no resume note exists, say so plainly and ask the user what they'd like to work on, rather than
guessing.
