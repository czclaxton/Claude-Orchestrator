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

**Validate the components, not just the manifest.** `claude plugin validate .` at the repo root
checks the marketplace manifest and nothing else — it passes clean while an agent file is broken.
Point it at the component directories:

```
claude plugin validate ./agents
claude plugin validate ./commands
claude plugin validate ./skills
```

This is not hypothetical. `agents/routine-implementer.md` shipped for months with a description
containing an unquoted `: ` — YAML's most common failure — so its **entire frontmatter block failed
to parse**. Name, description, `model` and `tools` all fell back to defaults. The consequences were
invisible from anywhere except a session's own agent listing: the cheapest and most-used lane ran
with **every tool available** instead of its declared six, carried a generic placeholder description
that degraded routing, and — the expensive one — silently ignored its `model: sonnet` pin and
inherited the session model instead.

That last symptom was diagnosed across several sessions as a Claude Code regression, and a feedback
report was filed with Anthropic about it. It was this file. A single controlled dispatch settled it:
`critical-implementer`, whose frontmatter parses, resolved its `model: fable` pin correctly with no
override on the same CLI version in the same session.

**Never put an unquoted `: ` inside a frontmatter value.** Use an em dash, or quote the whole value —
and run the validator against `./agents` before every version bump, because nothing else catches it.

## 4. Before you bump: review the open lessons.md PRs

## 4. Two repos, two different jobs — and only one of them is the user's

The notes repo and the plugin repo carry different kinds of PR, and confusing them is what stalled
this loop for weeks.

**Notes-repo PRs are filing, not judgment, and the user is not their gate.** When testing mode is on,
`/claude-orchestrator:wrap-up` opens a small PR there for each fragment it writes. Merging one moves
the fragment onto that repo's default branch and nothing else — it lands in `pending-lessons/`, never
in `lessons.md`, so no doctrine is accepted, no behaviour changes, and nothing ships. The orchestrator
merges these as bookkeeping.

**Plugin-repo PRs are where the user decides.** A change to a command, an agent, a skill or the README
alters what every install does. That is the gate, and it is the only one.

This corrects an earlier version of this section, which told the user to review every notes PR at each
version bump. It never once ran: twenty-three sat open, the oldest six days, across four version bumps
in a single day. A checkpoint that has never fired is not a checkpoint — it is a queue with a person
standing in it.

**The safeguard that replaces it.** A user who never reads the fragments only ever sees the
orchestrator's consolidation of them, and the orchestrator is the compression step. This project has
already logged an instance of a correct finding being degraded into a false claim one hop downstream
while being summarised. So: **a plugin PR built from fragments must name the fragments it consumed**,
by filename, in its collapsed detail block. That makes spot-checking cheap without making approval a
gate — the user opens one when a claim looks off, rather than reading all of them to find out.

## 5. The human is a component of this system, not a gate on it

The user is not just the approver — they are the only signal in this loop that no model here can produce.
Three reasons, all evidenced rather than assumed:

- Every lane, including the advisor, is a Claude model. The advisor is a fresh-eyes check, never an
  independent one. Published work on self-preference bias is about a model reviewing *its own*
  generations, which the Opus-writes/Fable-reviews split does avoid — but same-family review is not
  independence, and the case this project actually occupies is not addressed in the literature at all.
- Twice now the advisor has reasoned correctly inside constraints that were never actually binding.
  Only the human can say a premise is not real. That failure is invisible from inside the system.
- Measured results on trained code critics put **human + critic** ahead of critic alone: critics catch
  real bugs *and* hallucinate plausible ones, and the human is what separates the two.

They are also a *user* of the plugin, not only its author — so their friction is product evidence, not just
a preference. Treat their reasoning as a first-class input to be captured, not an approval to be
collected. See `research-self-review-designs.md` in the notes repo for sources.

## 6. PR triage: two buckets, and nothing is closed without them

**Every PR that exists gets their decision.** There is no auto-close bucket, deliberately. An earlier
draft of this section had one, restricted to objective failure — and it was removed, because any
filter standing between a change and the human is a filter on the one input the human is here to
provide, and the failure mode is silent by construction.

The problem auto-close appeared to solve does not need solving at the PR layer: **a PR is only opened
once its claim has survived the replay and the advisor pass.** If the replay disproves the fix's own
stated claim, it gets fixed or abandoned *before* becoming a PR. A known-broken change should never
reach them in the first place, closed or otherwise.

Abandoned attempts still get named at the next `/wrap-up` — a one-line note on what was tried and why
it was dropped. Not for approval; so that work disappearing before the PR layer stays visible.

Every PR is therefore one of two buckets, decided before it is opened:

**`[decide]` — debatable.** The test is whether a reasonable person could choose differently: a real
tradeoff, an unresolved advisor disagreement, a choice that forecloses a future option, or a change
resting on an assumption about what they want.

**`[skim]` — a slam dunk.** There is a clearly correct answer, it is implemented, and the evidence is
attached. Still their call; the process is simple, not absent.

**The test is debatability, not blast radius.** Every edit to a command file changes behavior for
everyone who installs the plugin — if that alone qualified, every PR would be `[decide]` and the
distinction would carry no information. A verified correctness fix with no live tradeoff is a `[skim]`
however important the file. (Found by applying this section to the open PRs immediately after writing
it; the first draft's criterion collapsed on contact.)

Prefix the PR title with the bucket so it is visible in the list view without opening anything.

## 7. PR format: defined in one place, the `pr-format` skill

The format lives in `skills/pr-format/SKILL.md` and nowhere else. That file is the only definition;
this section is a pointer, and `commands/wrap-up.md` names the skill rather than restating it.

That arrangement is deliberate and was bought with a real failure. The format used to be written
here and paraphrased separately inside `/wrap-up`, and the two drifted: this section asked for a
TL;DR, a Decision line and a collapsed Details block, while the command told the session "keep the
PR body short — the heading plus one sentence is enough." The command won every time, because the
command is the thing actually executing. Adherence to this section sat at 3 PRs out of 11 in this
repo and 4 out of 19 in the notes repo.

A rule stated twice is a rule that will disagree with itself, and the copy that runs wins the
disagreement silently. One copy, in the place that loads.

**Read the skill for the template. This section deliberately does not reproduce it** — an outline
here is still a second copy, and it goes stale the moment the skill changes, which is the failure
described above in miniature.

The one thing worth stating here, because it is the mechanism rather than the formatting: a PR that
cannot be summarised in three sentences is doing too much and gets split. Everything else in the
skill is scaffolding around that constraint.

**The outline above is a courtesy for humans browsing this repo, not a second definition.** If it
ever disagrees with the skill, the skill is correct and this paragraph is stale. Stating the
precedence is the point — the previous arrangement had two copies and no rule about which one won.

## 8. Capture the reasoning, not just the verdict

The verdict is one word and must never be gated on anything further. But the *reasoning* behind it is
the part no model in this system can generate, and today it is lost at the next `/clear`.

**Decisions happen asynchronously; capture happens at the next `/catch-up`.** They review on their own
time — often between sessions, often from a phone — so the session that authored a change is usually
gone by the time it is decided. `/wrap-up` is the wrong end of the loop for anything except a decision
made inside the current session.

**Merging with no comment is a complete action and costs them nothing further.** That is a plain
agreeing approval. If the baseline carries any additional obligation, the whole mechanism stops being
answered within a month.

Where signal exists, the cheapest capture is **a one-line comment on the PR at the moment they decide**
— durable, timestamped, attached to the exact change, and immune to any number of `/clear`s. A
comment rather than an edit to the PR body, so the record is appended to rather than overwritten.
This is a shortcut that saves them the question later, never an obligation: if they say nothing,
`/catch-up` picks the decision up at the start of the next session and asks then.

`/catch-up` therefore sweeps PRs merged or closed since the last sweep, in both this repo and the
notes repo, and interviews only when there is something to learn:

- **a rejection** (highest signal available: something was wrong and only they know what),
- **an approval that overrides an advisor finding** (the advisor was wrong, or a premise was not
  binding),
- **an approval where they edited something first** (the edit is the feedback).

Not on a plain approval that matched the recommendation — there is nothing there, and spending their
attention on it is how interviews stop getting answered.

A PR closed with no comment is the single highest-signal event available and always earns a question
at the next `/catch-up`: something was wrong and they are the only one who knows what.

Two rules for the interview itself:

- **Open question first, hypothesis second.** The session asking is the session that authored the
  work, and a leading question ("was it because X?") collects agreement rather than information.
- **One question at a time, plainly worded.** Not a questionnaire.

Log answers to `lessons.md` marked **user-sourced**, kept distinct from model-observed findings, under
the same promotion discipline: one answer is a logged data point, recurrence earns a doctrine change.
A single passing preference must not calcify into a rule.

