const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "8086-xlat-gnu-"));
try {
  const sourcePath = path.join(dir, "xlat.s");
  const objectPath = path.join(dir, "xlat.o");
  const binaryPath = path.join(dir, "xlat.bin");
  const gnuSource = [
    ".intel_syntax noprefix", ".code16", ".text", ".global _start", "_start:",
    "  xlat", "  es xlat", "  cs xlat", "  ss xlat", "  ds xlat", ""
  ].join("\n");
  fs.writeFileSync(sourcePath, gnuSource);
  execFileSync("as", ["--32", "-o", objectPath, sourcePath], { stdio: "pipe" });
  execFileSync("objcopy", ["-O", "binary", "-j", ".text", objectPath, binaryPath], { stdio: "pipe" });
  const gnuBytes = Array.from(fs.readFileSync(binaryPath));
  const expected = [0xD7, 0x26, 0xD7, 0x2E, 0xD7, 0x36, 0xD7, 0x3E, 0xD7];
  assert.deepEqual(gnuBytes, expected, "GNU as must emit the fixed XLAT opcode and segment prefixes");

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
  const context = {
    document: { getElementById: element, querySelectorAll: () => [] },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    console
  };
  vm.createContext(context);
  const injection = "\nglobalThis.__8086XlatGnuApi = {" +
    "\n assemble: source => assembleProgram(source)," +
    "\n disassemble: bytes => disassembleBytes(bytes)" +
    "\n};\n})();\n";
  const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
  assert.notEqual(instrumented, match[1], "Test API injection point must exist");
  vm.runInContext(instrumented, context, { timeout: 30000 });
  const api = context.__8086XlatGnuApi;
  assert.ok(api, "XLAT GNU cross-check API must be exposed");

  const appSource = ["XLAT", "ES: XLAT", "CS: XLAT", "SS: XLAT", "DS: XLAT"].join("\n");
  const appBytes = Array.from(api.assemble(appSource).bytes);
  assert.deepEqual(appBytes, gnuBytes,
    "Project assembler must match GNU as for XLAT and all four segment selectors");

  const decoded = api.disassemble(expected);
  assert.deepEqual(Array.from(decoded.rows, row => row.instruction),
    ["XLAT", "ES: XLAT", "CS: XLAT", "SS: XLAT", "DS: XLAT"]);

  const version = execFileSync("as", ["--version"], { encoding: "utf8" }).split("\n")[0];
  console.log("Independent XLAT encoding cross-check: PASS");
  console.log(version + " with .code16");
  console.log("GNU as and Intel 8086 Lab match byte-for-byte: D7 26 D7 2E D7 36 D7 3E D7.");
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
