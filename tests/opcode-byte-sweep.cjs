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
vm.createContext(context);
const injected = "\nglobalThis.__8086OpcodeSweep = { disassemble: bytes => disassembleBytes(bytes) };\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injected);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 30000 });
const disassemble = context.__8086OpcodeSweep.disassemble;

let passed = 0;
function verifyStream(bytes, label) {
  const decoded = disassemble(bytes);
  assert.ok(decoded && Array.isArray(decoded.rows), label + ": decoder result contract");
  assert.equal(decoded.size, bytes.length, label + ": input size");
  let nextOffset = 0;
  for (const row of decoded.rows) {
    assert.equal(row.offset, nextOffset, label + ": contiguous row offset");
    assert.ok(Number.isInteger(row.size) && row.size > 0, label + ": positive instruction/data size");
    assert.equal(row.bytes.length, row.size, label + ": row byte count");
    nextOffset += row.size;
  }
  assert.equal(nextOffset, bytes.length, label + ": all bytes consumed exactly once");
  passed++;
}

// Structural sweep: every possible primary opcode is decoded in a bounded,
// padded stream. This detects crashes, zero-length rows, skipped bytes and
// over-consumption; it does NOT claim that the decoded mnemonic is correct.
for (let opcode = 0; opcode < 256; opcode++) {
  verifyStream([opcode, ...Array(256).fill(0x90)], "primary opcode " + opcode.toString(16).padStart(2, "0"));
}

// Exhaust every ModR/M byte for every original-8086 opcode family whose
// decoder consumes ModR/M. Padded immediate/displacement bytes keep the
// test focused on ModR/M parsing and row boundaries.
const modrmFamilies = [
  0x00,0x01,0x02,0x03, 0x08,0x09,0x0a,0x0b,
  0x10,0x11,0x12,0x13, 0x18,0x19,0x1a,0x1b,
  0x20,0x21,0x22,0x23, 0x28,0x29,0x2a,0x2b,
  0x30,0x31,0x32,0x33, 0x38,0x39,0x3a,0x3b,
  0x80,0x81,0x83, 0x84,0x85,0x86,0x87,
  0x88,0x89,0x8a,0x8b,0x8c,0x8d,0x8e,0x8f,
  0xc4,0xc5,0xc6,0xc7,
  0xd0,0xd1,0xd2,0xd3,
  0xd8,0xd9,0xda,0xdb,0xdc,0xdd,0xde,0xdf,
  0xf6,0xf7,0xfe,0xff
];
for (const opcode of modrmFamilies) {
  for (let modrm = 0; modrm < 256; modrm++) {
    verifyStream([opcode, modrm, ...Array(32).fill(0x90)],
      "ModR/M opcode " + opcode.toString(16).padStart(2, "0") +
      " byte " + modrm.toString(16).padStart(2, "0"));
  }
}

console.log("Balayage structurel des opcodes primaires : 256/256.");
console.log("Balayage structurel ModR/M : " + (modrmFamilies.length * 256) + " combinaisons.");
console.log("Contrôles de frontières de flux : " + passed + " réussis, 0 échec.");
console.log("Important : ces balayages vérifient la robustesse et la consommation des octets, pas la conformité sémantique de chaque opcode.");
