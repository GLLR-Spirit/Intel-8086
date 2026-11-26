const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");

// Cross-check the project's encoder against GNU as in 16-bit mode.
// The expected fixed-byte slices are also asserted independently of both assemblers.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "8086-gnu-as-"));
try {
  const sourcePath = path.join(dir, "vectors.s");
  const objectPath = path.join(dir, "vectors.o");
  const binaryPath = path.join(dir, "vectors.bin");

  const program = [
    "MOV AX, 7", "MOV BX, 9", "CMP AX, BX", "CMP AL, 5",
    "JMP short_target", "NOP", "NOP", "short_target:", "JMP near_target",
    ...Array(130).fill("NOP"),
    "near_target:", "JMP BX",
    "JO c0", "JNO c1", "JB c2", "JAE c3", "JE c4", "JNE c5",
    "JBE c6", "JA c7", "JS c8", "JNS c9", "JP c10", "JNP c11",
    "JL c12", "JGE c13", "JLE c14", "JG c15",
    "LOOPNE c16", "LOOPE c17", "LOOP c18", "JCXZ c19",
    ...Array.from({ length: 20 }, (_, i) => `c${i}: NOP`)
  ].join("\n");

  const gnuSource = [
    ".intel_syntax noprefix",
    ".code16",
    ".text",
    ".global _start",
    "_start:",
    program,
    ""
  ].join("\n");

  fs.writeFileSync(sourcePath, gnuSource);
  execFileSync("as", ["--32", "-o", objectPath, sourcePath], { stdio: "pipe" });
  execFileSync("objcopy", ["-O", "binary", "-j", ".text", objectPath, binaryPath], {
    stdio: "pipe"
  });
  const gnuBytes = [...fs.readFileSync(binaryPath)];

  const html = fs.readFileSync("index.html", "utf8");
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, "Application script must exist");

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

  const context = {
    document: { getElementById: element, querySelectorAll: () => [] },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    console
  };
  vm.createContext(context);

  const instrumented = scriptMatch[1].replace(/\n\}\)\(\);\s*$/, `
globalThis.__8086CrosscheckApi = {
  assemble: source => assembleProgram(source)
};
})();
`);
  assert.notEqual(instrumented, scriptMatch[1], "Application test injection point must exist");
  vm.runInContext(instrumented, context, { timeout: 10000 });

  const appBytes = Array.from(context.__8086CrosscheckApi.assemble(program).bytes);
  assert.deepEqual(appBytes, gnuBytes,
    "Project assembler must match GNU as byte-for-byte for the cross-check program");

  const fixedPrefix = [
    0xB8, 0x07, 0x00, // MOV AX,7
    0xBB, 0x09, 0x00, // MOV BX,9
    0x39, 0xD8,       // CMP AX,BX
    0x3C, 0x05,       // CMP AL,5
    0xEB, 0x02,       // JMP short +2
    0x90, 0x90,
    0xE9, 0x82, 0x00  // JMP near +130
  ];
  assert.deepEqual(gnuBytes.slice(0, fixedPrefix.length), fixedPrefix,
    "Fixed MOV/CMP/JMP encodings must match the Intel 8086 encodings");
  assert.equal(gnuBytes.length, 209, "Cross-check stream length");

  const controlTransfers = [
    0xFF, 0xE3, // JMP BX
    0x70, 0x26, 0x71, 0x25, 0x72, 0x24, 0x73, 0x23,
    0x74, 0x22, 0x75, 0x21, 0x76, 0x20, 0x77, 0x1F,
    0x78, 0x1E, 0x79, 0x1D, 0x7A, 0x1C, 0x7B, 0x1B,
    0x7C, 0x1A, 0x7D, 0x19, 0x7E, 0x18, 0x7F, 0x17,
    0xE0, 0x16, 0xE1, 0x15, 0xE2, 0x14, 0xE3, 0x13
  ];
  assert.deepEqual(gnuBytes.slice(0x93, 0xBD), controlTransfers,
    "JMP BX, all Jcc opcodes, and LOOPNE/LOOPE/LOOP/JCXZ");

  const assemblerVersion = execFileSync("as", ["--version"], { encoding: "utf8" })
    .split("\n")[0];
  console.log("Independent 8086 assembler cross-check: PASS");
  console.log(assemblerVersion + " with .code16; GNU as and project assembler emitted identical bytes.");
  console.log("Scope: MOV/CMP, JMP short/near/indirect, 16 Jcc opcodes, and LOOPNE/LOOPE/LOOP/JCXZ.");
  console.log("Compared binary length: " + gnuBytes.length + " bytes; 59 bytes additionally pinned to fixed vectors.");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
