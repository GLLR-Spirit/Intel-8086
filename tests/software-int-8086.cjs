const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, "Application script must exist");
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, value:"", textContent:"", innerHTML:"", className:"",
    dataset:{}, onclick:null, oninput:null, onchange:null
  });
  return elements.get(id);
}
const context = {
  document:{getElementById:element,querySelectorAll:()=>[]},
  localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},
  console
};
vm.createContext(context);
const injection = "\nglobalThis.__8086SoftwareIntApi = {" +
  "\n assemble: source => assembleProgram(source)," +
  "\n disassemble: bytes => disassembleBytes(bytes)," +
  "\n execute: source => executeAll(source)," +
  "\n executeBinary: (bytes,cs,ip,state) => executeBinary(bytes,cs,ip,state)" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1], "API injection point must exist");
vm.runInContext(instrumented, context, {timeout:10000});
const api=context.__8086SoftwareIntApi;
assert.ok(api,"Software INT API must be exposed");

let passed=0,failed=0;
function test(name,fn){
 try{fn();passed++;}
 catch(error){failed++;console.error("FAIL "+name+": "+error.stack);}
}
function sourceProgram(){
 return [
  "VECTOR 30h, HANDLER",
  "MOV AX, 0000h",
  "MOV CX, 0302h",
  "PUSH CX",
  "POPF",
  "INT 30h",
  "MOV BX, 0ABCDh",
  "HLT",
  "HANDLER:",
  "PUSHF",
  "POP DX",
  "MOV SI, 5678h",
  "IRET"
 ].join("\n");
}
function binaryProgram(){
 return [
  "MOV AX, 0000h",
  "MOV CX, 0302h",
  "PUSH CX",
  "POPF",
  "INT 30h",
  "MOV BX, 0ABCDh",
  "HLT",
  "HANDLER:",
  "PUSHF",
  "POP DX",
  "MOV SI, 5678h",
  "IRET"
 ].join("\n");
}
function assertInterruptState(state,mode){
 assert.ok(!state.error,state.error||mode+" execution failed");
 assert.equal(state.reg.BX,0xABCD,mode+" must resume after INT");
 assert.equal(state.reg.SI,0x5678,mode+" handler must execute");
 assert.equal(state.reg.DX&0x0300,0,mode+" handler must observe IF=TF=0");
 assert.equal(state.flags.IF,1,mode+" IRET must restore IF");
 assert.equal(state.flags.TF,1,mode+" IRET must restore TF");
 assert.equal(state.reg.SP,0xFFFE,mode+" stack pointer must be restored");
 assert.equal(state.stack.length,0,mode+" interrupt frame must be consumed");
}
test("INT imm8 encodes CD ib and disassembles",()=>{
 const assembled=api.assemble("INT 30h\nHLT");
 assert.deepEqual(Array.from(assembled.bytes),[0xCD,0x30,0xF4]);
 const decoded=api.disassemble([0xCD,0x30]);
 assert.equal(decoded.rows.length,1);
 assert.equal(decoded.rows[0].instruction,"INT 30h");
 assert.deepEqual(Array.from(decoded.rows[0].bytes),[0xCD,0x30]);
});
test("Source VECTOR 30h routes INT through IRET",()=>{
 const state=api.execute(sourceProgram());
 assertInterruptState(state,"source");
});
test("Binary INT reads IVT and returns through IRET",()=>{
 const assembled=api.assemble(binaryProgram());
 const handler=assembled.symbols.HANDLER;
 assert.ok(Number.isInteger(handler),"Assembler must expose HANDLER offset");
 const cs=0x1000,vector=0x30,ivt=vector*4;
 const mem={
  [ivt]:handler&255,
  [ivt+1]:(handler>>8)&255,
  [ivt+2]:cs&255,
  [ivt+3]:(cs>>8)&255
 };
 const state=api.executeBinary(assembled.bytes,cs,0,{mem});
 assertInterruptState(state,"binary");
});
for(const invalid of ["INT 100h","INT -1","INT AX","INT"]){
 test("INT rejects invalid operand "+invalid,()=>{
  assert.throws(()=>api.assemble(invalid));
  assert.ok(api.execute(invalid).error);
 });
}
console.log("8086 software INT/IRET audit: "+passed+" passed, "+failed+" failed.");
console.log("CD ib encoding, VECTOR source path, physical IVT binary path, IF/TF clearing, IRET restoration.");
if(failed)process.exit(1);
