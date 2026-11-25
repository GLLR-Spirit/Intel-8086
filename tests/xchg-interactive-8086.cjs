const { chromium } = require("playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
    await page.locator('[data-view="editor"]').click();

    const program = [
      "MOV AX, 1000h",
      "MOV DS, AX",
      "MOV AX, 3000h",
      "MOV SS, AX",
      "MOV BX, 0200h",
      "MOV CX, 1234h",
      "MOV WORD PTR [BX], 0ABCDh",
      "MOV AX, 0FD7h",
      "PUSH AX",
      "POPF",
      "XCHG CX, WORD PTR [BX]",
      "MOV DX, WORD PTR [BX]",
      "MOV AL, 5Ah",
      "MOV BYTE PTR [BX+2], 0C7h",
      "XCHG AL, BYTE PTR [BX+2]",
      "MOV DH, BYTE PTR [BX+2]",
      "HLT"
    ];
    await page.locator("#code").fill(program.join("\n"));

    async function step(count) {
      for (let i = 0; i < count; i++) await page.locator("#step").click();
    }
    async function snapshot() {
      return page.evaluate(() => {
        const grid = selector => Object.fromEntries(
          Array.from(document.querySelectorAll(selector + " .reg"), node => [
            node.querySelector("small").textContent.trim(),
            node.querySelector("b").textContent.trim()
          ])
        );
        const flags = Object.fromEntries(
          Array.from(document.querySelectorAll("#flags .flag"), node => {
            const parts = node.textContent.trim().split("=");
            return [parts[0], Number(parts[1])];
          })
        );
        return {
          regs: grid("#regs"),
          segments: grid("#segments"),
          flags,
          status: document.querySelector("#status").textContent.trim()
        };
      });
    }

    const expectedFlags = { CF: 1, PF: 1, AF: 1, ZF: 1, SF: 1, TF: 1, IF: 1, DF: 1, OF: 1 };
    await step(10);
    const beforeWord = await snapshot();
    assert.equal(beforeWord.regs.CX, "1234h", "CX before word-memory XCHG");
    assert.equal(beforeWord.segments.DS, "1000h");
    assert.equal(beforeWord.segments.SS, "3000h");
    for (const [name, value] of Object.entries(expectedFlags)) {
      assert.equal(beforeWord.flags[name], value, "Before word XCHG FLAGS." + name);
    }

    await step(1);
    const afterWord = await snapshot();
    assert.equal(afterWord.regs.CX, "ABCDh", "CX must receive the previous memory word");
    for (const [name, value] of Object.entries(expectedFlags)) {
      assert.equal(afterWord.flags[name], value, "After word XCHG FLAGS." + name);
    }
    assert.match(afterWord.status, /XCHG/i, "Visible step status must identify XCHG");

    // Read back the exchanged memory word through the next real instruction.
    await step(1);
    const afterWordReadback = await snapshot();
    assert.equal(afterWordReadback.regs.DX, "1234h",
      "Memory must receive the previous CX value");

    // Now exercise an 8-bit exchange and read the exchanged memory byte back.
    await step(3);
    const beforeByte = await snapshot();
    assert.equal(beforeByte.regs.AX, "0F5Ah", "AL setup before byte XCHG");
    for (const [name, value] of Object.entries(expectedFlags)) {
      assert.equal(beforeByte.flags[name], value, "Before byte XCHG FLAGS." + name);
    }

    await step(1);
    const afterByte = await snapshot();
    assert.equal(afterByte.regs.AX, "0FC7h", "AL must receive the previous memory byte");
    for (const [name, value] of Object.entries(expectedFlags)) {
      assert.equal(afterByte.flags[name], value, "After byte XCHG FLAGS." + name);
    }

    await step(1);
    const byteReadback = await snapshot();
    assert.equal(byteReadback.regs.DX, "5A34h",
      "The byte at DS:[BX+2] must now contain the previous AL value");
    assert.deepEqual(errors, [], "Browser runtime errors: " + errors.join("; "));

    console.log("XCHG interactive browser audit: PASS");
    console.log("Executed word-memory and byte-memory exchanges through the visible Pas à pas button.");
    console.log("Verified before/after registers, memory read-back and all nine FLAGS.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
