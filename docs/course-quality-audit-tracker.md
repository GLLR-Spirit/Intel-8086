# Intel 8086 Lab — Course quality audit tracker

Last updated: 2026-11-27

This tracker records findings, corrections, evidence and remaining verification. A source change is not considered validated until the relevant automated checks have actually run and their results have been inspected.

## Audit rules

For every finding: detect the symptom, inspect the complete affected path, identify the root cause, correct all affected layers, add a regression test, inspect cross-component effects, then verify the resulting CI and published site. Do not mark a task complete on compilation alone.

## Work plan and status

| # | Area | Status | Evidence / remaining work |
|---|---|---|---|
| 1 | Navigation of 36 chapters | Automated browser verification passed | Active chapter state, invalid-index guards, accessible state attributes, desktop/mobile DOM order, and 36-chapter browser assertions. Playwright browser job in CI run 1884 succeeded on commit 96a7bdf. Manual screen-reader/keyboard review remains open. |
| 2 | 108 assembly examples and expected results | Source/binary differential passed | CI run 1884 reports 108/108 examples compared and 108/108 independent end-state oracles matched. Four conceptual examples are explicitly retained. |
| 3 | 684 questions and corrections | Automated oracle checks passed; independent certification remains 384/684 | CI run 1884 reports 684/684 oracle records passed automated evaluators and runtime concordance. Official certification ledger remains 384/684 (300 not yet officially certified). Separate individual-review files now cover 323 questions across chapters 1–17: 256 passed, 67 corrected, 0 blocked. These review records are not automatically reconciled into the historical certification ledger. Chapter 17's final-assessment blueprint remains open. |
| 4 | Pedagogical quality of all 36 chapters | Automated structure passed; expert review remains open | 108/108 lesson theories meet the enforced minimum length. Continue individual review of accuracy, progression, prerequisites, terminology, conceptual examples and teaching quality. |
| 5 | Exercises and solutions | 48/48 automated corrections and source/binary comparisons passed | CI run 1884 reports 48 guided corrections compared across source and binary execution. Metadata, validators and exercise filters are covered by automated tests. Manual pedagogical review remains open. |
| 6 | Simulator/course integration | Automated source/binary and browser checks passed | CI run 1884 passes the differential and targeted instruction suites; browser job in CI run 1884 passes the full Playwright desktop/mobile job. Hardware-level equivalence is not established. |
| 7 | Accessibility, responsive layout and performance | Automated structure/browser checks passed; manual review open | CI checks unique IDs, labeled controls, landmarks, navigation, responsive and reduced-motion rules; Playwright desktop/mobile audit passed. Screen-reader, exhaustive keyboard, zoom and manual performance audits remain open. |
| 8 | Documentation versus implemented behavior | Reference coverage expanded; full opcode audit pending | Expanded the searchable reference from 43 to 64 instruction families/directives, including arithmetic, adjust, rotate/shift, conversion, transfer, I/O, loop, prefix and coprocessor-related families. Every visible entry now has metadata and a three-part simulator/assembler/disassembler support declaration. PORT and VECTOR are explicitly identified as pedagogical directives, not hardware opcodes. The README count and simulator scope were reconciled with the 64-entry reference; source/binary IVT and port behavior is now described consistently. Continue checking every documented form against independent execution and encoding tests. |
| 9 | CI and publication | CI passed; publication intentionally not triggered | Main CI run 1884 and browser audit job in CI run 1884 both succeeded on commit 96a7bdf. The browser job uses a local static server. No deployment was triggered and the published site was not verified against this commit. |

## Findings fixed

### Navigation

- The selected chapter was not exposed consistently as the current navigation step.
- Chapter navigation now tracks the active chapter and exposes aria-current, aria-pressed and aria-controls.
- Invalid chapter and lesson indexes are guarded.
- Desktop and mobile reading order is synchronized with the responsive layout.
- Browser assertions now check all 36 chapter selections and the selected detail panel.

### Instruction reference

- Expanded the searchable reference to 64 instruction families/directives.
- Added missing entries for ADC/SBB/NEG, conditional loops, decimal-adjust instructions, rotations/shifts, CBW/CWD, LAHF/SAHF, XCHG, LEA, LDS/LES, IN/OUT, INTO, XLAT, LOCK, ESC and WAIT.
- Added an integrity contract requiring unique reference entries, metadata for every entry, and explicit simulator/assembler/disassembler support values.
- Static reconciliation found no missing metadata and no invalid support-status arrays across the 64 visible entries.

### Accessibility

- Added explicit navigation semantics and selected-state announcements for chapters and sublessons.
- Limited live announcements to changing lesson headings and quiz scores instead of announcing the entire lesson body.
- Added status semantics to assembler, disassembler and binary execution reports.
- Checked key theme contrast pairs: primary text/background 16.06:1, muted text/panel 6.74:1, and primary button text/background 7.54:1.

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

- Replaced position-based and keyword-inferred chapter associations with explicit mappings for the original exercise set; the current guided exercise bank contains 48 exercises.
- Expanded the guided exercise bank to 48 exercises. Topics include jumps, procedures, stack parameters, modular routines, MUL/DIV, shifts, interrupts, I/O, encoding, ModR/M, disassembly, segment overrides, optimization limits and memory-array projects.
- Mapped the two existing integration exercises to the chapters they actually combine and set explicit difficulty/type metadata.
- Strengthened stack validators to check SP restoration and empty stack metadata; the reverse string-copy validator now checks destination bytes as well as SI, DI and DF.
- CI checks validate the current exercise inventory, chapter coverage, metadata and executable solutions; browser checks verify actual filtered card metadata and chapter association.

### Question bank

- Duplicate stem: C15-F-Q1 repeated C04-L2-Q1. Replaced with a question about the number of distinct 8-bit patterns.
- Duplicate stem: C33-F-Q1 repeated C06-L1-Q2. Replaced with a definition of an instruction offset within a segment.
- The reviewed semantic key was updated for both entries.
- A global duplicate-stem regression assertion was added.

## Verification evidence — 27 November 2026

- Main CI: [run 1884](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46014172472), commit `96a7bdf83491a53ec9546e04987e4ce012fbf2da`, success.
- Browser audit: [run 1884](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46014172454), same commit, success.
- Confirmed from CI logs: 378/378 smoke tests; 684/684 oracle evaluator records (automated only); 108/108 source/binary example comparisons; 48/48 guided corrections; 11,568/11,568 ModR/M matrix cases; browser Playwright job success.
- Official individual question certification remains 384/684, with 300 pending. Automated oracle evaluation does not advance that ledger.
- Four conceptual course examples remain explicitly classified as conceptual rather than simulated hardware behavior.
- CI warnings: Node `punycode` deprecation and Node 20 action-runtime deprecation warning; neither failed the workflows.
- No deployment was triggered; the published site was not checked against this commit.

The mission remains in progress. Passing automated suites is evidence for the tested software paths, not proof of exhaustive 8086 hardware equivalence or complete manual pedagogical certification.


### Audit report consistency regression

- Root cause found during the repeated verification: Markdown-only changes were intentionally excluded by `paths-ignore: "**/*.md"`, so the draft PR had no CI run. This was a skipped workflow, not a passing or failing test.
- Added `tests/audit-report-consistency.cjs` and wired it into CI. The test protects the 48-exercise inventory, the 384/684 individual certification ledger, the 300 pending reviews, and the distinction between automated oracle checks and independent certification.
- Renamed the question-oracle CI step to state explicitly that it is automated validation, not independent certification.
- This commit also changes a workflow file and a test file, so the pull-request path filters should now allow CI to run. The result must still be inspected before this tranche is marked validated.


### Independent question review — chapter 2

- Reviewed all 19 chapter 2 questions individually against the Intel 8086 Family User's Manual, the MCS-86 assembly reference, and independent arithmetic/control-flow traces.
- 18 items passed; one final-assessment item was corrected.
- Root cause: the ten final questions did not provide two syntax items. Replaced the previous factual queue-capacity item with a second syntax item using `ADD AX,3`; queue capacity remains covered by the lesson quiz.
- Reclassified the BIU/EU work-split item as a definition item so the final-assessment blueprint is explicit.
- Final assessment now contains exactly two definition, two syntax, two calculation/prediction, two program-analysis, and two reasoning/debug items.
- Updated runtime bank, semantic key, historical oracle, independent review record, and both oracle evaluators. Added assertions for category balance and runtime/key/oracle concordance.
- PR CI run [1789](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46025557122) passed; separate browser audit [1152](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46025557121) passed.
- The automated question-oracle suite reports 684/684 evaluator records passing. Official individual certification remains 384/684; 300 questions remain. This chapter review does not automatically advance that official ledger.


### Independent question review — chapter 3

- Reviewed all 19 questions individually; 16 passed and three were corrected.
- Removed a repeated binary conversion: L1-Q1 and L1-Q3 both asked for the value/weights of 1010₂. L1-Q3 now uses 1101₂, independently recalculated as 8+4+1=13.
- Removed a repeated hexadecimal conversion: L3-Q1 and L3-Q3 both asked for FFh/0FFh=255. L3-Q3 now tests the number of distinct patterns on eight bits: 2⁸=256.
- Improved C03-F-Q4 distractors. The incorrect options now represent realistic misunderstandings of hexadecimal notation and the AL/AX width distinction.
- Updated the runtime bank, semantic key and chapter-03 oracle batch. Added an independent `binary_pattern_count` evaluator and CI assertions for all 19 review records and the two removed repetitions.
- Official individual certification remains 384/684; 300 questions remain. The review does not advance the official ledger.


### Independent question review — chapter 4

- Reviewed all 19 questions individually; 18 passed and one final-assessment item was diversified.
- C04-F-Q8 previously reused the same `7Fh+1` scenario already used by the lesson quiz and another final item. It now tests `80h+80h`: unsigned 128+128=256 sets CF=1, while signed −128−128=−256 is outside the 8-bit signed range and sets OF=1.
- Updated the runtime bank, semantic key and chapter-04 oracle; the existing independent signed-add evaluator recalculates both flags.
- Added CI assertions for the complete 19-question review and the dual-CF/OF result.
- Official individual certification remains 384/684; 300 questions remain. This review does not advance the official ledger.


### Independent question review — chapter 5

- Reviewed all 19 questions individually against the Intel 8086 Family User's Manual and MCS-86 assembly reference.
- 16 items passed; three were corrected to remove repetition and cover distinct register semantics:
  - C05-F-Q4 now tests the invalid width mismatch in `MOV AX,AL` rather than repeating BP's default segment.
  - C05-F-Q7 now tests writing AH while preserving AL, complementing the lesson question that writes AL and preserves AH.
  - C05-F-Q9 now tests the MOVSB destination pair ES:DI rather than repeating the prohibition on MOV CS.
- Updated the runtime bank, semantic key and chapter-05 oracle batch. Added independent evaluators for operand-width compatibility, high-byte writes and the string destination index.
- Added CI assertions for all 19 review records and the three independent results.
- Official individual certification remains 384/684; 300 questions remain. This review does not advance the official ledger.


### Independent question review — chapter 6

- Reviewed all 19 questions individually against the Intel MCS-86 Assembly Language Reference Manual and Intel 8086 Family User's Manual.
- 16 items passed; three were diversified to remove repeated checks:
  - C06-L2-Q1 now asks for the source operand of MOV AX,BX, complementing the final question that asks for the destination.
  - C06-F-Q4 now tests the restriction on direct segment-register-to-segment-register MOV, distinct from the lesson's memory-to-memory restriction.
  - C06-F-Q7 now uses a complete labelled program trace; JMP FIN skips MOV AX,5678h and leaves AX=1234h at HLT.
- Updated runtime bank, semantic key and chapter-06 oracle batch. Added an independent evaluator for the segment-to-segment MOV restriction and assertions for the trace result.
- Official individual certification remains 384/684; 300 questions remain. This review does not advance the official ledger.


### Independent question review — chapter 7

- Reviewed all 19 questions individually against the Intel 8086 Family User's Manual and MCS-86 assembly reference.
- 16 items passed; three were corrected:
  - C07-L1-Q3 now tests a memory write using MOV [BX],AX rather than repeating LEA/MOV read semantics.
  - C07-F-Q6 now distinguishes the 16:16 far-pointer field order (offset then segment) from little-endian byte order within each word.
  - C07-F-Q10 now distinguishes MOV memory read from XCHG register/memory exchange rather than repeating another LEA/MOV comparison.
- Updated the runtime bank, semantic key and chapter-07 oracle batch. Added independent evaluators and CI assertions for memory-write and MOV/XCHG semantics.
- Official individual certification remains 384/684; 300 questions remain. This review does not advance the official ledger.


### Independent question review — chapter 8

- Reviewed all 19 questions individually against the Intel 8086 Family User's Manual and independent arithmetic traces.
- 15 items passed; four were corrected to reduce repeated examples and improve flag coverage:
  - C08-L1-Q3 now traces 12FFh + 1 across AL/AH using ADD then ADC, producing 1300h.
  - C08-L2-Q3 now tests SBB with an incoming borrow: 10h−1−1=0Eh.
  - C08-L3-Q3 now tests NEG 01h (FFh, CF=1, OF=0), distinct from the final NEG 80h overflow case.
  - C08-F-Q2 now tests the complete INC flag set: OF/SF/ZF/AF/PF updated, CF preserved.
- Updated runtime bank, semantic key and chapter-08 oracle batch; added independent evaluators and CI assertions for carry propagation and INC flag effects.
- Official individual certification remains 384/684; 300 questions remain. This review does not advance the official ledger.


### Independent question review — chapter 9

- Reviewed all 19 questions individually against the Intel 8086 Family User's Manual and independent bitwise calculations.
- 14 items passed; five were corrected to reduce repeated checks:
  - C09-L1-Q3 now calculates 08h OR 05h = 0Dh.
  - C09-L2-Q2 now tests the fact that NOT changes the operand but preserves FLAGS.
  - C09-F-Q4 now contrasts selective XOR toggling with global NOT inversion.
  - C09-F-Q6 now uses a distinct XOR calculation, 1110b XOR 1011b = 0101b, instead of repeating the AND calculation from L1-Q1.
  - C09-F-Q7 now uses a MOV/TEST trace to verify that AL remains A5h while TEST computes 05h for FLAGS.
- Updated runtime bank, semantic key and chapter-09 oracle batch; added independent evaluators and CI assertions for NOT flags and TEST destination preservation.
- Official individual certification remains 384/684; 300 questions remain. This review does not advance the official ledger.


### Independent question review — chapter 10

- Reviewed all 19 questions individually against the Intel 8086 Family User's Manual and MCS-86 assembly reference.
- 18 items passed; one oracle mismatch was corrected.
- C10-L3-Q2 described STC/PUSHF/CLC/POPF and expected CF=1, but its oracle used saved FLAGS=0200h, where CF=0. The oracle now uses 0201h, and a dedicated evaluator verifies both restored IF=1 and CF=1.
- Added `docs/question-independent-review/chapter-10.json` and CI assertions for the 19-question review and exact restored flags.
- Official individual certification remains 384/684; 300 questions remain. This review does not advance the official ledger.


### Independent question review — chapter 11

- Reviewed all 19 questions individually against the Intel 8086 Family User's Manual and independent execution traces.
- 16 items passed; three were corrected to avoid repeated checks and improve coverage:
  - C11-F-Q6 now combines signed overflow with INC's preservation of CF: 7FFFh+1 gives 8000h, OF=1, while CF remains 1.
  - C11-F-Q7 now traces a concrete not-taken JZ after CMP 1,2 (ZF=0).
  - C11-F-Q9 now tests the purpose of retaining regression cases after a correction.
- Added `docs/question-independent-review/chapter-11.json`, independent evaluators and CI assertions for all 19 questions and the three corrected cases.
- Official individual certification remains 384/684; 300 questions remain. This review does not advance the official ledger.


### Independent question review — chapter 12

- Reviewed all 19 questions individually against the Intel 8086 Family User's Manual and MCS-86 assembly reference.
- 13 items passed; six were corrected to reduce repeated questions and strengthen flag coverage:
  - C12-L1-Q3 now calculates ZF for 05h AND 04h.
  - C12-L2-Q3 now tests the opposite subtraction direction, 05h−03h=02h, without borrow.
  - C12-L3-Q1 now checks AF being undefined after TEST, while CF/OF are cleared.
  - C12-F-Q6 now tests a nonzero TEST result (80h AND 80h), distinct from the zero-result lesson case.
  - C12-F-Q7 now traces PF=1, CF=0 and OF=0 for TEST 03h,03h.
  - C12-F-Q9 now checks signed greater-or-equal (SF=OF), complementary to signed less (SF≠OF).
- Added independent evaluators and CI assertions for AF, parity and signed greater-or-equal.
- Official individual certification remains 384/684; 300 questions remain. This review does not advance the official ledger.


### Independent question review — chapter 13

- Reviewed all 19 questions individually against the Intel 8086 Family User's Manual and MCS-86 assembly reference.
- 12 items passed; seven were diversified to cover displacement calculations and distinct near/far encodings:
  - C13-L1-Q1 and C13-F-Q6 now calculate concrete backward rel8 displacements.
  - C13-L2-Q1 now checks the far-direct opcode EA ptr16:16 rather than repeating E9 rel16.
  - C13-L2-Q3 now calculates a concrete rel16 target from IP after instruction.
  - C13-F-Q5 traces the CS:IP state after JMP BX.
  - C13-F-Q7 checks FF /5 far-indirect, distinct from FF /4 near-indirect.
  - C13-F-Q10 distinguishes a 16-bit near offset from a far pointer that also supplies CS.
- Added independent evaluators for relative displacement, relative target, direct/indirect far JMP and near-register target state.
- Official individual certification remains 384/684; 300 questions remain. This review does not advance the official ledger.


### Independent question review — chapter 14

- Reviewed all 19 questions individually against the Intel 8086 Family User's Manual and MCS-86 condition-code reference.
- 14 items passed; five were diversified:
  - C14-L2-Q1 now tests JNO (OF=0), complementing JO (OF=1).
  - C14-F-Q4 and FQ5 now trace JBE and JA after concrete unsigned CMP operations.
  - C14-F-Q7 now traces JP after a parity-producing logical operation.
  - C14-F-Q8 now traces JO after 7Fh+1 produces signed overflow.
- Added independent evaluators and CI assertions for unsigned comparisons, parity branches and overflow branches.
- Official individual certification remains 384/684; 300 questions remain. This review does not advance the official ledger.


### Independent question review — chapter 15

- Reviewed all 19 questions individually against the Intel 8086 Family User's Manual and MCS-86 condition-code reference.
- 12 items passed; seven were diversified:
  - C15-L2-Q1 and FQ6 now test distinct signed boundary values (80h = −128; 7Fh = +127).
  - C15-L2-Q2 now tests JGE (SF=OF), complementing JL (SF≠OF).
  - C15-F-Q3 and FQ4 now test JAE and JLE, covering the complementary unsigned/signed inclusive conditions.
  - C15-F-Q7 and FQ8 now trace concrete unsigned and signed comparisons using the same FFh/01h bit patterns, proving their different interpretations.
- Added an independent signed comparison trace evaluator and CI assertions for both branch outcomes.
- Official individual certification remains 384/684; 300 questions remain. This review does not advance the official ledger.


### Independent question review — chapter 16

- Inspected all 19 questions in chapter 16 against the Intel 8086 Family User's Manual and the MCS-86 assembly reference.
- Initially found four repeated concepts across paired questions: LOOP's implicit counter, the LOOPE condition, JCXZ's preservation of CX, and the source of the ZF read by LOOPE.
- Corrected four questions in the runtime bank to test distinct aspects: LOOP operation order; the LOOPE boundary case where CX=1 becomes zero; JCXZ preservation of FLAGS; and CMP/TEST as producers of ZF.
- Aligned the runtime question bank, semantic key, chapter-16 oracle batch and independent evaluators. Added independent calculations for the decrement boundary and state preservation.
- Final individual review: 19/19 inspected, 15 passed, four corrected, zero blocked. CI checks the 19 unique IDs, corrected status and all oracle calculations.
- Official individual certification remains 384/684; 300 remain. This review does not advance the official ledger.


### CI correction — JAE/JLE oracle conditions

- The first run of this tranche exposed a pre-existing evaluator defect: the independent `jcc_condition` rule omitted JAE and JLE, so the chapter 15 oracle comparison failed despite the documented conditions being correct.
- Root cause: the evaluator's mnemonic-to-condition lookup table did not include those two valid 8086 condition mnemonics.
- Added the independent mappings `JAE → CF=0` and `JLE → ZF=1 || SF!=OF`. The chapter 15 oracle inputs and expected values were retained; no expected result was weakened.
- Follow-up CI run [1863](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46032333572) passed both jobs. Separate browser audit [1226](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46032333568) also passed.
- The chapter 16 inventory test passed. Its eight flagged question entries represent four repeated concepts; none is marked corrected until the runtime bank is actually revised.


### Chapter 16 correction verification

- CI [run 1869](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46033043857) passed both jobs after the four runtime question corrections and evaluator updates.
- Separate browser audit [run 1232](https://github.com/GLLR-Spirit/Intel-8086/actions/runs/46033043862) passed.
- The earlier first attempt failed only because the new review test still expected zero corrected items; the assertion was corrected to require four, matching the recorded source changes. The final run passed.


## Mise à jour — audit éditorial des exercices (2026-11-27)

- Première passe individuelle réalisée sur les 48 entrées : consigne, code de départ, correction, prédicat, difficulté/type et chapitres associés.
- Les 48 corrections passent toujours les comparaisons d'exécution source/binaire du CI ; cette preuve ne certifie pas l'alignement complet entre consigne et validateur.
- Écarts éditoriaux confirmés : EX35 encodage non contrôlé par le prédicat ; EX37 désassemblage demandé mais non évalué ; EX39 réponse conceptuelle non saisissable dans l'interface ; EX41 critère d'équilibre de pile incomplet ; EX47/EX48 sauvegarde de BX non démontrée par une valeur initiale non nulle ; EX46 invariants de retour d'interruption à renforcer. EX27 et EX33 contrôlent bien SP et la pile logique.
- Défaut de recherche confirmé : le champ promettait une recherche dans les instructions, mais n'indexait pas le programme de départ ni les explications guidées. Correction proposée sur la branche `audit/exercices-editorial-2026-11-27`.
- Test navigateur renforcé sur cette branche : 1 554 combinaisons des filtres chapitre/difficulté/type, recherche dans le code source, combinaison recherche + filtres et réinitialisation.
- Grille éditoriale détaillée et registre EX01–EX48 : `docs/exercise-editorial-audit-2026-11-27.md`.
- Statut : audit éditorial en cours ; aucun changement fusionné dans `main`, aucun déploiement.
