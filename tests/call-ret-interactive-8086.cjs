const {chromium}=require("playwright"),assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});await page.locator('[data-view="editor"]').click();
  await page.locator("#code").fill("CALL FAR 1234h:0006h\nHLT\nPROC: RETF");
  await page.locator("#step").click();
  const afterCall=await page.evaluate(()=>({cs:document.querySelector("#segments .reg:nth-child(1) b").textContent.trim(),sp:document.querySelector("#regs .reg:nth-child(8) b").textContent.trim(),stack:document.querySelector("#stackView").textContent}));
  assert.equal(afterCall.cs,"1234h");assert.equal(afterCall.sp,"FFFAh");
  assert.match(afterCall.stack,/TOP[\s\S]*0005h/);assert.match(afterCall.stack,/SS:FFFC[hH][\\s\\S]*0000h/i);
  await page.locator("#step").click();
  const afterReturn=await page.evaluate(()=>({cs:document.querySelector("#segments .reg:nth-child(1) b").textContent.trim(),sp:document.querySelector("#regs .reg:nth-child(8) b").textContent.trim(),stack:document.querySelector("#stackView").textContent}));
  assert.equal(afterReturn.cs,"0000h");assert.equal(afterReturn.sp,"FFFEh");assert.match(afterReturn.stack,/Pile vide/);
  assert.deepEqual(errors,[],"Browser errors: "+errors.join("; "));
  console.log("CALL FAR / RETF interactive browser audit: PASS");
  console.log("Verified with real Pas à pas clicks: CS:IP far transfer, pushed return IP/CS order, restored CS and SP.");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
