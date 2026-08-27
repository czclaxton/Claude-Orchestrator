---
name: pr-format
description: The canonical PR body format for this project — an Ask, a TL;DR under 60 words, a Checked line naming what was not verified, the alternatives considered and discarded, and everything else collapsed. USE WHEN writing or revising a pull request body, running `gh pr create`, opening a PR for a lessons entry or a research note, or deciding how much detail a PR description needs.
---

# PR format — writing for a reviewer with no time

This file is the only place this format is defined. Commands and docs point here; nothing
paraphrases it. A second copy drifts from the first, and the version that executes wins the
disagreement silently.

## Who you are writing for

One person, reviewing in batches, with less attention than there is work. They are not auditing
your reasoning — they are deciding. Write the way a chief of staff briefs a principal: the
recommendation first, the reason it might be wrong right behind it, and the supporting material
available but out of the way.

The brief only saves them anything if it is reliable. A wrong summary costs more than no summary,
because verifying a summary takes longer than reading the source. Everything below follows from
that one fact.

## The format

```markdown
[decide|skim] <what changed, in the title>

**Ask** — <one line: what they are deciding, not what the merge does>

**TL;DR** — <what changed>
<why>
<what breaks if this is wrong>

**Checked** — <verified | partly verified | unverified>. Not checked: <the single largest
thing, named specifically, or "nothing material">. Advisor: <verdict | not run, and why>.

**Considered and discarded** — <alternative → why not>. <Searched | thought about only>.
Or: "Nothing else considered."

<details>
<summary>Details</summary>

### Mechanism
### Evidence
```
<real command output>
```
### Tradeoffs
### Also in this PR

</details>
```

## What each part is for

**The prefix.** `[decide]` carries a live judgment the reviewer could reasonably land either way on.
`[skim]` is correct work that needs a glance, not a debate. Guess `[decide]` when unsure — a
mislabelled `[skim]` costs a decision that never got made.

**Ask.** State the judgment, not the changelog. "Approving ships a new file, wires it in, and bumps
the version" describes the merge; the reviewer already sees that in the diff. "Whether a notice at
every session start is worth a spurious one when the check is wrong" is the thing only they can
answer. On a `[skim]`, one clause is the whole line.

**TL;DR.** Sixty words, hard. What changed, why, and what breaks if it is wrong. The third clause is
the most valuable line in the document — it is the only place risk appears before the reader opts
into detail. Over sixty words means the PR is doing too much and gets split. That constraint is the
real mechanism here; the formatting is scaffolding around it.

**Checked.** This line exists because a PR body once asserted a version bump that had not happened,
in this format, and merged — and the PR that repaired it explained why: a find-and-replace keyed on
an assumed value, exit code 0, no error, six commits before anyone noticed.

Name the single largest thing you did not verify, specifically. "Nothing material" is a valid answer
and a visible one; vagueness is not. A caveat inside the collapsed block does not exist, because a
partial read produces confidence — the reader comes away with real, correct content and no idea what
sat below the cut.

Say whether the advisor ran. An absent review declares itself here or it does not declare itself.

**Considered and discarded.** "It is A or B" asserts "there is no C," which is a negative claim and
needs a search behind it. Name what you set aside and why, and tag it `searched` or `thought about
only`. That tag is the honest half: "searched" obliges a command the reviewer can re-run, and
"thought about only" is a complete and respectable answer.

"Nothing else considered" is a valid value. Write it rather than omitting the section — omission and
absence must never look the same.

**Details.** Everything else, collapsed. Evidence is a required subheading holding real command
output, not a description of output. Reports are claims; pasted output is evidence.

## Variants

**A one-line or mechanical change** keeps the Ask, the TL;DR, and the Checked line; Details is
optional and Considered collapses to "Nothing else considered." The ceremony-to-diff ratio is bad
here and that is accepted, because mechanical changes are exactly where the false claim happened.

**A lessons entry or research note** replaces Considered-and-discarded with Recurrence, because a
logged observation has no alternatives:

```markdown
[skim] Log <date>: <three-word gist per finding>

**Ask** — File these, or push back on any of them.

**TL;DR** — N findings from <date>. <One clause each.>

**Checked** — Finding 1 verified (<how>). Finding 2's observation verified, causal claim
asserted from one session. Finding 3 unverified.

**Recurrence** — Finding 2 is the third instance of <theme>; clears the promotion bar.
```

The entry already carries verified/asserted markers in its own text. Surface those in the Checked
line rather than re-summarizing the entry — the diff is the content.

## Rules that override the template

Split a PR that needs more than sixty words to summarize. Size is what actually kills triage: a
1,078-line PR in this project sat four sessions untouched, and splitting it was the only thing that
made it reviewable.

Push a document that something else cites to the default branch when it is written, rather than
opening a PR for it. A reference file reachable only from an unmerged branch breaks every path that
points at it, and this project has already lost a citation that way.

Leave every PR open for the reviewer to close. There is no auto-close bucket here, deliberately.
