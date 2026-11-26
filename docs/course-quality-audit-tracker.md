# Intel 8086 Lab — Course quality audit tracker

Last updated: 2026-11-27

This tracker records findings, corrections, evidence and remaining verification. A source change is not considered validated until the relevant automated checks have actually run and their results have been inspected.

## Audit rules

For every finding: detect the symptom, inspect the complete affected path, identify the root cause, correct all affected layers, add a regression test, inspect cross-component effects, then verify the resulting CI and published site. Do not mark a task complete on compilation alone.

## Work plan and status

| # | Area | Status | Evidence / remaining work |
|---|---|---|---|
| 1 | Navigation of 36 chapters | Implemented; runtime verification pending | Active chapter state, invalid-index guards, accessible state attributes, desktop/mobile DOM order, and 36-chapter browser assertions added. The browser audit is now a dedicated CI job. Inspect its first actual run and screenshots. |
| 2 | 108 assembly examples and expected results | Existing source-level audit covers 108/108; further binary parity audit pending | tests/learning-quality.cjs executes all 108 source examples and requires 108 unique independent expected-state oracles. executeAll assembles each source program before source execution. A separate all-example binary-execution parity check has not yet been established. |
| 3 | 684 questions and corrections | Duplicate stems corrected; test execution pending | Two exact cross-chapter duplicates were rewritten in chapters 15 and 33. The semantic key was updated. A global exact-stem uniqueness assertion now covers all 684 runtime questions. |
| 4 | Pedagogical quality of all 36 chapters | Pending deeper review | Review accuracy, progression, prerequisites, depth, terminology, examples, and whether each lesson teaches before assessing. |
| 5 | Exercises and solutions | Pending | Verify statements, constraints, hints, step-by-step corrections, executable solutions, expected states, difficulty labels, and chapter filters. |
| 6 | Simulator/course integration | Pending | Verify example loading, source/binary execution paths, step tracing, registers, memory, FLAGS, segments, stack, interrupts and error feedback. |
| 7 | Accessibility, responsive layout and performance | Partially implemented | Navigation and reading order corrections are in place. Continue keyboard, screen-reader, contrast, zoom, reduced-motion, narrow viewport, loading and performance audits. |
| 8 | Documentation versus implemented behavior | Pending | Compare every documented instruction/form, assembler and disassembler restriction, execution behavior and unsupported/partial feature against implementation and independent tests. |
| 9 | CI and publication | Partially implemented; verification pending | Browser audit job added to .github/workflows/ci.yml. Inspect actual workflow runs, failures, artifacts, deployment status and the live published site. |

## Findings fixed

### Navigation

- The selected chapter was not exposed consistently as the current navigation step.
- Chapter navigation now tracks the active chapter and exposes aria-current, aria-pressed and aria-controls.
- Invalid chapter and lesson indexes are guarded.
- Desktop and mobile reading order is synchronized with the responsive layout.
- Browser assertions now check all 36 chapter selections and the selected detail panel.

### Question bank

- Duplicate stem: C15-F-Q1 repeated C04-L2-Q1. Replaced with a question about the number of distinct 8-bit patterns.
- Duplicate stem: C33-F-Q1 repeated C06-L1-Q2. Replaced with a definition of an instruction offset within a segment.
- The reviewed semantic key was updated for both entries.
- A global duplicate-stem regression assertion was added.

## Verification caveat

The GitHub commit/status inspection available during this audit did not provide completed check-run results. Therefore, the changes above are recorded as implemented, not as CI-passed or publication-verified. Update this tracker only after inspecting real run results.
