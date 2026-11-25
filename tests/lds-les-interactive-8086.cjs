const {chromium}=require("playwright"),assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});await page.locator('[data-view="editor"]').click();
  const program=["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV BX,0200h","MOV SI,0030h","MOV AX,5678h","MOV WORD PTR ES:[BX+SI+4],AX","MOV AX,1234h","MOV WORD PTR ES:[BX+SI+6],AX","MOV AX,0FD7h","PUSH AX","POPF","LDS CX,ES:[BX+SI+4]","MOV AX,2000h","MOV ES,AX","LES DX,ES:[BX+SI+4]","HLT"];
  await page.locator("#code").fill(program.join("\n"));
  async function step(n){for(let i=0;i<n;i++)await page.locator("#step").click();}
  async function snap(){return page.evaluate(()=>{
   const grid=s=>Object.fromEntries(Array.from(document.querySelectorAll(s+" .reg"),n=>[n.querySelector("small").textContent.trim(),n.querySelector("b").textContent.trim()]));
   const flags=Object.fromEntries(Array.from(document.querySelectorAll("#flags .flag"),n=>{const p=n.textContent.trim().split("=");return [p[0],Number(p[1])];}));
   return {regs:grid("#regs"),segments:grid("#segments"),flags,status:document.querySelector("#status").textContent.trim()};
  });}
  const expected={CF:1,PF:1,AF:1,ZF:1,SF:1,TF:1,IF:1,DF:1,OF:1};
  await step(13);const before=await snap();assert.equal(before.regs.CX,"0000h");for(const [k,v] of Object.entries(expected))assert.equal(before.flags[k],v);
  await step(1);const afterLds=await snap();assert.equal(afterLds.regs.CX,"5678h");assert.equal(afterLds.segments.DS,"1234h");for(const [k,v] of Object.entries(expected))assert.equal(afterLds.flags[k],v);
  await step(3);const afterLes=await snap();assert.equal(afterLes.regs.DX,"5678h");assert.equal(afterLes.segments.ES,"1234h");for(const [k,v] of Object.entries(expected))assert.equal(afterLes.flags[k],v);
  assert.deepEqual(errors,[],"Browser errors: "+errors.join("; "));
  console.log("LDS/LES interactive browser audit: PASS");
  console.log("LDS and LES executed with real Pas à pas control and ES source override; offset, segment, FLAGS and register destinations verified.");
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
