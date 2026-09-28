# AcePlan: instructions for AI sessions

AcePlan is a semester planner for students (timetable, exams, study timer, subjects and
materials, badges). AI notes and quizzes are an opt-in extra, not the product.

## Read these first, in order
1. `docs/HANDOVER.md`: where things stand right now, what is next, what to avoid.
2. `docs/CONSTRAINTS.md`: what you must never do. Scoped permission, not "allow anything".
3. `docs/ARCHITECTURE.md` and `docs/FLOW.md`: the map, and how execution travels.
4. `docs/DECISIONS.md`: settled choices. Do not re-litigate them without new evidence.

## Working agreements
- Explain the plan before implementing it. Catch bad reasoning while it is a paragraph.
- One logical change per request and per commit. Keep changes small and traceable.
- Verify with the commands in `docs/TEST_CHECKLIST.md` and quote the output. "Should work"
  is not a result.
- Comment non-obvious logic as you write it: what the block is for, what calls it, what it
  assumes. Do not restate the code.
- Every meaningful choice goes in `docs/DECISIONS.md` with the reason, and the model that
  made it.
- Every bug or feature gets one trace file in `docs/work/` (see `_TEMPLATE.md`).
- Before a risky change, read `docs/ROLLBACK.md`.
- End every session by updating `docs/HANDOVER.md` with: what we did, what is left, what to
  watch out for.
- The person owning this project must be able to explain any change in their own words
  before it is accepted. Docs support understanding; they do not replace it.
