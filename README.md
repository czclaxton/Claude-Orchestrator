# Claude Orchestrator

**Opus runs the show. Cheaper typing where it's safe, escalation where it matters, and an advisor review before anything ships.**

> Unofficial personal tool. Not affiliated with or endorsed by Anthropic. "Claude", "Opus", "Sonnet", and "Fable" are Anthropic's model names, used here only to describe which model each lane runs on.

Claude Code lets every subagent run on a different model — and lets the session itself run on a different model than its subagents. This plugin exploits that with the **architect pattern**: your session runs on **Opus**, acting as a full-time architect. It owns requirements, decomposition, specs, and verification — routes every implementation task to the cheapest lane adequate for it — and gets an **advisor** review of the finished work before calling anything done:

| Lane | Model | Invocation | Route here when |
|---|---|---|---|
| Routine | **Sonnet** | `routine-implementer` agent (default) | The spec fully determines the outcome — boilerplate, wiring, CRUD, mechanical edits |
| Complex | **Opus** | `complex-implementer` agent | Judgment the spec can't capture decides the outcome, but a wrong call is cheap to catch: non-trivial algorithms, hard debugging, real design choices |
| Critical | **Fable** | `critical-implementer` agent | That, **and** mistakes are expensive or hard to reverse: subtle concurrency, security-sensitive paths, data migrations, wide-blast-radius refactors |
| Review | **Fable** | `advisor` agent | Commitment boundaries, and **always once at the end** — the advisor reviews the accumulated changes before the architect reports done |

Tokens route by stakes: Opus emits judgment and specs, Sonnet emits the bulk of the mechanical code, Opus itself absorbs judgment calls that don't carry real risk, and Fable — the most expensive model available — is spent only where it changes outcomes: the highest-stakes implementations and the final review.

The plugin ships the **orchestration skill** — the routing doctrine that teaches the session when to use each lane, the cost discipline that keeps expensive-model token volume minimal (emit judgment not volume, keep context lean, reason once then hand off), the five-part spec contract that makes context-free delegation safe, and the verification rules that keep every lane honest.

## Install

```
claude plugin marketplace add czclaxton/Claude-Orchestrator
claude plugin install claude-orchestrator@claude-orchestrator
```

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

- **Claude Code** with a subscription that includes Fable (Pro, Max, Team, or Enterprise — all current consumer plans qualify for API access; see "Running on Pro" below for the cost tradeoff, which is real, not just a usage-limit nuance).
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

Two commands for the two moments that bookend a working session. **Type the full plugin-qualified
name** — `/claude-orchestrator:wrap-up` and `/claude-orchestrator:catch-up`. Plugin commands don't
have a bare-name shortcut in Claude Code; typing just `/wrap-up` returns "Unknown command." (These
also aren't named `/reset` / `/resume` — both of those are reserved elsewhere in Claude Code and
silently fail to reach a plugin command at all, in a much more confusing way than a clean "Unknown
command" — so don't rename these back.)

- **`/claude-orchestrator:wrap-up`** — run this right before you `/clear`. It overwrites a local
  `RESUME-PROMPT.md` at the project root so a fresh session can pick up where you left off, and —
  only if testing mode is on (see below) — sweeps any friction/findings about the plugin itself
  into your personal notes file. It ends with an explicit "run `/clear` now."
- **`/claude-orchestrator:catch-up`** — a deliberate, deeper "catch me up" for the current project:
  reads `RESUME-PROMPT.md` if present, checks real git state, and reconciles the two before
  summarizing what's open and what's next. Use it when you want more than the automatic reminder
  below gives you.

A `SessionStart` hook backs `/wrap-up` up automatically: every session start checks whether the
previous one was cleared without running `/wrap-up` first, and if so, flags it right away — a
nudge, not a hard guarantee. This is a deliberate, known tradeoff: **nothing can intercept `/clear`
before it happens** (verified against the current Claude Code hook system, not assumed), so
`/wrap-up` is the one manual habit this plugin actually asks of you. There's no way to make it
fully automatic.

**Turning on testing mode** (opt-in, off by default): create `~/.claude/orchestrator-testing.md`
containing one line — the absolute path to any markdown file where you want plugin friction/notes
appended as you use it (a personal log, a project journal, whatever you already use for this).
Delete the file to turn it off.

## Commitment boundaries and the final review

Even the architect gets a second opinion. The `advisor` agent is a read-only skeptic — consulted before architecture decisions, migrations, API designs, whenever a problem has resisted two attempts, and **always once at the end of a deliverable**, where it reads the accumulated diff with fresh eyes, against the stated goal rather than the conversation, and returns ship / fix-first / rethink. It never implements. One honest limit: every lane here is a Claude model, so this is a fresh-context check, not an independent-model one — it catches assumptions the session accumulated, not blind spots the whole family shares.

## Running on Pro

The routing table above is built for a Max plan, where Fable is included as part of the plan (usable for up to 50% of your weekly limit) and comfortably absorbs both `critical-implementer` escalations and the mandatory end-of-deliverable review in the same session. **On Pro, Fable isn't included in the subscription at all — it runs on pay-as-you-go usage credits, billed on top of your $20.** Since two of the four lanes in this pattern are Fable, and the `advisor` review is mandatory on every single deliverable, that's a real per-task charge, not just a tighter limit. Two adjustments make the same plugin work well on Pro without incurring it:

1. Treat `complex-implementer` (Opus) as the effective top implementation rung — reserve `critical-implementer` for the rare task that's genuinely both judgment-heavy and high-stakes.
2. In `agents/advisor.md`, change `model: fable` to `model: opus` so the mandatory final review doesn't compete with `critical-implementer` for the same limits.

No structural changes needed — just the two pins above and a bias toward the Opus rung.

## FAQ

**Does this work on claude.ai?** No — subagent model routing is Claude Code only (CLI, desktop, VS Code, web).

**Why not just run everything on Fable?** You can. It's excellent. It's also the most expensive lane per token, and most of a session's tokens are orchestration and implementation mechanics that Sonnet and Opus handle at near-parity for far less. Spend the premium where it changes outcomes: genuinely high-stakes tasks and the final review.

## License

MIT
