# Claude Orchestrator

**Opus runs the show. Cheaper typing where it's safe, escalation where it matters, and an advisor review before anything ships.**

> Unofficial personal tool. Not affiliated with or endorsed by Anthropic. "Claude", "Opus", "Sonnet", and "Fable" are Anthropic's model names, used here only to describe which model each lane runs on.

Claude Code lets every subagent run on a different model — and lets the session itself run on a different model than its subagents. This plugin exploits that with the **architect pattern**: your session runs on **Opus**, acting as a full-time architect. It owns requirements, decomposition, specs, and verification — routes every implementation task to the cheapest lane adequate for it — and gets an **advisor** review of the finished work before calling anything done:

| Lane | Model | Invocation | Route here when |
|---|---|---|---|
| Routine | **Sonnet** | `routine-implementer` agent (default) | The spec fully determines the outcome — boilerplate, wiring, CRUD, mechanical edits |
| Complex | **Opus** | `complex-implementer` agent | Judgment the spec can't capture decides the outcome, but a wrong call is cheap to catch: non-trivial algorithms, hard debugging, real design choices |
| Critical | **Fable** | `critical-implementer` agent | That, **and** mistakes are expensive or hard to reverse: subtle concurrency, security-sensitive paths, data migrations, wide-blast-radius refactors |
| Review | **Opus** | `advisor` agent | Commitment boundaries, and **always once at the end** — the advisor reviews the accumulated changes before the architect reports done. Raise this pin to Fable if your plan includes it |

Tokens route by stakes: Opus emits judgment and specs, Sonnet emits the bulk of the mechanical code, Opus itself absorbs judgment calls that don't carry real risk, and Fable — the most expensive model available — is spent only where it changes outcomes: the highest-stakes implementations. The final review defaults to Opus so the pattern costs nothing extra on any plan; raise it to Fable if yours includes it.

The plugin ships the **orchestration skill** — the routing doctrine that teaches the session when to use each lane, the cost discipline that keeps expensive-model token volume minimal (emit judgment not volume, keep context lean, reason once then hand off), the five-part spec contract that makes context-free delegation safe, and the verification rules that keep every lane honest.

## Install

```
claude plugin marketplace add czclaxton/Claude-Orchestrator
claude plugin install claude-orchestrator@claude-orchestrator
```

Then, in a Claude Code session, set up short command names (one-time):

```
/claude-orchestrator:setup
```

This creates two small relay files in `~/.claude/commands/` so `/wrap-up` and `/catch-up` work
directly instead of needing the full `/claude-orchestrator:` prefix. Safe to re-run — it never
overwrites a file you've customized yourself.

Updating an existing installation to the latest release:

```
claude plugin marketplace update claude-orchestrator
claude plugin update claude-orchestrator@claude-orchestrator
```

Then start your session as the architect:

```
/model opus
```

## Requirements

- **Claude Code** with any current consumer subscription (Pro, Max, Team, or Enterprise). Out of the box every lane runs on a model your plan includes — only `critical-implementer` is pinned to Fable, and it is a deliberate one-off escalation, not a lane you land in by default. See "Running on Max" below for how to spend a bigger plan.
- Heads-up: if a pinned Claude model isn't available on your account, Claude Code silently falls back to your session model — the pattern degrades quietly rather than erroring. If results feel unremarkable, check your plan and the pins in `agents/*.md`.
- Heads-up, separately: a global `"model": "opusplan"` setting in `~/.claude/settings.json` (Opus while planning, Sonnet during execution) silently demotes the architect to Sonnet the moment it starts delegating — the exact opposite of what this pattern assumes. Use a plain `"model": "opus"` instead if you're running this plugin.

Model resolution order in Claude Code: `CLAUDE_CODE_SUBAGENT_MODEL` env var → per-invocation `model` parameter → agent frontmatter → session model.

**Local artifacts:** this plugin runs across many different projects, most of which aren't its own repo. Any file it creates to support the process itself (plans, phase notes) rather than the deliverable you asked for defaults to local-only via `.git/info/exclude` — never committed, never added to your project's own `.gitignore`. The actual deliverable files go through normal review and version control like anything else.

## Use it

With the session on Opus, just ask for work — the orchestration skill routes it:

```
Add rate limiting to our public API. Design it, delegate the
implementation, and verify the evidence before you call it done.
```

The architect writes the spec, picks the lane (rate limiting touches concurrency — a good case for `critical-implementer`, or `complex-implementer` if the blast radius is contained), reads the diff and verification evidence when the report comes back, sends the finished work to `advisor` for the final review, and only then reports done.

To make the doctrine always-on, add one line to your project's `CLAUDE.md`:

```
You are the architect — minimize your own token volume. Delegate all
implementation through the orchestration skill's routing table (never
type code yourself), delegate broad codebase exploration to cheap
read-only agents, verify evidence before accepting any lane's report,
and get an advisor review before reporting any deliverable done.
```

## Starting and ending a session: /wrap-up and /catch-up

(These short names come from the one-time `/claude-orchestrator:setup` step in Install, above.)

- **`/wrap-up`** — run before `/clear`. Writes a local `RESUME-PROMPT.md` so a fresh session can
  pick up where you left off, sweeps plugin friction/findings into your notes if testing mode is
  on (below), and ends by telling you to `/clear`.
- **`/catch-up`** — a deliberate "catch me up" for the current project: reads `RESUME-PROMPT.md`,
  checks real git state, and summarizes what's open and what's next.

A `SessionStart` hook backs `/wrap-up` up automatically: if the previous session was cleared
without running it, the next session opens with a reminder — a nudge, not a guarantee, since
nothing can intercept `/clear` before it happens. `/wrap-up` is the one manual habit this plugin
asks of you.

**Testing mode** (opt-in, off by default): `/claude-orchestrator:testing-mode on`, `off`, or
`status`. This just manages a one-line file at `~/.claude/orchestrator-testing.md` — the absolute
path to a markdown file where you want plugin friction/notes logged as you use it — so you can also
create or delete that file by hand if you prefer.

## Commitment boundaries and the final review

Even the architect gets a second opinion. The `advisor` agent is a read-only skeptic — consulted before architecture decisions, migrations, API designs, whenever a problem has resisted two attempts, and **always once at the end of a deliverable**, where it reads the accumulated diff with fresh eyes, against the stated goal rather than the conversation, and returns ship / fix-first / rethink. It never implements. One honest limit: every lane here is a Claude model, so this is a fresh-context check, not an independent-model one — it catches assumptions the session accumulated, not blind spots the whole family shares.

## Running on Max

The defaults are built so that **every lane you land in by default runs on a model your plan already includes.** The `advisor` review is mandatory on every deliverable, so pinning it to Fable would have meant a per-task charge on Pro, where Fable isn't part of the subscription and runs on pay-as-you-go credits billed on top. It defaults to Opus instead.

`critical-implementer` is still pinned to Fable, and that is deliberate: it is a one-off escalation for tasks that are both judgment-heavy and expensive to get wrong, not a lane the router lands in on its own. On Pro it will bill when you use it. Reserve it, or route those tasks to `complex-implementer` instead.

**If your plan includes Fable** (Max includes it for up to 50% of your weekly limit), you are leaving capability on the table with the default advisor pin. Raise it:

```
model: fable
```

in `agents/advisor.md`, and let `critical-implementer` escalate freely.

**One rough edge, stated plainly:** the copy of `agents/advisor.md` your sessions actually load lives in the plugin cache under `~/.claude/plugins/cache/`, and `claude plugin update` replaces that directory. An edit there survives until your next update and then silently reverts. There is no clean per-project override documented for plugin-shipped agents yet — if you want the change to stick, fork this repo and add your fork as the marketplace.

## FAQ

**Does this work on claude.ai?** No — subagent model routing is Claude Code only (CLI, desktop, VS Code, web).

**Why not just run everything on Fable?** You can. It's excellent. It's also the most expensive lane per token, and most of a session's tokens are orchestration and implementation mechanics that Sonnet and Opus handle at near-parity for far less. Spend the premium where it changes outcomes: genuinely high-stakes tasks and the final review.

## License

MIT
