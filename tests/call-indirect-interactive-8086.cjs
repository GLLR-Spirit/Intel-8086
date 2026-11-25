const {chromium}=require("playwright"),assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  await page.locator('[data-view="editor"]').click();

  const near=[
   "MOV AX, 0","MOV DS, AX","MOV BX, 20h","MOV WORD PTR [BX], 000Fh",
   "CALL WORD PTR [BX]","HLT","TARGET: RET"
  ].join("\n");
  await page.locator("#code").fill(near);
  for(let i=0;i<5;i++)await page.locator("#step").click();
  let state=await page.evaluate(()=>({
   cs:document.querySelector("#segments .reg:nth-child(1) b").textContent.trim(),
   ip:document.querySelector("#segments .reg:nth-child(5) b").textContent.trim(),
   sp:document.querySelector("#regs .reg:nth-child(8) b").textContent.trim(),
   stack:document.querySelector("#stackView").textContent
  }));
  assert.equal(state.cs,"0000h");assert.equal(state.ip,"000Fh");assert.equal(state.sp,"FFFCh");
  assert.match(state.stack,/RET → 000Eh/);
  await page.locator("#step").click();
  state=await page.evaluate(()=>({ip:document.querySelector("#segments .reg:nth-child(5) b").textContent.trim(),sp:document.querySelector("#regs .reg:nth-child(8) b").textContent.trim(),stack:document.querySelector("#stackView").textContent}));
  assert.equal(state.ip,"000Eh");assert.equal(state.sp,"FFFEh");assert.match(state.stack,/Pile vide/);

  const farSource=[
   "MOV AX, 0","MOV DS, AX","MOV BX, 30h","MOV WORD PTR [BX], 0014h",
   "MOV WORD PTR [BX+2], 1234h","CALL FAR PTR [BX]","HLT","TARGET: RETF"
  ].join("\n");
  await page.locator("#reset").click();await page.locator("#code").fill(farSource);
  for(let i=0;i<6;i++)await page.locator("#step").click();
  state=await page.evaluate(()=>({
   cs:document.querySelector("#segments .reg:nth-child(1) b").textContent.trim(),
   ip:document.querySelector("#segments .reg:nth-child(5) b").textContent.trim(),
   sp:document.querySelector("#regs .reg:nth-child(8) b").textContent.trim(),
   stack:document.querySelector("#stackView").textContent
  }));
  assert.equal(state.cs,"1234h");assert.equal(state.ip,"0014h");assert.equal(state.sp,"FFFAh");
  assert.match(state.stack,/RET → 0013h/);assert.match(state.stack,/0000h/);
  await page.locator("#step").click();
  state=await page.evaluate(()=>({
   cs:document.querySelector("#segments .reg:nth-child(1) b").textContent.trim(),
   ip:document.querySelector("#segments .reg:nth-child(5) b").textContent.trim(),
   sp:document.querySelector("#regs .reg:nth-child(8) b").textContent.trim(),
   stack:document.querySelector("#stackView").textContent
  }));
  assert.equal(state.cs,"0000h");assert.equal(state.ip,"0013h");assert.equal(state.sp,"FFFEh");assert.match(state.stack,/Pile vide/);

  const farBinary=[
   "MOV AX, 0","MOV DS, AX","MOV BX, 30h","MOV WORD PTR [BX], 0014h",
   "MOV WORD PTR [BX+2], 0000h","CALL FAR PTR [BX]","HLT","TARGET: RETF"
  ].join("\n");
  await page.locator("#reset").click();await page.locator("#code").fill(farBinary);
  await page.locator("#assemble").click();
  const listing=await page.locator("#assemblerReport").textContent();
  const match=listing.match(/FLUX BINAIRE\s+([0-9A-F ]+)/);
  assert.ok(match,"Assembler must expose a contiguous binary byte stream");
  await page.locator("#disassemblyInput").fill(match[1].trim());
  await page.locator("#executeBinary").click();
  state=await page.evaluate(()=>({
   cs:document.querySelector("#segments .reg:nth-child(1) b").textContent.trim(),
   ip:document.querySelector("#segments .reg:nth-child(5) b").textContent.trim(),
   sp:document.querySelector("#regs .reg:nth-child(8) b").textContent.trim(),
   stack:document.querySelector("#stackView").textContent,
   report:document.querySelector("#binaryExecutionReport").textContent
  }));
  assert.match(state.report,/EXÉCUTION BINAIRE RÉUSSIE/);
  assert.equal(state.cs,"0000h");assert.equal(state.ip,"0014h");assert.equal(state.sp,"FFFEh");assert.match(state.stack,/Pile vide/);
  assert.deepEqual(errors,[],errors.join("; "));
  console.log("CALL indirect near/far Playwright audit: PASS");
  console.log("Verified real Pas à pas clicks for near and far source calls, far CS:IP transfer, return stack order, RETF restoration, plus assembled binary execution.");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
