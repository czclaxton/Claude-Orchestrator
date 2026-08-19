# Adding a new slash command

Checklist for adding a command to `commands/`, based on real problems hit while building
`/wrap-up` and `/catch-up` (originally `/reset` and `/resume` — both silently broken).

## 1. Don't assume a name is safe — test it

Some words are reserved by Claude Code itself and silently swallow a plugin command instead of
reaching it (`/reset` triggered a context clear; `/resume` returned "isn't available"). Before
committing to a name, test the bare word in a scripted headless session:

```
echo '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"/your-name"}]}}' | \
  claude -p --input-format=stream-json --output-format=stream-json --verbose
```

Run this from a throwaway scratch directory, not a real project — if the name does dispatch to a
real command, you don't want it writing files somewhere that matters. Check the output for
`tool_use` events (real command executing) versus a `result` with no turns, an "Unknown command"
message, or an unexpected `conversation_reset` event (name is reserved or unrecognized).

## 2. There's no bare-name shortcut for plugin commands

Even a collision-free name still needs the full prefix: `/claude-orchestrator:your-name`. Typing
just `/your-name` returns "Unknown command" — this isn't specific to any particular name, it's how
Claude Code namespaces every plugin-sourced command. Don't write docs that promise otherwise.

If a shorter typed form matters, that's a personal, per-machine setup — not something the plugin
can ship automatically (plugin installs can't write into a user's personal command directory).
Point users at the one-line alias pattern instead: `~/.claude/commands/your-name.md` containing
just a `description` and the single line `Run the /claude-orchestrator:your-name command now.`

## 3. Bump the plugin version, every time

`claude plugin update` skips re-syncing a plugin's files if `plugin.json`'s `version` field didn't
change — even if the source was pushed and the marketplace was updated. A content-only change with
no version bump silently stays stale in the local cache. Bump the patch version on every change
that should actually take effect, then run both:

```
claude plugin marketplace update claude-orchestrator
claude plugin update claude-orchestrator@claude-orchestrator
```

Verify the fix actually landed in the cache (`~/.claude/plugins/cache/claude-orchestrator/claude-orchestrator/<version>/...`)
before trusting it's live — the update command reporting success doesn't confirm content changed.
