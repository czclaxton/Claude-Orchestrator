---
description: Deliberately reload context for this project - read the resume note, check git state, and summarize where things stand
---

Give the user a proper "catch me up" for this project, beyond whatever context the session-start
hook already injected automatically. Do the following:

1. If `RESUME-PROMPT.md` exists at the project root, read it in full.
2. Establish what's actually true right now from git — but keep two kinds of state separate,
   because they do not have the same source of truth.

   **Local state** — working tree, staged changes, current branch, what commits exist locally.
   `git status` and `git log --oneline -10` are authoritative here. Treat this as the source of
   truth over the resume note if they disagree; the note may be stale.

   **Remote state** — what a branch on the server contains *right now*. `git status` is not
   authoritative here, and neither is `git fetch`. The `up to date with origin/X` line is read from
   local remote-tracking refs, which may be stale by seconds or by days, and a `fetch` that prints
   nothing is indistinguishable from a `fetch` that had nothing to return. Ask the server directly:

   ```
   git ls-remote origin refs/heads/<branch>
   ```

   and compare that hash against `git rev-parse <branch>`.

   **Scope the query to match the claim.** `refs/heads/<branch>` answers about *that branch only*
   and is silent about every other ref — and a filtered query that returns exactly what you asked
   for is indistinguishable from a complete picture, which is the same trap as the empty `fetch`.
   Any repo-wide claim ("nothing new has been pushed", "no new branches", "no one has opened
   anything") requires the unscoped form:

   ```
   git ls-remote --heads origin
   ```

   Two reporting rules follow from this, and they matter more than remembering to run the command:

   - Never repeat `git status`'s `up to date with origin/X` as if it were a statement about the
     remote. If you have not run `git ls-remote`, you do not know, and saying nothing is correct.
   - A *negative* claim about a remote — "nothing new has been pushed", "that branch hasn't moved",
     "no one else has touched it" — requires server evidence before you make it. Negatives are the
     dangerous direction: a stale positive prompts someone to go look, a stale negative stops the
     investigation entirely. This is worst at session start, which is exactly when this command
     runs and when a collaborator's push is most likely to have just landed.
3. If the resume note references other directories as related working state (e.g. a companion
   repo), check them too — same split as step 2: `git status` for their local state, `git ls-remote`
   before asserting anything about what their remotes contain.
4. Summarize concisely: what's done, what's still open, and the single next concrete action.
   Reconcile the resume note against what git actually shows — don't just restate the file. Where a
   claim rests on server state, say so; where you checked only locally, don't dress it up as more.

If no resume note exists, say so plainly and ask the user what they'd like to work on, rather than
guessing.
