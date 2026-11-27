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
  " curriculum, exercises, exerciseMetadata, executeAll, executeBinary, assembleProgram, parseProgram, disassembleBytes",
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
console.log("EX35 exact encoding oracle and EX37 disassembly-boundary oracle PASS.");

console.log("Course and exercise source/binary differential audit PASS: 108 examples + 48 corrections.");
