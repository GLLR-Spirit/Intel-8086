const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};vm.createContext(context);
const inject="\nglobalThis.api={assemble:s=>assembleProgram(s),disassemble:b=>disassembleBytes(b),execute:s=>executeAll(s),binary:(b,c,i,s)=>executeBinary(b,c,i,s)};\n})();\n";
vm.runInContext(match[1].replace(/\n\}\)\(\);\s*$/,inject),context,{timeout:10000});
const api=context.api;assert.ok(api);let pass=0;
function test(name,fn){fn();pass++;console.log("PASS "+name);}
function compare(a,b,label){assert.ok(!a.error,a.error);assert.ok(!b.error,b.error);for(const r of ["AX","BX","CX","DX","SP","BP","SI","DI","CS","DS","ES","SS","IP"])assert.equal(a.reg[r],b.reg[r],label+" "+r);for(const f of ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"])assert.equal(a.flags[f],b.flags[f],label+" "+f);}
test("CALL FAR ptr16:16 encodes 9A offset then segment",()=>{
 const x=api.assemble("CALL FAR 1234h:5678h");
 assert.deepEqual(Array.from(x.bytes),[0x9A,0x78,0x56,0x34,0x12]);
 const d=api.disassemble(Array.from(x.bytes));assert.equal(d.rows[0].instruction,"CALL FAR 1234h:5678h");
});
test("CALL FAR direct source path pushes CS then IP; RETF restores them",()=>{
 const template="MOV AX,0FD7h\nPUSH AX\nPOPF\nCALL FAR 0000h:0000h\nHLT\nPROC: RETF";
 const target=api.assemble(template).symbols.PROC,src=template.replace("CALL FAR 0000h:0000h","CALL FAR 0000h:"+target.toString(16).toUpperCase().padStart(4,"0")+"h");
 const a=api.execute(src);assert.ok(!a.error,a.error);assert.equal(a.reg.CS,0);assert.equal(a.reg.SP,0xFFFE);assert.equal(a.stack.length,0);
 for(const f of ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"])assert.equal(a.flags[f],1,"FLAGS "+f);
});
test("CALL FAR direct dynamic binary crosses CS and returns to caller",()=>{
 const bytes=[0x9A,0x00,0x01,0x00,0x10,0xF4];
 const mem={"65792":0xCB}; // 1000h:0100h physical address 10100h
 const b=api.binary(bytes,0,0,{mem,flags:{CF:1,PF:1,AF:1,ZF:1,SF:1,TF:1,IF:1,DF:1,OF:1}});
 assert.ok(!b.error,b.error);assert.equal(b.reg.CS,0);assert.equal(b.reg.IP,6);assert.equal(b.reg.SP,0xFFFE);assert.equal(b.stack.length,0);
 for(const f of ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"])assert.equal(b.flags[f],1,"FLAGS "+f);
});
test("CALL FAR direct disassembler rejects truncated pointer",()=>{
 assert.throws(()=>api.disassemble([0x9A,0x00,0x01]),/Flux tronqué/);
});
console.log("CALL/RET direct far audit: "+pass+"/"+pass+" passed");
