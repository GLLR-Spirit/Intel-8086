const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Inline application script must exist");
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, value: "", textContent: "", innerHTML: "", className: "",
    dataset: {}, onclick: null, oninput: null, onchange: null
  });
  return elements.get(id);
}
const injection = [
  "globalThis.__exerciseMethodBatch01 = { exercises, executeAll, executeBinary, assembleProgram, exerciseMethodSatisfied };",
  "})();"
].join("\n");
const instrumented = match[1].replace(/\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Application closure injection point must exist");
const context = {
  document: { getElementById: element, querySelectorAll: () => [] },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  console
};
vm.runInNewContext(instrumented, context, { timeout: 30000 });
const api = context.__exerciseMethodBatch01;
assert.ok(api, "Exercise method audit API must be exposed");

const cases = [
  ["Additionner deux nombres", "MOV AX,20\nMOV BX,8\nHLT"],
  ["Échanger deux valeurs", "MOV AX,9\nMOV BX,4\nHLT"],
  ["Somme répétée", "MOV AX,20\nMOV CX,0\nHLT"],
  ["Comparer deux valeurs", "MOV CX,1\nHLT"],
  ["Somme de 1 à 6", "MOV AX,21\nMOV CX,0\nHLT"],
  ["Architecture : transfert entre registres", "MOV AX,1234h\nMOV BX,1234h\nHLT"],
  ["Numération : addition en hexadécimal", "MOV AL,30h\nHLT"],
  ["Registres : modifier un octet", "MOV AX,1256h\nHLT"],
  ["MOV : respecter destination et source", "MOV AX,25\nMOV BX,25\nHLT"],
  ["Pile : vérifier PUSH et POP", "MOV BX,1234h\nHLT"]
];

for (const [position, [title, bypassSource]] of cases.entries()) {
  const index = api.exercises.findIndex(item => item[0] === title);
  assert.notEqual(index, -1, "EX" + String(position + 1).padStart(2, "0") + " must exist");
  const exercise = api.exercises[index];
  const solutionSource = exercise[4].solution;
  const solution = api.executeAll(solutionSource);
  assert.ok(!solution.error, title + " reference solution must execute: " + (solution.error || ""));
  assert.equal(exercise[3](solution), true, title + " reference solution result oracle");
  assert.equal(api.exerciseMethodSatisfied(index, solution), true, title + " reference solution must satisfy its method contract");

  const binary = api.executeBinary(api.assembleProgram(solutionSource).bytes, 0, 0, {});
  assert.ok(!binary.error, title + " binary reference solution must execute: " + (binary.error || ""));
  assert.equal(exercise[3](binary), true, title + " binary reference solution result oracle");
  // The binary executor currently exposes architectural state but not the source-level instructionTrace.
  // Method proof is therefore asserted on executeAll; binary execution remains an independent result oracle.

  const bypass = api.executeAll(bypassSource);
  assert.ok(!bypass.error, title + " bypass fixture must execute: " + (bypass.error || ""));
  assert.equal(exercise[3](bypass), true, title + " bypass must preserve the expected final result");
  assert.equal(api.exerciseMethodSatisfied(index, bypass), false,
    title + " must reject a result-equivalent solution that bypasses the requested method");

  const traceBypass = { ...solution, instructionTrace: solution.instructionTrace.slice(1) };
  assert.equal(api.exerciseMethodSatisfied(index, traceBypass), false,
    title + " must reject a reference final state when the required trace is removed");
}
console.log("Independent exercise-method batch 01: EX01–EX10 reference solutions pass; 10/10 result-equivalent bypasses rejected; source and binary paths checked.");
