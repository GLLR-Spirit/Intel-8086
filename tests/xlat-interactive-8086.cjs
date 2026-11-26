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

    const lines = [
      "MOV AX, 1000h", "MOV DS, AX",
      "MOV AX, 2000h", "MOV ES, AX",
      "MOV AX, 3000h", "MOV SS, AX",
      "MOV BYTE PTR DS:[0203h], 11h",
      "MOV BYTE PTR ES:[0203h], 0C7h",
      "MOV BX, 0200h", "MOV CX, 1122h", "MOV DX, 3344h",
      "MOV BP, 5566h", "MOV SI, 7788h", "MOV DI, 99AAh",
      "MOV SP, 0BEEh", "MOV AX, 0F93h", "PUSH AX", "POPF",
      "MOV AX, 5A03h", "ES: XLAT", "HLT"
    ];
    await page.locator("#code").fill(lines.join("\n"));

    async function clickStep(count) {
      for (let i = 0; i < count; i++) await page.locator("#step").click();
    }
    async function snapshot() {
      return page.evaluate(() => {
        const readGrid = selector => Object.fromEntries(
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
          regs: readGrid("#regs"),
          segments: readGrid("#segments"),
          flags,
          status: document.querySelector("#status").textContent.trim()
        };
      });
    }

    const expectedFlags = { CF: 1, PF: 0, AF: 1, ZF: 0, SF: 1, TF: 1, IF: 1, DF: 1, OF: 1 };
    const expectedRegisters = {
      BX: "0200h", CX: "1122h", DX: "3344h", SI: "7788h",
      DI: "99AAh", BP: "5566h", SP: "0BEEh"
    };
    const expectedSegments = { DS: "1000h", ES: "2000h", SS: "3000h" };

    // Execute via the real visible Pas à pas button and stop immediately before XLAT.
    await clickStep(19);
    const before = await snapshot();
    assert.equal(before.regs.AX, "5A03h", "AX before XLAT");
    for (const [name, value] of Object.entries(expectedRegisters)) {
      assert.equal(before.regs[name], value, "Before XLAT " + name);
    }
    for (const [name, value] of Object.entries(expectedSegments)) {
      assert.equal(before.segments[name], value, "Before XLAT " + name);
    }
    for (const [name, value] of Object.entries(expectedFlags)) {
      assert.equal(before.flags[name], value, "Before XLAT FLAGS." + name);
    }

    await page.locator("#step").click();
    const after = await snapshot();
    assert.equal(after.regs.AX, "5AC7h", "ES:XLAT must replace AL while preserving AH");
    for (const [name, value] of Object.entries(expectedRegisters)) {
      assert.equal(after.regs[name], value, "After XLAT " + name);
    }
    for (const [name, value] of Object.entries(expectedSegments)) {
      assert.equal(after.segments[name], value, "After XLAT " + name);
    }
    for (const [name, value] of Object.entries(expectedFlags)) {
      assert.equal(after.flags[name], value, "After XLAT FLAGS." + name);
    }
    assert.match(after.status, /ES:\s*XLAT/i, "Step handler must report XLAT");
    assert.deepEqual(errors, [], "Browser runtime errors: " + errors.join("; "));

    console.log("XLAT interactive browser audit: PASS");
    console.log("19 preceding steps + XLAT via the visible Pas à pas button.");
    console.log("Verified ES override, AL/AH, all general/segment registers and FLAGS.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
