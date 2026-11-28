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
  "globalThis.__exerciseMethodBatch04 = { exercises, executeAll, exerciseMethodSatisfied, exerciseAdditionalOracle };",
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
const api = context.__exerciseMethodBatch04;
assert.ok(api, "Exercise method audit API must be exposed");

const cases = [
  ["DIV : quotient et reste sur 8 bits", "MOV AX,0208h\nMOV BL,5\nHLT"],
  ["Décalage : SHR et retenue", "MOV AL,40h\nSTC\nHLT"],
  ["Interruption logicielle : INT et IRET", "MOV AX,1234h\nHLT", true],
  ["Entrée-sortie : lire un port", "PORT 20h,55h\nMOV DX,20h\nMOV AL,55h\nHLT"],
  ["Encodage : vérifier MOV immédiat", "MOV BX,1234h\nMOV AX,BX\nHLT", true],
  ["ModR/M : écrire puis relire une donnée", "MOV BX,0100h\nMOV SI,2\nMOV WORD PTR [0106h],ABCDh\nMOV AX,WORD PTR [0106h]\nHLT"],
  ["Assembleur et désassembleur : branchement symbolique", "MOV AX,1234h\nHLT", true],
  ["Préfixe de segment : distinguer DS et ES", "MOV AX,1000h\nMOV DS,AX\nMOV AX,2000h\nMOV ES,AX\nMOV BX,0100h\nMOV BYTE PTR [BX],11h\nMOV BYTE PTR ES:[BX],22h\nMOV AX,2211h\nHLT"],
  ["Optimisation : préserver le résultat et reconnaître les limites", "MOV AX,8\nHLT"],
  ["Projet de synthèse : somme d'un tableau en mémoire", "MOV AX,1000h\nMOV DS,AX\nMOV AX,9\nMOV CX,0\nMOV WORD PTR [0200h],9\nHLT"]
];

for (const [position, [title, bypassSource, hasAdditionalOracle]] of cases.entries()) {
  const index = api.exercises.findIndex(item => item[0] === title);
  assert.notEqual(index, -1, "EX" + String(position + 31).padStart(2, "0") + " must exist");
  const exercise = api.exercises[index];
  const referenceSource = exercise[4].solution;
  const reference = api.executeAll(referenceSource);
  assert.ok(!reference.error, title + " reference solution must execute: " + (reference.error || ""));
  assert.equal(exercise[3](reference), true, title + " reference result oracle");
  assert.equal(api.exerciseMethodSatisfied(index, reference), true, title + " reference method contract");
  if (hasAdditionalOracle) {
    assert.equal(api.exerciseAdditionalOracle(index, reference, referenceSource), true,
      title + " independent encoding/disassembly/interrupt oracle");
  }

  const bypass = api.executeAll(bypassSource);
  assert.ok(!bypass.error, title + " bypass must execute: " + (bypass.error || ""));
  assert.equal(exercise[3](bypass), true, title + " bypass must preserve the final result");
  assert.equal(api.exerciseMethodSatisfied(index, bypass), false,
    title + " must reject a result-equivalent method bypass");
  if (hasAdditionalOracle) {
    assert.equal(api.exerciseAdditionalOracle(index, bypass, bypassSource), false,
      title + " must reject the bypass with its independent oracle");
  }
}
console.log("Exercise method batch 4 PASS: EX31–EX40 reference methods accepted; 10/10 result-equivalent bypasses rejected; EX33/EX35/EX37 independent oracles checked.");
