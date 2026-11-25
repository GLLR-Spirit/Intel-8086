const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Application script must exist");

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
const injection = "\nglobalThis.__8086BCDMathApi = {" +
  "\n execute: function (source) { return executeAll(source); }," +
  "\n assemble: function (source) { return assembleProgram(source); }," +
  "\n disassemble: function (bytes) { return disassembleBytes(bytes); }" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "Test API injection point must exist");
vm.runInContext(instrumented, context, { timeout: 10000 });
const api = context.__8086BCDMathApi;
assert.ok(api, "BCD/multiply/divide test API must be exposed");

let passed = 0;
let failed = 0;
const totals = { aaaAas: 0, aamAad: 0, daaDas: 0, multiply: 0, divide: 0, encodings: 0 };
function test(name, fn) {
  try { fn(); passed++; }
  catch (error) { failed++; console.error("FAIL " + name + ": " + error.message); }
}
function run(source) {
  const state = api.execute(source);
  assert.ok(!state.error, state.error || "Execution failed");
  return state;
}
function parity8(value) {
  let count = 0;
  value &= 255;
  for (let bit = 0; bit < 8; bit++) count += (value >> bit) & 1;
  return count % 2 === 0 ? 1 : 0;
}
function flagsInput(af, cf, initialAX) {
  // POPF loads AF/CF without borrowing AH, then MOV restores the implicit AX operand.
  const flagsWord = (af << 4) | (cf ? 1 : 0) | 2;
  return "MOV AX, " + wordLiteral(flagsWord) + "\nPUSH AX\nPOPF\nMOV AX, " +
    wordLiteral(initialAX);
}
function byteLiteral(value) {
  return value.toString(16).toUpperCase().padStart(2, "0") + "h";
}
function wordLiteral(value) {
  return value.toString(16).toUpperCase().padStart(4, "0") + "h";
}

// AAA/AAS: only AF and CF are architecturally defined by the 8086.
// SF/ZF/PF/OF are deliberately not compared.
for (const op of ["AAA", "AAS"]) {
  for (let al = 0; al < 256; al++) {
    for (const af of [0, 1]) {
      for (const cf of [0, 1]) {
        const adjust = ((al & 15) > 9) || af === 1;
        const initialAH = (al * 13 + af * 71 + cf * 29) & 255;
        const expectedAL = adjust
          ? ((al + (op === "AAA" ? 6 : -6)) & 15)
          : (al & 15);
        const expectedAH = adjust
          ? ((initialAH + (op === "AAA" ? 1 : -1)) & 255)
          : initialAH;
        const label = op + " AL=" + byteLiteral(al) + " AF=" + af + " CF-in=" + cf;
        test("ASCII adjust " + label, () => {
          const state = run([
            "MOV AX, " + wordLiteral((initialAH << 8) | al),
            flagsInput(af, cf, (initialAH << 8) | al),
            op,
            "HLT"
          ].join("\n"));
          assert.equal(state.reg.AX & 255, expectedAL, label + " AL");
          assert.equal(state.reg.AX >> 8, expectedAH, label + " AH");
          assert.equal(state.flags.AF, adjust ? 1 : 0, label + " AF");
          assert.equal(state.flags.CF, adjust ? 1 : 0, label + " CF");
        });
        totals.aaaAas++;
      }
    }
  }
}

// AAM/AAD use the original 8086 implicit radix 10.
// AAM: AH=floor(AL/10), AL=AL mod 10.
// AAD: AL=(AH*10+AL) mod 256, AH=0.
// Only SF/ZF/PF are defined; AF/CF/OF are not asserted.
for (const op of ["AAM", "AAD"]) {
  for (let ax = 0; ax < 65536; ax += 257) {
    const al = ax & 255, ah = ax >> 8;
    const expectedAX = op === "AAM"
      ? ((Math.floor(al / 10) << 8) | (al % 10))
      : ((ah * 10 + al) & 255);
    const resultAL = expectedAX & 255;
    const label = op + " AX=" + wordLiteral(ax);
    test("ASCII multiply/divide adjust " + label, () => {
      const state = run(["MOV AX, " + wordLiteral(ax), op, "HLT"].join("\n"));
      assert.equal(state.reg.AX, expectedAX, label + " AX");
      assert.equal(state.flags.SF, (resultAL >> 7) & 1, label + " SF");
      assert.equal(state.flags.ZF, resultAL === 0 ? 1 : 0, label + " ZF");
      assert.equal(state.flags.PF, parity8(resultAL), label + " PF");
    });
    totals.aamAad++;
  }
}
// Include all 256 AL values for both AAM and AAD with AH=0 and nonzero.
for (const op of ["AAM", "AAD"]) {
  for (let al = 0; al < 256; al++) {
    const ah = op === "AAD" ? (al * 7) & 255 : 0;
    const ax = (ah << 8) | al;
    const expectedAX = op === "AAM"
      ? ((Math.floor(al / 10) << 8) | (al % 10))
      : ((ah * 10 + al) & 255);
    const resultAL = expectedAX & 255;
    const label = op + " exhaustive AL=" + byteLiteral(al) + " AH=" + byteLiteral(ah);
    test("ASCII adjust exhaustive " + label, () => {
      const state = run(["MOV AX, " + wordLiteral(ax), op, "HLT"].join("\n"));
      assert.equal(state.reg.AX, expectedAX, label + " AX");
      assert.equal(state.flags.SF, (resultAL >> 7) & 1, label + " SF");
      assert.equal(state.flags.ZF, resultAL === 0 ? 1 : 0, label + " ZF");
      assert.equal(state.flags.PF, parity8(resultAL), label + " PF");
    });
    totals.aamAad++;
  }
}

// DAA/DAS reference: both adjustment decisions use the original AL and CF.
// AF is set/cleared by the low correction; CF by the high correction.
for (const op of ["DAA", "DAS"]) {
  for (let al = 0; al < 256; al++) {
    for (const af of [0, 1]) {
      for (const cf of [0, 1]) {
        const lowAdjust = (al & 15) > 9 || af === 1;
        const highAdjust = al > 0x99 || cf === 1;
        let expected = al;
        if (lowAdjust) expected = (expected + (op === "DAA" ? 6 : -6)) & 255;
        if (highAdjust) expected = (expected + (op === "DAA" ? 0x60 : -0x60)) & 255;
        const label = op + " AL=" + byteLiteral(al) + " AF=" + af + " CF-in=" + cf;
        test("BCD adjust " + label, () => {
          const state = run([
            "MOV AX, " + wordLiteral(al),
            flagsInput(af, cf, al),
            op,
            "HLT"
          ].join("\n"));
          assert.equal(state.reg.AX & 255, expected, label + " AL");
          assert.equal(state.flags.AF, lowAdjust ? 1 : 0, label + " AF");
          assert.equal(state.flags.CF, highAdjust ? 1 : 0, label + " CF");
          assert.equal(state.flags.SF, (expected >> 7) & 1, label + " SF");
          assert.equal(state.flags.ZF, expected === 0 ? 1 : 0, label + " ZF");
          assert.equal(state.flags.PF, parity8(expected), label + " PF");
          // OF is architecturally undefined for DAA/DAS and is not asserted.
        });
        totals.daaDas++;
      }
    }
  }
}

// MUL/IMUL: verify the complete implicit product and only defined CF/OF.
// For signed multiply, CF=OF=0 iff the full product fits in the destination width.
function signed8(x) { return x & 128 ? x - 256 : x; }
function signed16(x) { return x & 32768 ? x - 65536 : x; }
const operands8 = [0,1,2,3,7,9,10,15,16,31,63,64,100,127,128,129,192,254,255];
const operands16 = [0,1,2,3,7,9,10,15,16,255,256,1023,32767,32768,32769,65534,65535];
for (const bits of [8, 16]) {
  const values = bits === 8 ? operands8 : operands16;
  for (const op of ["MUL", "IMUL"]) {
    for (const a of values) {
      for (const b of values) {
        const left = bits === 8 ? (op === "MUL" ? a : signed8(a)) :
          (op === "MUL" ? a : signed16(a));
        const right = bits === 8 ? (op === "MUL" ? b : signed8(b)) :
          (op === "MUL" ? b : signed16(b));
        const product = left * right;
        const expectedLow = product & (bits === 8 ? 65535 : 65535);
        const expectedHigh = bits === 8 ? null : (Math.floor(product / 65536) & 65535);
        const fits = op === "MUL"
          ? (bits === 8 ? product <= 255 : expectedHigh === 0)
          : (bits === 8 ? product >= -128 && product <= 127 :
             product >= -32768 && product <= 32767);
        const label = op + " " + bits + "-bit " + byteLiteral(a & 255) +
          "/" + wordLiteral(a) + " × " + byteLiteral(b & 255) + "/" + wordLiteral(b);
        test("Multiply result/overflow " + label, () => {
          const src = bits === 8
            ? ["MOV AL, " + byteLiteral(a), "MOV BL, " + byteLiteral(b), op + " BL", "HLT"]
            : ["MOV AX, " + wordLiteral(a), "MOV BX, " + wordLiteral(b), op + " BX", "HLT"];
          const state = run(src.join("\n"));
          if (bits === 8) assert.equal(state.reg.AX, expectedLow, label + " AX");
          else {
            assert.equal(state.reg.AX, expectedLow, label + " low word AX");
            assert.equal(state.reg.DX, expectedHigh, label + " high word DX");
          }
          assert.equal(state.flags.CF, fits ? 0 : 1, label + " CF");
          assert.equal(state.flags.OF, fits ? 0 : 1, label + " OF");
        });
        totals.multiply++;
      }
    }
  }
}

// DIV/IDIV: selected normal cases, exact quotient/remainder boundaries,
// division by zero and quotient overflow. FLAGS are undefined and ignored.
function expectDivision(op, bits, dividend, divisor, expectedQuotient, expectedRemainder) {
  const signed = op === "IDIV";
  const min = signed ? (bits === 8 ? -127 : -32767) : 0;
  const max = signed ? (bits === 8 ? 127 : 32767) : (bits === 8 ? 255 : 65535);
  const label = op + " " + bits + "-bit dividend=" + dividend + " divisor=" + divisor;
  test("Division " + label, () => {
    const src = bits === 8
      ? ["MOV AX, " + wordLiteral(dividend & 65535), "MOV BL, " + byteLiteral(divisor & 255), op + " BL", "HLT"]
      : ["MOV DX, " + wordLiteral((Math.floor(dividend / 65536)) & 65535),
         "MOV AX, " + wordLiteral(dividend & 65535),
         "MOV BX, " + wordLiteral(divisor & 65535), op + " BX", "HLT"];
    const state = run(src.join("\n"));
    assert.ok(expectedQuotient >= min && expectedQuotient <= max, "reference quotient must fit");
    if (bits === 8) {
      assert.equal(state.reg.AX & 255, expectedQuotient & 255, label + " AL quotient");
      assert.equal(state.reg.AX >> 8, expectedRemainder & 255, label + " AH remainder");
    } else {
      assert.equal(state.reg.AX, expectedQuotient & 65535, label + " AX quotient");
      assert.equal(state.reg.DX, expectedRemainder & 65535, label + " DX remainder");
    }
    totals.divide++;
  });
}
for (const bits of [8, 16]) {
  const divisors = bits === 8 ? [1,2,3,7,10,127,128,129,255] :
    [1,2,3,7,10,255,256,32767,32768,32769,65535];
  for (const op of ["DIV", "IDIV"]) {
    for (const divisorRaw of divisors) {
      const divisor = op === "IDIV"
        ? (bits === 8 ? signed8(divisorRaw) : signed16(divisorRaw))
        : divisorRaw;
      if (divisor === 0) continue;
      const dividends = bits === 8
        ? (op === "DIV" ? [0,1,127,128,255,256,257,999,32767,65535] :
           [0,1,127,128,255,256,65408,32767,32768,65535])
        : (op === "DIV" ? [0,1,65535,65536,65537,0x7FFFFFFF,0x80000000,0xFFFFFFFF] :
           [0,1,65535,65536,0x7FFFFFFF,0x80000000,0xFFFF8000,0xFFFFFFFF]);
      for (const raw of dividends) {
        const dividend = bits === 8
          ? (op === "IDIV" ? signed16(raw) : raw)
          : (op === "IDIV" ? (raw | 0) : raw >>> 0);
        const quotient = Math.trunc(dividend / divisor);
        const remainder = dividend - quotient * divisor;
        const min = op === "IDIV" ? (bits === 8 ? -127 : -32767) : 0;
        const max = op === "IDIV" ? (bits === 8 ? 127 : 32767) : (bits === 8 ? 255 : 65535);
        if (quotient >= min && quotient <= max) {
          expectDivision(op, bits, raw, divisorRaw, quotient, remainder);
        } else {
          const label = op + " " + bits + "-bit quotient overflow dividend=" + raw +
            " divisor=" + divisorRaw;
          test("Division quotient overflow " + label, () => {
            const src = bits === 8
              ? ["MOV AX, " + wordLiteral(raw & 65535), "MOV BL, " + byteLiteral(divisorRaw), op + " BL", "HLT"]
              : ["MOV DX, " + wordLiteral((raw >>> 16) & 65535),
                 "MOV AX, " + wordLiteral(raw & 65535),
                 "MOV BX, " + wordLiteral(divisorRaw), op + " BX", "HLT"];
            const state = api.execute(src.join("\n"));
            assert.match(state.error || "", /dépassement de quotient/i);
          });
          totals.divide++;
        }
      }
    }
  }
}
for (const [op,bits] of [["DIV",8],["IDIV",8],["DIV",16],["IDIV",16]]) {
  const label = op + " divide-by-zero " + bits;
  test(label, () => {
    const src = bits === 8
      ? ["MOV AX, 1234h", "MOV BL, 0", op + " BL", "HLT"]
      : ["MOV DX, 0", "MOV AX, 1234h", "MOV BX, 0", op + " BX", "HLT"];
    const state = api.execute(src.join("\n"));
    assert.match(state.error || "", /division par zéro/i);
  });
  totals.divide++;
}

// Fixed 8086 opcode bytes for all six decimal-adjust instructions.
const bcdEncodings = [
  ["AAA", [0x37]], ["AAS", [0x3F]],
  ["AAM", [0xD4, 0x0A]], ["AAD", [0xD5, 0x0A]],
  ["DAA", [0x27]], ["DAS", [0x2F]]
];
for (const [source, expected] of bcdEncodings) {
  test("8086 BCD encoding " + source, () => {
    assert.deepEqual(Array.from(api.assemble(source).bytes), expected);
  });
  test("8086 BCD disassembly " + source, () => {
    const decoded = api.disassemble(expected);
    assert.equal(decoded.rows.length, 1);
    assert.equal(decoded.rows[0].instruction.split(" ")[0], source);
    assert.deepEqual(Array.from(decoded.rows[0].bytes), expected);
  });
  totals.encodings += 2;
}

console.log("AAA/AAS vectors : " + totals.aaaAas);
console.log("AAM/AAD vectors : " + totals.aamAad);
console.log("DAA/DAS vectors : " + totals.daaDas);
console.log("MUL/IMUL vectors : " + totals.multiply);
console.log("DIV/IDIV vectors : " + totals.divide);
console.log("Encodages BCD : " + totals.encodings);
console.log("Audit BCD + MUL/DIV : " + passed + " réussis, " + failed + " échecs.");
console.log("Les FLAGS indéfinis ne sont pas comparés : AAA/AAS SF/ZF/PF/OF ; AAM/AAD AF/CF/OF ; DAA/DAS OF ; MUL/IMUL hors CF/OF ; DIV/IDIV tous les FLAGS.");
if (failed) process.exit(1);
