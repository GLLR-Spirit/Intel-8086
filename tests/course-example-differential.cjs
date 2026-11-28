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
const context = {
  document: { getElementById: element, querySelectorAll: () => [] },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  console
};
const injection = [
  "globalThis.__courseDifferentialApi = {",
  " curriculum, exercises, exerciseMetadata, executeAll, executeBinary, assembleProgram, parseProgram, disassembleBytes, exerciseMethodSatisfied",
  "};",
  "})();"
].join("\n");
const instrumented = match[1].replace(/\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Application closure injection point must exist");
vm.runInNewContext(instrumented, context, { timeout: 30000 });
const api = context.__courseDifferentialApi;
assert.ok(api, "Course differential API must be exposed");

const oracleFile = JSON.parse(fs.readFileSync("docs/course-example-oracles-8086.json", "utf8"));
assert.equal(oracleFile.schema, "intel-8086-course-example-oracles-v1");
assert.equal(oracleFile.examples.length, 108, "The independent oracle must cover all 108 lessons");

function plain(value) { return JSON.parse(JSON.stringify(value)); }

function exerciseByTitle(title) {
  const index = api.exercises.findIndex(entry => entry[0] === title);
  assert.notEqual(index, -1, "Missing exercise: " + title);
  return { index, exercise: api.exercises[index] };
}
for (const spec of [
  {
    title: "Procédure : CALL et RET near",
    bypass: "MOV AX, 10\nHLT"
  },
  {
    title: "Paramètre sur pile : lire avec BP",
    bypass: "MOV AX, 10\nHLT"
  },
  {
    title: "Programmation modulaire : deux routines",
    bypass: "MOV AX, 14\nHLT"
  }
]) {
  const { index, exercise } = exerciseByTitle(spec.title);
  const solution = api.executeAll(exercise[4].solution);
  assert.ok(!solution.error, spec.title + " reference solution must execute: " + (solution.error || ""));
  assert.equal(exercise[3](solution), true, spec.title + " reference result oracle");
  assert.equal(api.exerciseMethodSatisfied(index, solution), true, spec.title + " required executed method");
  const bypass = api.executeAll(spec.bypass);
  assert.ok(!bypass.error, spec.title + " bypass fixture must execute");
  assert.equal(exercise[3](bypass), true, spec.title + " demonstrates the old result-only false positive");
  assert.equal(api.exerciseMethodSatisfied(index, bypass), false,
    spec.title + " must reject a fabricated result that skips the requested procedure/stack method");
}
console.log("CALL/RET, BP+4/RET 2 and modular-routine method gates reject result-only bypasses.");

// Lot 1 — contrôles indépendants des méthodes obligatoires EX01–EX10.
const firstTenMethodCases = [
  { title: "Additionner deux nombres", bypass: "MOV AX, 20\nHLT" },
  { title: "Échanger deux valeurs", bypass: "MOV AX, 9\nMOV BX, 4\nHLT" },
  { title: "Somme répétée", bypass: "MOV AX, 20\nMOV CX, 0\nHLT" },
  { title: "Comparer deux valeurs", bypass: "MOV CX, 1\nHLT" },
  { title: "Somme de 1 à 6", bypass: "MOV AX, 21\nMOV CX, 0\nHLT" },
  { title: "Architecture : transfert entre registres", bypass: "MOV AX, 1234h\nMOV BX, 1234h\nHLT" },
  { title: "Numération : addition en hexadécimal", bypass: "MOV AL, 30h\nHLT" },
  { title: "Registres : modifier un octet", bypass: "MOV AX, 1256h\nHLT" },
  { title: "MOV : respecter destination et source", bypass: "MOV AX, 25\nMOV BX, 25\nHLT" },
  { title: "Pile : vérifier PUSH et POP", bypass: "MOV BX, 1234h\nHLT" }
];
assert.equal(firstTenMethodCases.length, 10, "Batch 1 must cover exactly ten exercises");
for (const spec of firstTenMethodCases) {
  const { index, exercise } = exerciseByTitle(spec.title);
  const reference = api.executeAll(exercise[4].solution);
  assert.ok(!reference.error, spec.title + " reference solution must execute");
  assert.equal(exercise[3](reference), true, spec.title + " reference result oracle");
  assert.equal(api.exerciseMethodSatisfied(index, reference), true, spec.title + " ordered method contract");

  const bypass = api.executeAll(spec.bypass);
  assert.ok(!bypass.error, spec.title + " result-only bypass must execute");
  assert.equal(exercise[3](bypass), true, spec.title + " bypass must preserve the expected final result");
  assert.equal(api.exerciseMethodSatisfied(index, bypass), false,
    spec.title + " must reject a result-only bypass that omits the required method");
}

// EX04 accepts a different valid conditional-branch form; the contract must not
// overfit the reference solution's JE mnemonic or label.
const compareAlternative = api.executeAll([
  "MOV AX, 15", "MOV BX, 15", "CMP AX, BX", "JNE DIFFERENT",
  "MOV CX, 1", "HLT", "DIFFERENT:", "MOV CX, 0", "HLT"
].join("\n"));
const compareAlternativeExercise = exerciseByTitle("Comparer deux valeurs");
assert.ok(!compareAlternative.error, "EX04 alternative conditional solution must execute");
assert.equal(compareAlternativeExercise.exercise[3](compareAlternative), true,
  "EX04 alternative conditional solution must preserve the result");
assert.equal(api.exerciseMethodSatisfied(compareAlternativeExercise.index, compareAlternative), true,
  "EX04 must accept an equivalent JNE implementation");

const compareIrrelevantBranch = api.executeAll([
  "MOV AX, 15", "MOV BX, 15", "CMP AX, BX", "JA SKIP",
  "MOV CX, 1", "HLT", "SKIP:", "MOV CX, 0", "HLT"
].join("\n"));
assert.ok(!compareIrrelevantBranch.error, "EX04 irrelevant-branch bypass must execute");
assert.equal(compareAlternativeExercise.exercise[3](compareIrrelevantBranch), true,
  "EX04 irrelevant-branch bypass must preserve the expected result");
assert.equal(api.exerciseMethodSatisfied(compareAlternativeExercise.index, compareIrrelevantBranch), false,
  "EX04 must reject an unsigned branch that does not test equality");

console.log("Exercise method batch 1 PASS: 10/10 reference methods accepted; 10/10 result-only bypasses rejected; EX04 JNE alternative accepted and irrelevant JA rejected.");

// Lot 2 — contrôles indépendants des méthodes obligatoires EX11–EX20.
const secondTenMethodCases = [
  { title: "Logique : appliquer un masque AND", bypass: "MOV AL, 0Ch\nHLT" },
  { title: "Segments : initialiser DS", bypass: "MOV AX, 1000h\nPUSH AX\nPOP DS\nMOV BX, 0010h\nHLT" },
  { title: "Soustraction et résultat nul", bypass: "MOV AX, 16\nHLT" },
  { title: "Branchement signé", bypass: "MOV CX, 1\nHLT" },
  { title: "Boucle : somme de 1 à 4", bypass: "MOV AX, 10\nMOV CX, 0\nHLT" },
  { title: "Pile : ordre LIFO", bypass: "MOV CX, 2222h\nMOV DX, 1111h\nHLT" },
  { title: "XOR : basculer des bits", bypass: "MOV AL, 5Ah\nHLT" },
  { title: "Segments : initialiser SS et BP", bypass: [
    "MOV AX, 2000h", "PUSH AX", "POP SS", "MOV BP, 0010h",
    "MOV AX, 2000h", "MOV DS, AX", "MOV WORD PTR [0010h], 1234h",
    "MOV BX, WORD PTR [0010h]", "HLT"
  ].join("\n") },
  { title: "Débogage : suivre les deux chemins", bypass: "MOV DX, 1\nHLT" },
  { title: "Raisonnement : comparaison signée", bypass: "MOV DX, 1\nHLT" }
];
assert.equal(secondTenMethodCases.length, 10, "Batch 2 must cover exactly ten exercises");
for (const spec of secondTenMethodCases) {
  const { index, exercise } = exerciseByTitle(spec.title);
  const reference = api.executeAll(exercise[4].solution);
  assert.ok(!reference.error, spec.title + " reference solution must execute");
  assert.equal(exercise[3](reference), true, spec.title + " reference result oracle");
  assert.equal(api.exerciseMethodSatisfied(index, reference), true, spec.title + " ordered method contract");

  const bypass = api.executeAll(spec.bypass);
  assert.ok(!bypass.error, spec.title + " result-only bypass must execute");
  assert.equal(exercise[3](bypass), true, spec.title + " bypass must preserve the expected final result");
  assert.equal(api.exerciseMethodSatisfied(index, bypass), false,
    spec.title + " must reject a result-only bypass that omits the required method");
}

// EX20 accepts the opposite branch layout when it still uses a signed condition.
const signedAlternative = api.executeAll([
  "MOV AL, 7Fh", "MOV BL, 80h", "CMP AL, BL", "JLE NOT_GREATER",
  "MOV DX, 1", "HLT", "NOT_GREATER:", "MOV DX, 0", "HLT"
].join("\n"));
const signedAlternativeExercise = exerciseByTitle("Raisonnement : comparaison signée");
assert.ok(!signedAlternative.error, "EX20 signed JLE alternative must execute");
assert.equal(signedAlternativeExercise.exercise[3](signedAlternative), true,
  "EX20 signed JLE alternative must preserve the result");
assert.equal(api.exerciseMethodSatisfied(signedAlternativeExercise.index, signedAlternative), true,
  "EX20 must accept an equivalent signed JLE implementation");

console.log("Exercise method batch 2 PASS: 10/10 reference methods accepted; 10/10 result-only bypasses rejected; EX20 signed JLE alternative accepted.");

// Lot 3 — contrôles indépendants des méthodes obligatoires EX21–EX30.
const thirdTenMethodCases = [
  { title: "Programme à compléter : calculer le maximum", bypass: "MOV DX, 23\nHLT" },
  { title: "Débogage : corriger une boucle", bypass: [
    "MOV AX, 0", "MOV CX, 4", "BOUCLE:", "ADD AX, 3",
    "INC CX", "DEC CX", "LOOP BOUCLE", "HLT"
  ].join("\n") },
  { title: "Débogage : réparer l’ordre d’un échange", bypass: "MOV AX, 1234h\nMOV BX, 0ABCDh\nXCHG AX, BX\nHLT" },
  { title: "Problème complet : somme des nombres pairs", bypass: "MOV AX, 12\nMOV CX, 0\nHLT" },
  { title: "Défi expert : copie de mots en sens décroissant", bypass: [
    "MOV AX, 1000h", "MOV DS, AX", "MOV AX, 2000h", "MOV ES, AX",
    "MOV WORD PTR [0100h], 1234h", "MOV WORD PTR [0102h], 5678h",
    "MOV AX, 1234h", "MOV WORD PTR ES:[0200h], AX",
    "MOV AX, 5678h", "MOV WORD PTR ES:[0202h], AX",
    "MOV SI, 00FEh", "MOV DI, 01FEh", "CLD", "HLT"
  ].join("\n") },
  { title: "Saut direct : vérifier la cible", bypass: "MOV AX, 1\nMOV AX, 2\nMOV AX, 1\nSUITE:\nMOV BX, 3\nHLT" },
  { title: "Procédure : CALL et RET near", bypass: "MOV AX, 10\nHLT" },
  { title: "Paramètre sur pile : lire avec BP", bypass: "MOV AX, 10\nHLT" },
  { title: "Programmation modulaire : deux routines", bypass: "MOV AX, 14\nHLT" },
  { title: "MUL : produit non signé sur 8 bits", bypass: "MOV AX, 42\nHLT" }
];
assert.equal(thirdTenMethodCases.length, 10, "Batch 3 must cover exactly ten exercises");
for (const spec of thirdTenMethodCases) {
  const { index, exercise } = exerciseByTitle(spec.title);
  const reference = api.executeAll(exercise[4].solution);
  assert.ok(!reference.error, spec.title + " reference solution must execute");
  assert.equal(exercise[3](reference), true, spec.title + " reference result oracle");
  assert.equal(api.exerciseMethodSatisfied(index, reference), true, spec.title + " ordered method contract");

  const bypass = api.executeAll(spec.bypass);
  assert.ok(!bypass.error, spec.title + " result-only bypass must execute");
  assert.equal(exercise[3](bypass), true, spec.title + " bypass must preserve the expected final result");
  assert.equal(api.exerciseMethodSatisfied(index, bypass), false,
    spec.title + " must reject a result-only bypass that omits the required method");
}

// EX21's alternative maximum branch must also be accepted when AX > BX.
const maximumAlternative = api.executeAll([
  "MOV AX, 30", "MOV BX, 23", "CMP AX, BX", "JGE AX_MAX",
  "MOV DX, BX", "JMP FIN", "AX_MAX:", "MOV DX, AX", "FIN:", "HLT"
].join("\n"));
const maximumAlternativeExercise = exerciseByTitle("Programme à compléter : calculer le maximum");
assert.ok(!maximumAlternative.error, "EX21 alternative maximum path must execute");
assert.equal(maximumAlternative.reg.DX, 30,
  "EX21 alternative maximum path must return the larger AX value");
assert.equal(api.exerciseMethodSatisfied(maximumAlternativeExercise.index, maximumAlternative), true,
  "EX21 must accept the alternative AX-greater branch path");

console.log("Exercise method batch 3 PASS: 10/10 reference methods accepted; 10/10 result-only bypasses rejected; EX21 alternate maximum path accepted.");

function compareRecord(a, b, label) {
  assert.deepEqual(plain(a), plain(b), label);
}
function seedForBinary(source, assembled, parsed) {
  const mem = {};
  for (const [vectorText, label] of Object.entries(parsed.vectors || {})) {
    const vector = Number(vectorText);
    const offset = assembled.symbols[label];
    assert.ok(Number.isInteger(offset), "VECTOR " + vector + " target " + label + " must resolve in the assembled symbol table");
    const base = vector * 4;
    mem[String(base)] = offset & 255;
    mem[String(base + 1)] = (offset >>> 8) & 255;
    mem[String(base + 2)] = 0;
    mem[String(base + 3)] = 0;
  }
  return { io: assembled.ports || {}, mem };
}
function assertSameArchitecturalState(sourceState, binaryState, label, vectorAddresses) {
  assert.equal(sourceState.execution.mode, "binary-offset", label + " source execution must use assembled byte offsets");
  assert.equal(binaryState.execution.mode, "dynamic-binary", label + " binary execution must decode the emitted bytes");
  for (const register of Object.keys(sourceState.reg)) {
    assert.equal(binaryState.reg[register], sourceState.reg[register], label + " register " + register);
  }
  for (const flag of Object.keys(sourceState.flags)) {
    assert.equal(binaryState.flags[flag], sourceState.flags[flag], label + " FLAGS." + flag);
  }
  assert.equal(binaryState.steps, sourceState.steps, label + " instruction count");
  assert.equal(binaryState.output, sourceState.output, label + " output");
  compareRecord(binaryState.stack, sourceState.stack, label + " stack metadata");
  compareRecord(binaryState.io, sourceState.io, label + " I/O port state");

  // VECTOR is source-level metadata on the interpreter path. The binary path
  // receives the equivalent 4-byte IVT entries, so those setup bytes are
  // excluded from the post-execution memory parity comparison.
  const ignored = new Set(vectorAddresses.flatMap(base => [base, base + 1, base + 2, base + 3]));
  const addresses = new Set([
    ...Object.keys(sourceState.mem).map(Number),
    ...Object.keys(binaryState.mem).map(Number)
  ]);
  for (const address of addresses) {
    if (ignored.has(address)) continue;
    assert.equal(binaryState.mem[address], sourceState.mem[address],
      label + " memory[" + address.toString(16).toUpperCase() + "h]");
  }
}

function findRejectedValidatorMutation(state, validator) {
  function rejects(label, mutate) {
    const candidate = plain(state);
    mutate(candidate);
    try { return validator(candidate) === false ? label : null; }
    catch { return null; }
  }
  for (const [register, value] of Object.entries(state.reg || {})) {
    for (const replacement of [0, 1, 65535, (value ^ 65535) & 65535]) {
      if (replacement === value) continue;
      const result = rejects("reg." + register, candidate => { candidate.reg[register] = replacement; });
      if (result) return result;
    }
  }
  for (const [flag, value] of Object.entries(state.flags || {})) {
    const result = rejects("FLAGS." + flag, candidate => { candidate.flags[flag] = value ? 0 : 1; });
    if (result) return result;
  }
  for (const [address, value] of Object.entries(state.mem || {})) {
    for (const replacement of [0, 255, value ^ 255]) {
      if (replacement === value) continue;
      const result = rejects("memory[" + address + "]", candidate => { candidate.mem[address] = replacement; });
      if (result) return result;
    }
  }
  for (const [port, value] of Object.entries(state.io || {})) {
    for (const replacement of [0, 1, 65535, value ^ 65535]) {
      if (replacement === value) continue;
      const result = rejects("io[" + port + "]", candidate => { candidate.io[port] = replacement; });
      if (result) return result;
    }
  }
  for (const steps of [0, (state.steps || 0) + 10000]) {
    if (steps === state.steps) continue;
    const result = rejects("steps", candidate => { candidate.steps = steps; });
    if (result) return result;
  }
  for (const output of ["", "__INVALID_AUDIT_OUTPUT__"]) {
    if (output === state.output) continue;
    const result = rejects("output", candidate => { candidate.output = output; });
    if (result) return result;
  }
  const emptyStack = rejects("stack emptied", candidate => { candidate.stack = []; });
  if (emptyStack) return emptyStack;
  const alteredStack = rejects("stack altered", candidate => {
    if (candidate.stack.length) candidate.stack[0].value = (candidate.stack[0].value + 1) & 65535;
    else candidate.stack.push({ value: 1, kind: "audit", address: 0, segment: 0 });
  });
  if (alteredStack) return alteredStack;
  return null;
}

const failures = [];
let compared = 0;
let conceptual = 0;
const categoryCounts = { registers: 0, flags: 0, memory: 0, ports: 0, stackDepth: 0, steps: 0, bytes: 0, vectors: 0, portSeeds: 0 };

for (const oracle of oracleFile.examples) {
  const id = "C" + String(oracle.chapter).padStart(2, "0") + "-L" + String(oracle.lesson).padStart(2, "0");
  const lesson = api.curriculum[oracle.chapter - 1]?.[5]?.[oracle.lesson - 1];
  if (!lesson) {
    failures.push(id + ": missing curriculum lesson");
    continue;
  }
  const source = lesson[2];
  try {
    const parsed = api.parseProgram(source);
    const assembled = api.assembleProgram(source);
    const sourceState = api.executeAll(source);
    assert.ok(!sourceState.error, id + " source path: " + (sourceState.error || ""));
    const vectors = Object.keys(parsed.vectors || {}).map(Number);
    const initialState = seedForBinary(source, assembled, parsed);
    const binaryState = api.executeBinary(assembled.bytes, 0, 0, initialState);
    assert.ok(!binaryState.error, id + " binary path: " + (binaryState.error || ""));
    assertSameArchitecturalState(sourceState, binaryState, id, vectors.map(vector => vector * 4));

    for (const [register, expected] of Object.entries(oracle.registers || {})) {
      assert.equal(sourceState.reg[register], expected, id + " source oracle register " + register);
      assert.equal(binaryState.reg[register], expected, id + " binary oracle register " + register);
      categoryCounts.registers++;
    }
    for (const [flag, expected] of Object.entries(oracle.flags || {})) {
      assert.equal(sourceState.flags[flag], expected, id + " source oracle FLAGS." + flag);
      assert.equal(binaryState.flags[flag], expected, id + " binary oracle FLAGS." + flag);
      categoryCounts.flags++;
    }
    for (const [address, expected] of Object.entries(oracle.memory || {})) {
      assert.equal(sourceState.mem[address], expected, id + " source oracle memory[" + address + "]");
      assert.equal(binaryState.mem[address], expected, id + " binary oracle memory[" + address + "]");
      categoryCounts.memory++;
    }
    for (const [port, expected] of Object.entries(oracle.ports || {})) {
      assert.equal(sourceState.io[port], expected, id + " source oracle port " + port);
      assert.equal(binaryState.io[port], expected, id + " binary oracle port " + port);
      categoryCounts.ports++;
    }
    if (oracle.stackDepth !== undefined) {
      assert.equal(sourceState.stack.length, oracle.stackDepth, id + " source oracle stack depth");
      assert.equal(binaryState.stack.length, oracle.stackDepth, id + " binary oracle stack depth");
      categoryCounts.stackDepth++;
    }
    if (oracle.steps !== undefined) {
      assert.equal(sourceState.steps, oracle.steps, id + " source oracle instruction count");
      assert.equal(binaryState.steps, oracle.steps, id + " binary oracle instruction count");
      categoryCounts.steps++;
    }
    if (oracle.bytesPrefix) {
      const expected = oracle.bytesPrefix.split(" ").map(byte => parseInt(byte, 16));
      assert.deepEqual(Array.from(assembled.bytes.slice(0, expected.length)), expected, id + " encoding prefix");
      categoryCounts.bytes++;
    }
    for (const [offset, expected] of Object.entries(oracle.bytesAt || {})) {
      assert.equal(assembled.bytes[Number(offset)], parseInt(expected, 16), id + " encoding byte at " + offset);
      categoryCounts.bytes++;
    }
    if (oracle.kind === "conceptual") conceptual++;
    if (vectors.length) categoryCounts.vectors++;
    if (Object.keys(assembled.ports || {}).length) categoryCounts.portSeeds++;
    compared++;
  } catch (error) {
    failures.push(id + " (" + lesson[0] + "): " + error.message);
  }
}

console.log("Course source/binary differential: " + compared + "/108 examples compared; " + conceptual + " conceptual examples explicitly retained.");
console.log("Oracle dimensions: " + JSON.stringify(categoryCounts));
if (failures.length) console.error("Differential failures:\n" + failures.join("\n"));
assert.equal(compared, 108, "Every one of the 108 course examples must be compared.");
assert.deepEqual(failures, [], "Source/binary parity and independent course oracles must match for all 108 examples.");

const exerciseFailures = [];
let exercisesCompared = 0;
for (let index = 0; index < api.exercises.length; index++) {
  const exercise = api.exercises[index];
  const guide = exercise[4];
  const id = "EX" + String(index + 1).padStart(2, "0");
  try {
    assert.ok(guide && typeof guide.solution === "string" && guide.solution.trim(),
      id + " must expose its complete guided correction.");
    const parsed = api.parseProgram(guide.solution);
    const assembled = api.assembleProgram(guide.solution);
    const sourceState = api.executeAll(guide.solution);
    assert.ok(!sourceState.error, id + " source correction: " + (sourceState.error || ""));
    const binaryState = api.executeBinary(assembled.bytes, 0, 0,
      seedForBinary(guide.solution, assembled, parsed));
    assert.ok(!binaryState.error, id + " binary correction: " + (binaryState.error || ""));
    assertSameArchitecturalState(sourceState, binaryState, id, Object.keys(parsed.vectors || {}).map(Number).map(vector => vector * 4));
    assert.ok(exercise[3](sourceState), id + " source correction must satisfy its exercise validator.");
    assert.ok(exercise[3](binaryState), id + " binary correction must satisfy its exercise validator.");
    const rejectedField = findRejectedValidatorMutation(sourceState, exercise[3]);
    assert.ok(rejectedField, id + " validator must reject at least one deliberately corrupted architectural state.");
    exercisesCompared++;
  } catch (error) {
    exerciseFailures.push(id + " (" + exercise[0] + "): " + error.message);
  }
}
console.log("Guided correction source/binary differential: " + exercisesCompared + "/" + api.exercises.length + " solutions compared.");
if (exerciseFailures.length) console.error("Correction differential failures:\n" + exerciseFailures.join("\n"));
assert.equal(api.exercises.length, 48, "The exercise correction audit must cover all 48 exercises.");
assert.equal(exercisesCompared, 48, "Every guided correction must pass source/binary parity.");
assert.deepEqual(exerciseFailures, [], "All 48 source and binary corrections must agree and satisfy their validators.");

const encodingExercise = api.exercises[34];
assert.equal(encodingExercise[0], "Encodage : vérifier MOV immédiat", "EX35 identity must remain stable.");
const encodingSolution = encodingExercise[4].solution;
const encodingAssembly = api.assembleProgram(encodingSolution);
assert.deepEqual(Array.from(encodingAssembly.bytes), [0xB8,0x34,0x12,0xF4],
  "EX35 must independently verify the exact B8 34 12 F4 encoding, not only AX.");
const disassemblyExercise = api.exercises[36];
assert.equal(disassemblyExercise[0], "Assembleur et désassembleur : branchement symbolique", "EX37 identity must remain stable.");
const disassemblyAssembly = api.assembleProgram(disassemblyExercise[4].solution);
const disassembly = api.disassembleBytes(disassemblyAssembly.bytes);
assert.equal(disassembly.size, disassemblyAssembly.bytes.length, "EX37 disassembly must consume the complete byte stream.");
assert.deepEqual(disassembly.rows.map(row => row.offset), disassemblyAssembly.rows.map(row => row.offset),
  "EX37 disassembly must preserve every instruction boundary, including the skipped NOP.");
assert.deepEqual(disassembly.rows.map(row => row.bytes), disassemblyAssembly.rows.map(row => row.bytes),
  "EX37 disassembly must preserve each encoded instruction's byte span.");
assert.ok(disassembly.rows.some(row => /^JMP\b/.test(row.instruction)), "EX37 must decode its relative jump.");
assert.ok(disassembly.rows.some(row => row.instruction === "NOP"), "EX37 must decode the NOP on the skipped execution path.");
assert.ok(disassembly.rows.some(row => /^MOV AX, 1234h$/i.test(row.instruction)), "EX37 must decode MOV AX,1234h.");
const reverseCopyExercise = api.exercises[47];
assert.equal(reverseCopyExercise[0], "Intégration : parcours inverse et contrôle de mot", "EX48 identity must remain stable.");
const reverseCopyState = api.executeAll(reverseCopyExercise[4].solution);
assert.ok(!reverseCopyState.error, "EX48 reference solution must execute: " + (reverseCopyState.error || ""));
for (const [address, expected] of [[0x20200,0x78],[0x20201,0x56],[0x20202,0x34],[0x20203,0x12]]) {
  assert.equal(reverseCopyState.mem[address], expected,
    "EX48 must copy every byte of both words; destination address " + address.toString(16) + "h.");
  const corrupted = plain(reverseCopyState);
  corrupted.mem[address] ^= 0xFF;
  assert.equal(reverseCopyExercise[3](corrupted), false,
    "EX48 validator must reject corruption of destination byte " + address.toString(16) + "h.");
}
console.log("EX48 four-byte reverse-copy oracle and per-byte negative mutations PASS.");

console.log("EX35 exact encoding oracle and EX37 disassembly-boundary oracle PASS.");

console.log("Course and exercise source/binary differential audit PASS: 108 examples + 48 corrections.");
