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
| 4 | Pedagogical quality of all 36 chapters | Content expanded; deeper review pending | 69 short lesson explanations plus two foundational explanations were expanded. The runtime course now has 108/108 lesson theories at 300+ characters (minimum 303); a CI assertion enforces this. Continue reviewing accuracy, progression, prerequisites, terminology and teaching quality. |
| 5 | Exercises and solutions | Expanded; automated verification pending | Exercise bank now contains 42 guided exercises with explicit topic-to-chapter mappings covering all 36 chapters. Fifteen advanced exercises were added; two integration exercises were mapped and classified. Tests validate metadata, every complete solution and its validator; extra byte oracles cover encoding, ModR/M and symbol resolution. Browser checks now verify that chapter, difficulty and type filters return genuinely matching exercises. |
| 6 | Simulator/course integration | Integration fixes implemented; runtime verification pending | Course examples and exercise statements/corrections now have browser hand-off tests. Binary execution accepts explicit physical-memory and port seeds; source VECTOR/PORT metadata is reused only when loaded bytes exactly match the current source. IVT target/range and code-overlap checks were added. Binary results synchronize the visible CPU state, and the next source step/run resets cleanly. The 10,000-instruction ceiling now reports an interruption instead of false success. Source/binary interrupt, memory, I/O and stack checks are in the browser suite. |
| 7 | Accessibility, responsive layout and performance | Partially implemented | Navigation and reading order corrections are in place. The memory panel sorts displayed addresses and explicitly reports when its 24-byte view is truncated. Continue keyboard, screen-reader, contrast, zoom, reduced-motion, narrow viewport, loading and performance audits. |
| 8 | Documentation versus implemented behavior | Partially updated | Added PORT to the directive reference and clarified that VECTOR/PORT are pedagogical metadata, not hardware opcodes. Binary IVT and port initialization rules now match the UI. Continue the full instruction/form and unsupported-feature audit. |
| 9 | CI and publication | Partially implemented; verification pending | Browser audit job added to .github/workflows/ci.yml. Inspect actual workflow runs, failures, artifacts, deployment status and the live published site. |

## Findings fixed

### Navigation

- The selected chapter was not exposed consistently as the current navigation step.
- Chapter navigation now tracks the active chapter and exposes aria-current, aria-pressed and aria-controls.
- Invalid chapter and lesson indexes are guarded.
- Desktop and mobile reading order is synchronized with the responsive layout.
- Browser assertions now check all 36 chapter selections and the selected detail panel.

### Lesson content

- Expanded the technical explanations in 69 short lesson entries and two foundational entries.
- Added a CI requirement that every one of the 108 visible lessons contains at least 300 characters of technical explanation; the inspected runtime data has a minimum of 303 characters and an average of 453.
- Corrected the REP zero-count explanation: REP with CX=0 performs no iterations and leaves CX and the string indexes unchanged. The existing string-instruction tests already cover this case in both source and binary execution.

### Simulator/course integration

- Added a documented initial-memory editor for physical 20-bit addresses and an initial-port editor for binary execution.
- Binary execution reuses VECTOR and PORT metadata only when the supplied byte stream exactly matches the current source assembly; otherwise, explicit initial memory/port values are required.
- Added IVT target-range and code-overlap validation, and synchronized the binary result with the visible CPU state so subsequent source stepping/running starts from a clean reset.
- Fixed the run-limit status: reaching 10,000 instructions now reports a safety interruption rather than successful completion.
- Sorted the memory display and made its 24-byte truncation explicit.
- Added browser checks for lesson-example loading, exercise statement/solution loading, binary INT/IRET, manual memory and port seeds, source PORT metadata, and binary-to-source transitions.

### Exercises

- Replaced position-based and keyword-inferred chapter associations with explicit mappings for all 42 exercises.
- Added 15 practical exercises covering jumps, procedures, stack parameters, modular routines, MUL/DIV, shifts, interrupts, I/O, encoding, ModR/M, disassembly, segment overrides, optimization limits and a memory-array project.
- Mapped the two existing integration exercises to the chapters they actually combine and set explicit difficulty/type metadata.
- Strengthened stack validators to check SP restoration and empty stack metadata; the reverse string-copy validator now checks destination bytes as well as SI, DI and DF.
- Added CI contracts for 42 exercises, complete coverage of 36 chapters, valid metadata and executable validated solutions; browser checks verify the actual filtered card metadata and chapter association.

### Question bank

- Duplicate stem: C15-F-Q1 repeated C04-L2-Q1. Replaced with a question about the number of distinct 8-bit patterns.
- Duplicate stem: C33-F-Q1 repeated C06-L1-Q2. Replaced with a definition of an instruction offset within a segment.
- The reviewed semantic key was updated for both entries.
- A global duplicate-stem regression assertion was added.

## Verification caveat

The GitHub commit/status inspection available during this audit did not provide completed check-run results. Therefore, the changes above are recorded as implemented, not as CI-passed or publication-verified. Update this tracker only after inspecting real run results.
