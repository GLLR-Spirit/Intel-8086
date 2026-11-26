const {chromium}=require("playwright"),assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});await page.locator('[data-view="editor"]').click();
  const program=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV BX,0200h","MOV SI,0030h","MOV AX,0BEEFh","MOV WORD PTR ES:[BX+SI+4],AX","MOV AX,0FD7h","PUSH AX","POPF","LEA CX,ES:[BX+SI+4]","MOV DX,WORD PTR ES:[BX+SI+4]","HLT"];
  await page.locator("#code").fill(program.join("\n"));
  async function step(n){for(let i=0;i<n;i++)await page.locator("#step").click();}
  async function snapshot(){return page.evaluate(()=>{
   const grid=s=>Object.fromEntries(Array.from(document.querySelectorAll(s+" .reg"),n=>[n.querySelector("small").textContent.trim(),n.querySelector("b").textContent.trim()]));
   const flags=Object.fromEntries(Array.from(document.querySelectorAll("#flags .flag"),n=>{const p=n.textContent.trim().split("=");return [p[0],Number(p[1])];}));
   return {regs:grid("#regs"),segments:grid("#segments"),flags,status:document.querySelector("#status").textContent.trim()};
  });}
  const expected={CF:1,PF:1,AF:1,ZF:1,SF:1,TF:1,IF:1,DF:1,OF:1};
  await step(11);const before=await snapshot();
  assert.equal(before.regs.CX,"0000h");assert.equal(before.regs.BX,"0200h");assert.equal(before.regs.SI,"0030h");
  assert.equal(before.segments.DS,"1000h");assert.equal(before.segments.ES,"2000h");
  for(const [k,v] of Object.entries(expected))assert.equal(before.flags[k],v,"Before LEA FLAGS."+k);
  await step(1);const after=await snapshot();assert.equal(after.regs.CX,"0234h");assert.match(after.status,/LEA/i);
  for(const [k,v] of Object.entries(expected))assert.equal(after.flags[k],v,"After LEA FLAGS."+k);
  await step(1);const readback=await snapshot();assert.equal(readback.regs.DX,"BEEFh");
  assert.deepEqual(errors,[],"Browser errors: "+errors.join("; "));
  console.log("LEA interactive browser audit: PASS");
  console.log("LEA executed via Pas à pas with ES override; offset, memory, segments and nine FLAGS verified.");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
