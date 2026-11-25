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
const instrumented = match[1].replace(/\}\)\(\);\s*$/, "globalThis.__learningData = { lessons, chapterLearning, exercises, chapterExerciseMap, executeAll };\n})();");
assert.notEqual(instrumented, match[1], "Application closure must be instrumented for learning checks");
vm.runInNewContext(instrumented, context, { timeout: 5000 });
const learning = context.__learningData;
assert.ok(learning, "Learning data must be exposed to the isolated test harness");

assert.equal(learning.lessons.length, 17, "All 17 learning chapters must exist");
assert.equal(learning.chapterLearning.length, 17, "Every chapter must have a learning module");
assert.ok(learning.chapterLearning.every(c => c.goal && c.theory && c.walk && c.quiz.length >= 2),
  "Every chapter must include objectives, theory, a guided example and comprehension questions");
assert.equal(learning.chapterLearning.reduce((n, c) => n + c.quiz.length, 0), 34,
  "The chapter path must contain 34 comprehension questions");

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

console.log("Learning quality: 17 chapters, 34 comprehension questions, " +
  learning.exercises.length + " exercises; all guided corrections execute and pass their validators.");
