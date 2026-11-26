const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};vm.createContext(context);
const inject="\nglobalThis.api={assemble:s=>assembleProgram(s),execute:s=>executeAll(s),binary:(b,c,i,s)=>executeBinary(b,c,i,s)};\n})();\n";
vm.runInContext(match[1].replace(/\n\}\)\(\);\s*$/,inject),context,{timeout:10000});
const api=context.api;assert.ok(api);let pass=0;
function test(name,fn){fn();pass++;console.log("PASS "+name);}
function sameState(a,b,label){assert.ok(!a.error,a.error);assert.ok(!b.error,b.error);for(const r of ["AX","BX","CX","DX","SP","BP","SI","DI","CS","DS","ES","SS","IP"])assert.equal(a.reg[r],b.reg[r],label+" "+r);for(const f of ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"])assert.equal(a.flags[f],b.flags[f],label+" "+f);}
test("RET 1 accepte un ajustement impair en source et binaire",()=>{
 const src="MOV AX,1234h\nPUSH AX\nCALL P\nHLT\nP:\nRET 1";
 const asm=api.assemble(src),a=api.execute(src),b=api.binary(Array.from(asm.bytes),0,0);
 sameState(a,b,"RET 1");assert.equal(a.reg.SP,0xFFFD);assert.equal(a.stack.length,0);
});
test("RET 3 applique exactement trois octets après le dépilement",()=>{
 const src="MOV AX,1234h\nPUSH AX\nCALL P\nHLT\nP:\nRET 3";
 const asm=api.assemble(src),a=api.execute(src),b=api.binary(Array.from(asm.bytes),0,0);
 sameState(a,b,"RET 3");assert.equal(a.reg.SP,0xFFFF);assert.equal(a.stack.length,0);
});
test("RET 0 conserve le comportement existant",()=>{
 const src="CALL P\nHLT\nP:\nRET 0",asm=api.assemble(src),a=api.execute(src),b=api.binary(Array.from(asm.bytes),0,0);
 sameState(a,b,"RET 0");assert.equal(a.reg.SP,0xFFFE);assert.equal(a.stack.length,0);
});
for(const sp of [0x0000,0x0001,0xFFFE])test("PUSH/POP avec SP initial "+sp.toString(16).toUpperCase().padStart(4,"0")+"h",()=>{
 const bytes=Array.from(api.assemble("PUSH AX\nPOP BX\nHLT").bytes);
 const b=api.binary(bytes,0,0,{reg:{SP:sp,AX:0xBEEF},flags:{CF:1,PF:0,AF:1,ZF:0,SF:1,TF:0,IF:1,DF:0,OF:1}});
 assert.ok(!b.error,b.error);assert.equal(b.reg.BX,0xBEEF);assert.equal(b.reg.SP,sp);assert.equal(b.stack.length,0);
});
console.log("CALL/RET stack boundary tests: "+pass+"/"+pass+" passed");
