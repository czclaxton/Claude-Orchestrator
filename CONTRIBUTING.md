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

## 4. Before you bump: review the open lessons.md PRs

When testing mode is on, `/claude-orchestrator:wrap-up` opens a small PR in Claude-Orchestrator-Notes
for each finding it logs, rather than pushing straight to that repo's default branch — deliberately
not gated on the user's approval (it's a private, single-reader file, and gating every entry behind a
merge click would just reintroduce the friction that made findings get skipped before). Instead,
each plugin version bump is the trigger to go review whatever's piled up:

- Read each open PR's diff. Decide if it's just a logged observation (merge as-is, no other action)
  or if it points at something actionable — a real doc that should change (this file, the README, an
  agent definition), a bug worth fixing, a design assumption worth revisiting. Not every entry
  produces a follow-up; most won't.
- Merge (or close, if an entry turns out to be a duplicate or a dead end) each PR you've reviewed.
  Don't let them pile up past this checkpoint.

## 5. The human is a component of this system, not a gate on it

The user is not just the approver — he is the only signal in this loop that no model here can produce.
Three reasons, all evidenced rather than assumed:

- Every lane, including the advisor, is a Claude model. The advisor is a fresh-eyes check, never an
  independent one. Published work on self-preference bias is about a model reviewing *its own*
  generations, which the Opus-writes/Fable-reviews split does avoid — but same-family review is not
  independence, and the case this project actually occupies is not addressed in the literature at all.
- Twice now the advisor has reasoned correctly inside constraints that were never actually binding.
  Only the human can say a premise is not real. That failure is invisible from inside the system.
- Measured results on trained code critics put **human + critic** ahead of critic alone: critics catch
  real bugs *and* hallucinate plausible ones, and the human is what separates the two.

He is also a *user* of the plugin, not only its author — so his friction is product evidence, not just
a preference. Treat his reasoning as a first-class input to be captured, not an approval to be
collected. See `research-self-review-designs.md` in the notes repo for sources.

## 6. PR triage: two buckets, and nothing is closed without him

**Every PR that exists gets his decision.** There is no auto-close bucket, deliberately. An earlier
draft of this section had one, restricted to objective failure — and it was removed, because any
filter standing between a change and the human is a filter on the one input the human is here to
provide, and the failure mode is silent by construction.

The problem auto-close appeared to solve does not need solving at the PR layer: **a PR is only opened
once its claim has survived the replay and the advisor pass.** If the replay disproves the fix's own
stated claim, it gets fixed or abandoned *before* becoming a PR. A known-broken change should never
reach him in the first place, closed or otherwise.

Abandoned attempts still get named at the next `/wrap-up` — a one-line note on what was tried and why
it was dropped. Not for approval; so that work disappearing before the PR layer stays visible.

Every PR is therefore one of two buckets, decided before it is opened:

**`[decide]` — debatable.** The test is whether a reasonable person could choose differently: a real
tradeoff, an unresolved advisor disagreement, a choice that forecloses a future option, or a change
resting on an assumption about what he wants.

**`[skim]` — a slam dunk.** There is a clearly correct answer, it is implemented, and the evidence is
attached. Still his call; the process is simple, not absent.

**The test is debatability, not blast radius.** Every edit to a command file changes behavior for
everyone who installs the plugin — if that alone qualified, every PR would be `[decide]` and the
distinction would carry no information. A verified correctness fix with no live tradeoff is a `[skim]`
however important the file. (Found by applying this section to the open PRs immediately after writing
it; the first draft's criterion collapsed on contact.)

Prefix the PR title with the bucket so it is visible in the list view without opening anything.

## 7. PR format: skimmable by default, nuanced on demand

Most reviews are a skim and a verdict. Write for that, and let the depth be there for the times it
is not.

1. **TL;DR** — three lines maximum, at the very top: what changed, why, and what breaks if it is
   wrong. No preamble above it.
2. **Decision** — one line stating exactly what approving means.
3. **Details** — the nuanced breakdown, inside a collapsed `<details>` block so it never competes
   with the TL;DR. Mechanism, evidence, replay output, advisor verdict, tradeoffs considered.

If the TL;DR cannot be written in three lines, the PR is doing too much and should be split.

## 8. Capture the reasoning, not just the verdict

The verdict is one word and must never be gated on anything further. But the *reasoning* behind it is
the part no model in this system can generate, and today it is lost at the next `/clear`.

Interview him — at `/wrap-up`, not at the moment of decision — only when there is something to learn:

- **a rejection** (highest signal available: something was wrong and only he knows what),
- **an approval that overrides an advisor finding** (the advisor was wrong, or a premise was not
  binding),
- **an approval where he edited something first** (the edit is the feedback).

Not on a plain approval that matched the recommendation — there is nothing there, and spending his
attention on it is how interviews stop getting answered.

Two rules for the interview itself:

- **Open question first, hypothesis second.** The session asking is the session that authored the
  work, and a leading question ("was it because X?") collects agreement rather than information.
- **One question at a time, plainly worded.** Not a questionnaire.

Log answers to `lessons.md` marked **user-sourced**, kept distinct from model-observed findings, under
the same promotion discipline: one answer is a logged data point, recurrence earns a doctrine change.
A single passing preference must not calcify into a rule.

