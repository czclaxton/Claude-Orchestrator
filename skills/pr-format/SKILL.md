---
name: pr-format
description: The canonical PR body format for this project — a one-line decision, a TL;DR of at most three sentences, and five short bullets. Everything else collapsed. USE WHEN writing or revising a pull request body, running `gh pr create`, opening a PR for a lessons entry or a research note, or deciding how much detail a PR description needs.
---

# PR format — a secretary's brief, not an engineering document

This file is the only place this format is defined. Commands and docs point here; nothing
paraphrases it. A second copy drifts from the first, and the version that executes wins the
disagreement silently.

## Who you are writing for

One person, reviewing in batches, with less attention than there is work. Write the way a secretary
briefs a CEO at the start of the day: here is the thing, here is what you need to decide, here is
what bites you if it goes wrong. They will ask for more if they need it.

**Plain language, not engineering register.** No jargon without a definition. If a term needs
explaining, either explain it in four words or use a different term.

**The reader should be able to skim it and decide.** If they have to read it twice, it failed.

## The format

```markdown
[decide|skim] <what changed, in plain words>

**Deciding:** <one line — the judgment they are making, not what the merge does>

**TL;DR** — <one to three sentences. Hard limit.>

- **Changes:** <what actually changes>
- **Why:** <the reason, in one line>
- **Risk:** <what breaks if this is wrong>
- **Unverified:** <the single biggest thing not checked, or "nothing material">
- **Alternatives:** <what was set aside and why, or "none considered">

<details>
<summary>Detail and evidence</summary>

<mechanism, real command output, tradeoffs, anything else>

</details>
```

That is the whole body above the fold: one line, up to three sentences, five bullets. Everything
else goes inside `<details>`.

## Rules

**The prefix.** `[decide]` carries a live judgment they could land either way on. `[skim]` is correct
work that needs a glance. Guess `[decide]` when unsure — a mislabelled `[skim]` costs a decision that
never got made.

**Deciding.** State the judgment, not the changelog. "Approving ships a new file and bumps the
version" describes the merge, which they can already see. "Whether a warning at every session start
is worth a false alarm when the check is wrong" is the thing only they can answer.

**TL;DR.** Three sentences, hard. Longer means the PR is doing too much and should be split.

**One line per bullet.** A bullet that wraps to three lines belongs in the collapsed section.

**Unverified is required and specific.** Name the single largest thing not checked. "Nothing
material" is a valid answer and a visible one; vagueness is not. This bullet exists because a PR body
in this project once asserted a version bump that had not happened, and merged — a find-and-replace
keyed on a wrong value, exit code 0, no error, six commits before anyone noticed. A caveat hidden
inside the collapsed block does not count, because a partial read produces confidence.

**Alternatives is required.** "It is A or B" asserts "there is no C," which is a claim that needs a
search behind it. "None considered" is a valid and respectable value — write it rather than omitting
the bullet, because omission and absence must never look the same.

**Evidence goes in the collapsed block, as real command output.** Reports are claims; pasted output
is evidence.

## Variants

**A mechanical or one-line change** keeps the same shape. Alternatives collapses to "none
considered" and the detail block is optional. The ceremony-to-diff ratio is bad here and that is
accepted, because mechanical changes are exactly where the false claim happened.

**A lessons entry or research note** swaps the Alternatives bullet for **Recurrence** — a logged
observation has no alternatives, but it does have a history:

```markdown
[skim] Log <date>: <plain-words gist>

**Deciding:** File these, or push back on any of them.

**TL;DR** — <one to three sentences: what was observed and why it matters.>

- **Findings:** <N, one clause each>
- **Why it matters:** <one line>
- **Risk:** <what happens if these are wrong or ignored>
- **Unverified:** <which findings are impressions rather than re-checked>
- **Recurrence:** <"third instance of X, clears the promotion bar" — or "first instance">
```

## When the format is not enough

The reader will sometimes ask for more context. **That question is a signal, and it has two
different causes worth telling apart:**

1. **The PR was weak** — the summary was vague, buried the decision, or hid the risk. Fix the PR, and
   treat it as a defect in the writing.
2. **The change was genuinely too complex for the format** — the nuance could not survive three
   sentences and five bullets. That is a real edge case, it is expected, and expanding is the right
   answer.

Assume cause 1 first. Almost every PR in this project should fit the format, and reaching for cause 2
too readily is how a format degrades back into an engineering document. When cause 2 genuinely
applies, say so explicitly in the reply rather than silently writing a longer body — a format that
quietly grows has stopped being a format.

## Rules that override the template

Split a PR that needs more than three sentences to summarize. Size is what actually kills triage: a
1,078-line PR in this project sat four sessions untouched, and splitting it was the only thing that
made it reviewable.

Push a document that something else cites to the default branch when it is written, rather than
opening a PR for it. A reference file reachable only from an unmerged branch breaks every path that
points at it, and this project has already lost a citation that way.

Leave every PR open for the reviewer to close. There is no auto-close bucket here, deliberately.
