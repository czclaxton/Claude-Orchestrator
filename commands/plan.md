---
description: Interview the user one decision at a time and write a complete spec for implementation
---

Turn the user's request into a spec an implementer can follow without this conversation.
Interview the user to settle missing decisions, then write the spec. Do the following, in order.

## 1. Find what is missing

Read the request and any outline or spec the user supplied. Read the relevant project instructions
and inspect the files needed to establish existing interfaces, conventions, and verification
commands. Resolve factual questions from the project before asking the user to decide them.

Keep a short working list of settled decisions and material gaps. Tie each gap to something the
user said, a contradiction, or an omission. User decisions cover what gets built: scope, behavior,
tradeoffs a reasonable person could choose differently, or choices expensive to reverse.
Implementation details with defensible defaults (naming, file layout, internal structure, idioms)
belong to the implementer: decide them, state them in the spec, and move on.

Check scope boundaries, failure cases, exact interfaces, existing conventions, verification, and
the cost and reversibility of a wrong choice. Use these as lenses on this request, not a fixed
questionnaire. Do not re-ask answered questions or invent decisions that do not affect the work.

If no request was supplied, start with the decision about which outcome to plan. Recommend
starting with one concrete outcome so the scope stays clear; name the case for a broader plan
when several outcomes depend on each other. Ask what outcome the user wants, then wait.

## 2. Interview one decision at a time

Before each question, test: Is it unanswered and does it change what gets built, leave a reasonable user a meaningful tradeoff, or cost much to reverse, rather than just select an implementation detail with a defensible default? Ask only if yes.
Choose the qualifying decision that most affects the remaining plan. Explain which part of the
user's explanation leaves it open and what would otherwise have to be guessed.

Ask exactly one question per turn, never a batch or a question containing several decisions.
For each question, state the decision in plain language, give a recommendation and why, name
the strongest case against that recommendation, and give a short tradeoffs list.
Then wait for the user's answer before asking the next question. A recommendation is not an answer.

After each answer, update the settled decisions and gaps. Check whether the answer changes an
earlier decision or exposes another gap. Choose the next question from that updated understanding,
not from a preset sequence. If answers conflict, apply the same test before asking which governs.

Depth scales with unresolved user decisions, not request length or engineering complexity.
For a clear request, even one sentence, default to zero questions: check completeness and write
the spec. Ask only for a specific gap that passes the test, including in failure and recovery cases.

## 3. Check whether planning is complete

Before ending the interview, try to fill every part of the five-part contract below in working
notes. For each material statement, identify its basis in the user's request, an answer, an
inspected project fact, or a defensible implementation default with its rationale.

Walk through the requested behavior and each relevant failure case as an implementer with no
conversation history. Check that the notes determine the outcome, name every affected file,
pin the interfaces and boundaries, and provide commands with expected results that test the
agreed behavior. If a verification command needs a new test or script, specify its path and
required behavior as part of the work; do not pretend it already exists.

The check passes only when all five parts are complete, every material statement has a basis,
and there are zero unresolved material gaps, contradictions, or placeholders.
For an inapplicable part, write why it does not apply rather than leaving it blank.
If the check fails, inspect missing facts or decide implementation defaults; ask only for a gap
that passes the question test, choosing the highest-impact one.
Do not hand an implementer a choice disguised as "use your judgment."

If the user stops early or needed evidence is unavailable, report the specific unresolved gaps.
Label any saved notes as incomplete; do not present them as a spec ready for implementation.

## 4. Write the spec

Write the completed spec to `PLAN.md` at the current project root, unless the user supplied a
different destination. Read an existing file before updating it; if it covers unrelated work,
use a new `PLAN-<short-task-slug>.md` filename instead of overwriting it.

This is a process artifact. In a git repository, ensure its exact path is covered by
`.git/info/exclude` in the same step that creates it, adding an entry if needed. Never use
`.gitignore` for this. Outside git, no exclusion is needed. If saving or exclusion fails,
report the failure and provide the spec in the conversation without claiming it was saved.

Use exactly these five parts, with enough detail to stand alone:

1. **Objective** — what to build or change, one paragraph
2. **Files** — exact paths to create or modify
3. **Interfaces** — signatures, types, or API shapes the code must match
4. **Constraints** — project conventions, things not to touch
5. **Verification** — the command(s) that prove it works

Put agreed behavior and failure cases in Objective or Interfaces, and scope exclusions in
Constraints. Include expected results in Verification. Keep decisions in these five parts,
not in a sixth section or a reference back to the interview. Report the saved path and the
result of the completeness check concisely.

This command covers requirements and spec writing. It does not implement the work, run the
future verification, or prove the design correct. It does not replace the doctrine's reviewer
consultation at commitment boundaries, lane routing, or mandatory final reviewer review.
Follow those obligations where applicable; a completed interview alone does not satisfy them.
