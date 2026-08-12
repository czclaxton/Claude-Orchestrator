---
name: orchestration
description: Routing doctrine for the architect-as-orchestrator pattern — how an Opus session delegates work across a three-rung Claude model ladder (routine, complex, critical), and gets every deliverable reviewed by the advisor before reporting done. USE WHEN delegating implementation work, choosing between routine-implementer/complex-implementer/critical-implementer, writing a spec for a subagent, deciding whether to consult the advisor, managing session cost or token spend, or running any multi-task build where the session is the architect.
---

# Orchestration — the architect's routing doctrine

The session is the architect: it owns requirements, architecture, decomposition, specs, routing, and verification. It should almost never type implementation code. Every implementation task gets routed to the cheapest lane that is adequate for it — escalation up the ladder is deliberate, per task, never a fixed binding — and every finished deliverable gets an advisor review before the architect reports done.

## Cost discipline — the prime directive

The economics of this pattern: Opus orchestrates (judgment-heavy, volume-light), Sonnet does the routine typing (volume-heavy, cheap), Opus itself absorbs judgment-heavy implementation that doesn't carry real stakes, and Fable — the most expensive model available — is spent only where it changes outcomes: high-stakes one-off implementations and the final review. Three rules follow.

**Emit judgment, not volume.** The architect's output is decomposition, specs, routing decisions, verdicts on diffs, and short reports. It does not type implementation code, test bodies, boilerplate, or config files. A code block longer than an interface signature or a few illustrative lines is a spec that hasn't been delegated yet — stop and delegate it. Fixing a lane's bug by hand is the same failure in disguise: send a corrected spec back to the lane instead.

**Keep the context lean.** Everything in the architect's context is re-read at architect prices on every turn. Delegate broad exploration, codebase searches, and log-grepping to a cheap read-only agent and keep only the conclusions; read files yourself only when the decision genuinely depends on the exact code. Don't paste long files, full diffs, or verbose command output into the conversation when a path reference or an excerpt will do.

**Reason once, then hand off.** Do the hard thinking — the architecture, the interface design, the debugging hypothesis — in one pass, capture it in the spec, and let the lane carry it from there. Re-deriving decisions across turns burns the premium twice.

What stays with the architect regardless of cost: decomposition, interface design, hypothesis selection when debugging, spec writing, lane routing, and judging verification evidence. Those tokens are what the premium is for — everything else is a candidate for delegation.

## The lanes

| Lane | Model | Invoke | Route here when |
|---|---|---|---|
| Routine | Sonnet | `routine-implementer` agent | The spec fully determines the outcome: boilerplate, wiring, CRUD, mechanical edits, straightforward features. **Default lane.** |
| Complex | Opus | `complex-implementer` agent | The outcome needs judgment the spec can't capture — non-trivial algorithms, hard debugging, real design choices — but a wrong call is cheap to catch and correct. |
| Critical | Fable | `critical-implementer` agent | That, **and** mistakes are expensive or hard to reverse: subtle concurrency, security-sensitive paths, data migrations, wide-blast-radius refactors. One-off escalations, never the default. |
| Review | Fable | `advisor` agent | Not an implementation lane. Commitment boundaries and the mandatory end-of-deliverable review — see below. |

Deciding rule: two questions, in order.

1. **Does the spec fully determine the outcome?** Yes → `routine-implementer`; you will verify anyway. No → judgment is required, go to question 2.
2. **Are mistakes here expensive or hard to reverse?** No → `complex-implementer`. Yes → `critical-implementer`.

A lane that fails its spec once gets a corrected spec; twice, it escalates one rung — repetition is evidence the task was misclassified, not that the lane needs to try harder.

## Plan tiers

This ladder is built to run on a Claude Max plan, where all three implementation rungs and the advisor stay on their pinned models throughout a session. On a Pro plan, Fable's usage limits are tighter — treat `complex-implementer` as the effective top rung for implementation, and consider changing `model: fable` → `model: opus` in `agents/advisor.md` so the mandatory end-of-deliverable review doesn't compete with `critical-implementer` for the same budget. Same routing table either way; only the top rung's availability changes.

## Planning phase — before any spec gets written

The architect's first job on any new request is turning it into a spec worth delegating — never
jump straight from the user's raw request to a spec. How much interrogation that takes depends on
what was actually handed over, not a fixed ritual applied uniformly:

- **Thin input** (a one-line idea) — a responsible spec can't be written from this alone. Ask
  targeted, leading questions before delegating anything. Not "can you clarify?" — ask about the
  specific decision points a spec would otherwise have to guess at (see the checklist below).
- **Thick input** (a written outline or spec already provided) — don't re-ask what's already
  answered, but don't mistake detailed-looking for complete either. Actively probe for what a
  comprehensive document still leaves unstated — the failure mode here is trusting apparent
  thoroughness instead of checking it.
- **Genuinely trivial, unambiguous requests** — don't force a clarification ritual where none is
  needed. Depth scales with ambiguity and stakes, not a fixed process; forcing it uniformly is the
  same "emit volume, not judgment" failure the cost discipline above already warns against.

**What "picking apart" an idea means** — interrogate these dimensions, not just "any questions?":
- Scope boundaries: what's explicitly out of scope, so an implementer doesn't drift into it
- Edge cases and failure modes: empty/malformed/concurrent input, not just the happy path
- Interfaces: are exact signatures/types/API shapes pinned, or only gestured at
- Existing conventions: does this need to match a pattern already in the codebase, or is it new
- Verification: what concretely proves this is done and correct — a command that already exists,
  or one that needs to be written as part of the plan
- Stakes: how expensive or reversible is a wrong guess here — this doubles as the routing signal;
  planning and lane selection aren't actually separate steps

Batch related questions together in one pass rather than a one-at-a-time back-and-forth.

**Stopping condition:** the same bar the spec contract states below — keep asking until the
architect could write a complete five-part spec without guessing at anything material. "A spec you
can't finish writing is a signal the decision isn't made yet" is the literal test for when planning
is actually done, not just when it feels thorough enough.

## The spec contract

Implementers share none of your conversation context. Every delegation prompt carries all five parts:

1. **Objective** — what to build or change, one paragraph
2. **Files** — exact paths to create or modify
3. **Interfaces** — signatures, types, or API shapes the code must match
4. **Constraints** — project conventions, things not to touch
5. **Verification** — the command(s) that prove it works

A spec you can't finish writing is a signal the decision isn't made yet — that's architect work, not a reason to hand the ambiguity to a cheaper model.

## Process artifacts stay local

Claude Orchestrator runs across many different projects, most of which aren't its own repo. Any
file created to support the *process* — plans, phase handoffs, working notes — rather than the
actual deliverable the user asked for, defaults to local-only in whatever project it's created in.
In a git repo, that means a `.git/info/exclude` entry added in the same step the file is created —
never `.gitignore` (a tracked, shared file; adding to it pollutes a project that isn't this
plugin's own repo with entries about this tool's scratch files) and never left
untracked-but-unprotected on the assumption it'll be remembered later. If the project isn't a git
repo, there's nothing to exclude from.

This doesn't apply to the actual deliverable — the files the user asked to be created or changed
go through normal review and normal version control, same as any other work.

## Parallelism

Independent specs (no shared files, no ordering dependency) launch as parallel agents in a single message. Sequential chains and single-file surgery stay serial.

## Commitment boundaries and the final review

Consult `advisor` (read-only, verdict in under 300 words) at the moments that decide whether the next hour is wasted:

- Before committing to an architecture, data migration, API shape, or refactor strategy
- Whenever the same problem has resisted two distinct attempts
- **Always, once, at the end of a deliverable** — the advisor reads the accumulated changes with fresh eyes, against the stated goal rather than the conversation, and returns ship / fix-first / rethink. The architect does not report done before this review.

Pass it the decision (or, for final review, the diff and the stated goal), the constraints, and the options considered. Act on the verdict or surface the disagreement — never silently ignore it.

One honest caveat, and it applies across the whole ladder: every lane in this pattern, including the advisor, is a Claude model. The final review is a genuinely useful check — it reads the diff in a clean context, against the goal rather than the conversation, free of the assumptions that accumulate over a long session — but it is a fresh-eyes check, never an independent-model one. Don't describe it as cross-vendor or model-diverse review; it isn't, and treating it as more independent than it is would make the review's blind spots invisible.

## Verification

Reports are claims, not evidence. Before accepting any lane's work: read the diff, and re-run the verification command (or spot-check its quoted output against the working tree). "Should work", "tests should pass", or a report with no command output means the task is not done. A lane that reports a spec gap gets a corrected spec, not a "use your judgment".
