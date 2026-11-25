const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Inline application script must exist");

const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    elements.set(id, {
      id, value: "", textContent: "", innerHTML: "", className: "",
      dataset: {}, onclick: null, oninput: null, onchange: null
    });
  }
  return elements.get(id);
}
const document = { getElementById: element, querySelectorAll: () => [] };
const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const context = { document, localStorage, console, confirm: () => true };
const instrumented = match[1].replace(/\}\)\(\);\s*$/, "globalThis.__learningData = { lessons, chapterLearning, curriculum, exercises, chapterExerciseMap, executeAll };\n})();");
assert.notEqual(instrumented, match[1], "Application closure must be instrumented for learning checks");
vm.runInNewContext(instrumented, context, { timeout: 5000 });
const learning = context.__learningData;
assert.ok(learning, "Learning data must be exposed to the isolated test harness");
assert.match(match[1], /function annotateAssembly\(/, "Course examples must receive instruction-level annotations");
assert.match(match[1], /function courseVisual\(/, "The course must include chapter-specific visualizations");
assert.match(match[1], /courseVisual\(i\)/, "Chapter visualizations must be rendered in the lesson view");
assert.match(match[1], /id='toggleAX'/, "The register chapter must expose an interactive AX/AH/AL explanation");

assert.equal(learning.lessons.length, 36, "All 36 learning chapters must exist");
assert.equal(learning.curriculum.length, 36, "The canonical curriculum must contain 36 chapters");
assert.equal(learning.chapterLearning.length, 36, "Every chapter must have a learning module");
assert.ok(learning.chapterLearning.every(c => c.goal && c.theory && c.walk && c.prereq && c.lessons.length === 3 && c.quiz.length === 10),
  "Every chapter must include prerequisites, objectives, three detailed lessons and ten final questions");
assert.ok(learning.chapterLearning.every(c => c.lessons.every(l => l.title && l.theory && l.example && l.expected && l.quiz.length === 3)),
  "Every lesson must include detailed content, an example and exactly three comprehension questions");
assert.ok(learning.chapterLearning.every(c => c.quiz.every(q => q[1].length === 3 && q[2] >= 0 && q[2] < 3 && q[3])),
  "Every final question must have three choices, a valid answer and an explanation");
const weakFinalQuestions = [];
learning.chapterLearning.forEach((c, ci) => c.quiz.forEach((q, qi) => {
  if (!(q[1].every(choice => typeof choice === "string" && choice.trim().length > 0) &&
    new Set(q[1].map(choice => choice.trim().toLocaleLowerCase())).size === 3 &&
    typeof q[3] === "string" && q[3].trim().length >= 12)) {
    weakFinalQuestions.push({chapter:ci+1,question:qi+1,stem:q[0],choices:q[1],explanation:q[3]});
  }
}));
if (weakFinalQuestions.length) console.log("Final question quality findings: " + JSON.stringify(weakFinalQuestions));
assert.equal(weakFinalQuestions.length, 0, "Final questions must have three distinct non-empty choices and a substantive explanation.");
assert.ok(learning.chapterLearning.every(c => c.lessons.every(l => l.quiz.every(q =>
  q[1].length === 3 && new Set(q[1].map(choice => String(choice).trim().toLocaleLowerCase())).size === 3 &&
  typeof q[3] === "string" && q[3].trim().length >= 12))),
  "Lesson questions must have distinct choices and a substantive explanation.");
assert.ok(learning.chapterLearning.every(c => {
  const categories = c.quiz.map(q => q[4]);
  return ["Définition","Compréhension","Syntaxe","Restrictions","Prédiction","Calcul / prédiction","Analyse de programme","Analyse de résultat","Débogage","Raisonnement"].every(x => categories.includes(x));
}), "Each final assessment must cover the ten required evaluation dimensions");
assert.ok(learning.chapterLearning.every(c => new Set(c.quiz.map(q => q[2])).size > 1),
  "Correct answer positions must vary across each final assessment");
assert.ok(learning.chapterLearning.every(c => c.lessons.every(l => new Set(l.quiz.map(q => q[2])).size > 1)),
  "Correct answer positions must vary across each lesson quiz");
assert.deepEqual(
  [learning.curriculum.slice(0,5),learning.curriculum.slice(5,11),learning.curriculum.slice(11,17),
   learning.curriculum.slice(17,23),learning.curriculum.slice(23,30),learning.curriculum.slice(30,36)]
   .map(group => group.every(c => c[1] === group[0][1])),
  [true,true,true,true,true,true],
  "All six levels must retain their exact requested chapter boundaries"
);
assert.equal(learning.chapterLearning.reduce((n, c) => n + c.lessons.reduce((m, l) => m + l.quiz.length, 0), 0), 324,
  "The 36 chapters must contain 324 intermediate questions (3 × 3 × 36)");
assert.equal(learning.chapterLearning.reduce((n, c) => n + c.quiz.length, 0), 360,
  "The 36 chapters must contain 360 final assessment questions (10 × 36)");
const expectedLevels = [1, 6, 12, 18, 24, 31];
assert.deepEqual(expectedLevels.map(n => learning.curriculum[n - 1][0]), [
  "Introduction au microprocesseur Intel 8086", "Premiers programmes assembleur", "Comparaison des données",
  "Organisation de la mémoire", "Multiplication", "Encodage des instructions"
], "The curriculum must preserve the requested chapter order and level boundaries");

assert.equal(learning.chapterExerciseMap.length, learning.lessons.length,
  "Every chapter must link to exactly one practical exercise");
assert.ok(learning.chapterExerciseMap.every(i => Number.isInteger(i) && i >= 0 && i < learning.exercises.length),
  "Every chapter exercise link must resolve to an existing exercise");
assert.ok(learning.exercises.length >= 25, "The exercise bank must contain at least 19 exercises");

for (let i = 0; i < learning.exercises.length; i++) {
  const exercise = learning.exercises[i];
  const guide = exercise[4];
  assert.ok(guide?.level && guide?.hint && guide?.steps?.length >= 3 && guide?.solution,
    "Exercise " + i + " must provide a level, hint, correction steps and a complete solution");
  const state = learning.executeAll(guide.solution);
  assert.ok(!state.error, exercise[0] + " correction must execute: " + state.error);
  assert.ok(exercise[3](state), exercise[0] + " correction must satisfy its validator; state=" +
    JSON.stringify(state.reg) + "; flags=" + JSON.stringify(state.flags));
}
const renderer = match[1].slice(match[1].indexOf("function renderExercises()"), match[1].indexOf("\nfunction renderProjects()"));
assert.ok(renderer.includes("Indice et correction expliquée"), "Exercise UI must expose progressive guidance");
assert.ok(renderer.includes("guide.steps"), "Exercise UI must render step-by-step solutions");
assert.ok(renderer.includes("data-solution"), "Exercise UI must let the learner load the complete correction");

// First-pass executable audit of every course example. This reports discrepancies
// without claiming that successful execution proves architectural correctness.
const exampleAudit = [];
for (let chapterIndex = 0; chapterIndex < learning.curriculum.length; chapterIndex++) {
  const chapter = learning.curriculum[chapterIndex];
  for (let lessonIndex = 0; lessonIndex < chapter[5].length; lessonIndex++) {
    const lesson = chapter[5][lessonIndex];
    const state = learning.executeAll(lesson[2]);
    if (state.error) {
      exampleAudit.push({
        chapter: chapterIndex + 1,
        lesson: lessonIndex + 1,
        title: lesson[0],
        error: state.error
      });
    }
  }
}
console.log("Course example execution audit: " +
  (108 - exampleAudit.length) + "/108 execute without simulator errors.");
if (exampleAudit.length) console.log(JSON.stringify(exampleAudit, null, 2));
assert.equal(exampleAudit.length, 0, "All 108 course examples must execute without simulator errors.");

// Architectural-result spot checks: successful execution alone is not enough.
const exampleOracles = [
  { chapter: 1, lesson: 1, check: state => state.reg.AX === 0x1234, expected: "AX=1234h" },
  { chapter: 2, lesson: 1, check: state => state.reg.AX === 7, expected: "AX=0007h after EU arithmetic example" },
  { chapter: 5, lesson: 1, check: state => state.reg.AX === 0x1256, expected: "AX=1256h after writing AL" },
  { chapter: 8, lesson: 1, check: state => (state.reg.AX & 0xff) === 0 && state.flags.CF === 0 && (state.reg.BX & 0xff) === 2,
    expected: "ADD/ADC carry propagation: AL=00h, CF=1, BL=02h" },
  { chapter: 13, lesson: 3, check: state => state.reg.AX === 9 && state.reg.BX === 8,
    expected: "indirect near jump reaches offset 0008h and leaves AX=0009h" },
  { chapter: 25, lesson: 3, check: state => state.reg.AX === 0x00ff,
    expected: "DIV 00FFh by 1 gives quotient AL=FFh and remainder AH=00h" }
];
for (const oracle of exampleOracles) {
  const source = learning.curriculum[oracle.chapter - 1][5][oracle.lesson - 1][2];
  const state = learning.executeAll(source);
  assert.ok(!state.error && oracle.check(state),
    "Chapter " + oracle.chapter + ", lesson " + oracle.lesson + " must produce " + oracle.expected +
    "; actual=" + JSON.stringify(state.reg) + "; flags=" + JSON.stringify(state.flags));
}

// Full state oracles for all 15 foundational examples (chapters 1–5).
const foundationalExampleOracles = [
  [1,1, state => state.reg.AX === 0x1234, "AX=1234h"],
  [1,2, state => state.steps === 1, "theoretical bus-capacity lesson remains a comment plus HLT, not a fabricated CPU calculation"],
  [1,3, state => state.reg.AX === 0x8086, "AX=8086h"],
  [2,1, state => state.reg.AX === 7, "AX=0007h"],
  [2,2, state => state.reg.DS === 0x1000, "DS=1000h"],
  [2,3, state => state.reg.AX === 1, "AX remains 0001h because the jump skips MOV AX,2"],
  [3,1, state => state.reg.AX === 10, "AX=000Ah"],
  [3,2, state => state.reg.AL === 0x2a, "AL=2Ah"],
  [3,3, state => state.reg.AX === 0xff, "AX=00FFh"],
  [4,1, state => state.reg.AX === 0x1234 && state.mem[0x100] === 0x34 && state.mem[0x101] === 0x12,
    "AX=1234h and little-endian bytes 34h at 0100h, 12h at 0101h"],
  [4,2, state => state.reg.AL === 0 && state.flags.CF === 1 && state.flags.ZF === 1 && state.flags.OF === 0,
    "AL=00h, CF=1, ZF=1, OF=0 after unsigned FFh+1"],
  [4,3, state => state.reg.AL === 0x80 && state.flags.OF === 1 && state.flags.CF === 0 && state.flags.SF === 1,
    "AL=80h, OF=1, CF=0, SF=1 after signed 7Fh+1"],
  [5,1, state => state.reg.AX === 0x1256, "AX=1256h"],
  [5,2, state => state.reg.SI === 0x100 && state.reg.DI === 0x200 && state.reg.BP === 0x300 && state.reg.SP === 0x400,
    "SI=0100h, DI=0200h, BP=0300h, SP=0400h"],
  [5,3, state => state.reg.DS === 0x1000, "DS=1000h"]
];
for (const [chapter, lesson, check, expected] of foundationalExampleOracles) {
  const source = learning.curriculum[chapter - 1][5][lesson - 1][2];
  const state = learning.executeAll(source);
  assert.ok(!state.error && check(state),
    "Foundational example C" + chapter + "L" + lesson + " expected " + expected +
    "; actual registers=" + JSON.stringify(state.reg) + "; memory=" + JSON.stringify(state.mem) +
    "; flags=" + JSON.stringify(state.flags));
}
for (let chapterIndex = 0; chapterIndex < 5; chapterIndex++) {
  const chapter = learning.chapterLearning[chapterIndex];
  assert.equal(chapter.quiz.length, 10, "Foundational chapter must retain ten final questions.");
  assert.deepEqual(chapter.quiz.map(q => q[4]), [
    "Définition","Compréhension","Syntaxe","Restrictions","Prédiction",
    "Calcul / prédiction","Analyse de programme","Analyse de résultat","Débogage","Raisonnement"
  ], "Foundational final assessment must use the ten audited categories in order.");
  assert.ok(chapter.lessons.every(lesson => lesson.quiz.length === 3),
    "Each foundational lesson must retain exactly three questions.");
}

// Detect exact duplicate final-question stems inside a chapter and collisions
// between a lesson check and its chapter assessment.
for (let chapterIndex = 0; chapterIndex < learning.chapterLearning.length; chapterIndex++) {
  const chapter = learning.chapterLearning[chapterIndex];
  const finalStems = chapter.quiz.map(q => String(q[0]).trim().toLocaleLowerCase());
  assert.equal(new Set(finalStems).size, finalStems.length,
    "Chapter " + (chapterIndex + 1) + " contains duplicate final-question stems.");
  const finalSet = new Set(finalStems);
  for (let lessonIndex = 0; lessonIndex < chapter.lessons.length; lessonIndex++) {
    for (const question of chapter.lessons[lessonIndex].quiz) {
      assert.ok(!finalSet.has(String(question[0]).trim().toLocaleLowerCase()),
        "Chapter " + (chapterIndex + 1) + " repeats a lesson question in its final assessment.");
    }
  }
}

console.log("Learning quality: 36 chapters, 324 intermediate questions, 360 final questions, " +
  learning.exercises.length + " exercises; all guided corrections execute and pass their validators.");
