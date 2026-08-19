---
description: Turn Claude Orchestrator testing mode on, off, or check its status
argument-hint: on [path-to-lessons.md] | off | status
---

Manage Claude Orchestrator testing mode. The argument given was: "$ARGUMENTS"

Testing mode is controlled entirely by whether `~/.claude/orchestrator-testing.md` exists. When it
exists, its first non-empty line is the absolute path to the `lessons.md` file that
`/claude-orchestrator:wrap-up` appends findings to.

Parse the argument as one of `on`, `off`, or `status` (default to `status` if empty or
unrecognized):

- **`on`**: First check whether `~/.claude/orchestrator-testing.md` already exists — if so, report
  it's already on and show what path it's currently pointing to; don't touch it. If a path was also
  given in the argument and it differs from the current one, say plainly that it was **not**
  applied, and that changing it requires `off` then `on <new-path>`. If the file doesn't exist: if a
  path was given after `on` in the argument, use that. Otherwise, ask the user for the absolute path
  to their lessons.md file — **don't guess or invent one**. Once you have a path, create the file
  with that single line using the Write tool.
- **`off`**: If `~/.claude/orchestrator-testing.md` exists, delete it and confirm. If it doesn't
  exist, report it's already off — don't treat this as an error.
- **`status`**: Report whether the file exists and, if so, what path it currently points to.
