---
description: One-time setup - create short command aliases for /wrap-up and /catch-up
---

Set up short command names for this plugin's `/claude-orchestrator:wrap-up` and
`/claude-orchestrator:catch-up` commands, so they can be invoked as `/wrap-up` and `/catch-up`
instead of typing the full plugin-qualified name every time.

For each of the two files below: **check whether it already exists first.** If it does, read it —
don't assume it's this plugin's relay file just because the name matches. If its content already
relays to the matching `/claude-orchestrator:` command, leave it alone and report it as already set
up. If it exists but is something else (the user's own unrelated command with that name), leave it
alone but report the naming conflict explicitly rather than claiming setup is done. If it doesn't
exist, create it with the Write tool (the normal way, so the user sees the usual write
confirmation).

`~/.claude/commands/wrap-up.md`:
```
---
description: alias for /claude-orchestrator:wrap-up
---
Run the /claude-orchestrator:wrap-up command now.
```

`~/.claude/commands/catch-up.md`:
```
---
description: alias for /claude-orchestrator:catch-up
---
Run the /claude-orchestrator:catch-up command now.
```

Report back concisely which files were created versus already present.
