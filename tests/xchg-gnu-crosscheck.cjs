const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");

const regs8 = ["AL", "CL", "DL", "BL", "AH", "CH", "DH", "BH"];
const regs16 = ["AX", "CX", "DX", "BX", "SP", "BP", "SI", "DI"];
const appLines = [];
const gasLines = [];

// All ordered register/register combinations, including the compact AX encodings.
for (const regs of [regs8, regs16]) {
  for (const left of regs) {
    for (const right of regs) {
      appLines.push("XCHG " + left + ", " + right);
      gasLines.push("XCHG " + left + ", " + right);
    }
  }
}

// All eight 8086 effective-address forms, both operand widths and both source orders.
const ea = ["[BX+SI]", "[BX+DI]", "[BP+SI]", "[BP+DI]", "[SI]", "[DI]", "[BP]", "[BX]"];
for (const address of ea) {
  appLines.push("XCHG AL, BYTE PTR " + address);
  gasLines.push("XCHG AL, BYTE PTR " + address);
  appLines.push("XCHG BYTE PTR " + address + ", AL");
  gasLines.push("XCHG BYTE PTR " + address + ", AL");
  appLines.push("XCHG AX, WORD PTR " + address);
  gasLines.push("XCHG AX, WORD PTR " + address);
  appLines.push("XCHG WORD PTR " + address + ", AX");
  gasLines.push("XCHG WORD PTR " + address + ", AX");
}

// Direct disp16, signed disp8 endpoints, and signed disp16 endpoints.
const boundary = [
  "XCHG AL, BYTE PTR [4660]",
  "XCHG AX, WORD PTR [BX+SI+127]",
  "XCHG AX, WORD PTR [BX+SI-128]",
  "XCHG AX, WORD PTR [BP+DI+32767]",
  "XCHG AX, WORD PTR [BP+DI-32768]"
];
appLines.push(...boundary);
gasLines.push(...boundary);

// Segment overrides and LOCK prefix: GAS writes legacy prefixes before the mnemonic.
for (const segment of ["ES", "CS", "SS", "DS"]) {
  const address = segment === "DS" ? "[BP]" : "[BX]";
  appLines.push("XCHG AX, WORD PTR " + segment + ":" + address);
  gasLines.push(segment + " XCHG AX, WORD PTR " + address);
}
appLines.push("LOCK XCHG WORD PTR [BX], AX");
gasLines.push("LOCK XCHG WORD PTR [BX], AX");

const appProgram = appLines.join("\n");
const gasProgram = [
  ".intel_syntax noprefix", ".code16", ".text", ".global _start", "_start:",
  gasLines.join("\n"), ""
].join("\n");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "8086-xchg-gnu-"));
try {
  const sourcePath = path.join(dir, "xchg.s");
  const objectPath = path.join(dir, "xchg.o");
  const binaryPath = path.join(dir, "xchg.bin");
  fs.writeFileSync(sourcePath, gasProgram);
  execFileSync("as", ["--32", "-o", objectPath, sourcePath], { stdio: "pipe" });
  execFileSync("objcopy", ["-O", "binary", "-j", ".text", objectPath, binaryPath], { stdio: "pipe" });
  const gnuBytes = Array.from(fs.readFileSync(binaryPath));

  const html = fs.readFileSync("index.html", "utf8");
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, "Application inline script must exist");
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
  const injection = "\nglobalThis.__8086XchgGnuApi = {" +
    "\n assemble: source => assembleProgram(source)" +
    "\n};\n})();\n";
  const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
  assert.notEqual(instrumented, match[1], "Application API injection point must exist");
  vm.runInContext(instrumented, context, { timeout: 30000 });
  const appBytes = Array.from(context.__8086XchgGnuApi.assemble(appProgram).bytes);

  if (appBytes.length !== gnuBytes.length || appBytes.some((value, index) => value !== gnuBytes[index])) {
    const limit = Math.min(appBytes.length, gnuBytes.length);
    const first = Array.from({ length: limit }, (_, index) => index)
      .find(index => appBytes[index] !== gnuBytes[index]);
    console.error("First XCHG GNU mismatch at byte " + first +
      "; project=" + appBytes.slice(Math.max(0, first - 8), first + 12).map(x => x.toString(16).padStart(2, "0")).join(" ") +
      "; GNU=" + gnuBytes.slice(Math.max(0, first - 8), first + 12).map(x => x.toString(16).padStart(2, "0")).join(" "));
  }
  assert.deepEqual(appBytes, gnuBytes,
    "Project XCHG encoder must match GNU as byte-for-byte across register, memory, displacement, segment and LOCK vectors");

  // Pin representative architectural bytes independently of both assembler outputs.
  assert.deepEqual(gnuBytes.slice(0, 6), [
    0x86, 0xC0, // XCHG AL,AL
    0x86, 0xC8, // XCHG AL,CL (ModR/M reg=CL, r/m=AL)
    0x86, 0xD0  // XCHG AL,DL (ModR/M reg=DL, r/m=AL)
  ], "Known byte-register ModR/M encodings");
  const wordStart = 64 * 2;
  assert.deepEqual(gnuBytes.slice(wordStart, wordStart + 8),
    [0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97],
    "Compact AX-register encodings 90h–97h");
  const memoryStart = wordStart + 113;
  assert.deepEqual(gnuBytes.slice(memoryStart, memoryStart + 6),
    [0x86, 0x00, 0x86, 0x00, 0x87, 0x00],
    "Known byte/word memory XCHG encodings through [BX+SI]");

  const version = execFileSync("as", ["--version"], { encoding: "utf8" }).split("\n")[0];
  console.log("Independent XCHG encoding cross-check: PASS");
  console.log(version + " with .code16");
  console.log("Compared " + appLines.length + " XCHG instructions byte-for-byte.");
  console.log("Scope: 64 byte-register pairs, 64 word-register pairs, all eight EA forms in both operand orders and widths, displacement boundaries, four segment overrides and LOCK memory form.");
  console.log("Binary length: " + gnuBytes.length + " bytes.");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
