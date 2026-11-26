const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8");
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,"Application script must exist");
const elements=new Map();
function element(id){
 if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});
 return elements.get(id);
}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};
vm.createContext(context);
const injection="\nglobalThis.__8086SimpleInstructionApi = {"+
 "\n assemble: source => assembleProgram(source),"+
 "\n disassemble: bytes => disassembleBytes(bytes),"+
 "\n execute: source => executeAll(source),"+
 "\n executeBinary: (bytes,cs,ip,state) => executeBinary(bytes,cs,ip,state)"+
 "\n};\n})();\n";
const instrumented=match[1].replace(/\n\}\)\(\);\s*$/,injection);
assert.notEqual(instrumented,match[1],"API injection point must exist");
vm.runInContext(instrumented,context,{timeout:10000});
const api=context.__8086SimpleInstructionApi;
assert.ok(api,"API must be exposed");
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;}catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}}
const flagNames=["CF","PF","AF","ZF","SF","TF","IF","DF","OF"];
const flagsWord=0x0FD7;
function runBoth(source){
 const assembled=api.assemble(source);
 const src=api.execute(source);
 const bin=api.executeBinary(assembled.bytes,0,0,{});
 assert.ok(!src.error,src.error||"source execution failed");
 assert.ok(!bin.error,bin.error||"binary execution failed");
 for(const reg of ["AX","BX","CX","DX","SP","BP","SI","DI","CS","DS","ES","SS"])
  assert.equal(bin.reg[reg],src.reg[reg],"source/binary "+reg);
 for(const flag of flagNames)
  assert.equal(bin.flags[flag],src.flags[flag],"source/binary "+flag);
 return {assembled,src,bin};
}
function assertFlags(state,label){
 for(const flag of flagNames)assert.equal(state.flags[flag],(flagsWord&({CF:1,PF:4,AF:16,ZF:64,SF:128,TF:256,IF:512,DF:1024,OF:2048}[flag]))?1:0,label+" "+flag);
}
for(let value=0;value<256;value++){
 const hex=value.toString(16).padStart(2,"0");
 test("CBW all AL values "+hex,()=>{
  const source="MOV SP,0100h\nMOV CX,0FD7h\nPUSH CX\nPOPF\nMOV AX,0000h\nMOV AL,"+hex+"h\nCBW\nHLT";
  const {src,bin}=runBoth(source);
  const expected=(value&0x80)?(value|0xFF00):value;
  for(const [mode,state] of [["source",src],["binary",bin]]){
   assert.equal(state.reg.AX,expected,mode+" CBW result");
   assert.equal(state.reg.SP,0x0100,mode+" CBW stack balance");
   assertFlags(state,mode+" CBW FLAGS preserved");
  }
 });
}
const cwdValues=[0x0000,0x0001,0x0002,0x007F,0x00FF,0x0100,0x1234,0x7FFE,0x7FFF,0x8000,0x8001,0x80FF,0xFF00,0xFFFE,0xFFFF,0xA55A];
for(const value of cwdValues){
 const hex=value.toString(16).padStart(4,"0");
 test("CWD sign extension AX="+hex,()=>{
  const source="MOV SP,0100h\nMOV CX,0FD7h\nPUSH CX\nPOPF\nMOV AX,"+hex+"h\nCWD\nHLT";
  const {src,bin}=runBoth(source);
  const expected=(value&0x8000)?0xFFFF:0x0000;
  for(const [mode,state] of [["source",src],["binary",bin]]){
   assert.equal(state.reg.AX,value,mode+" CWD preserves AX");
   assert.equal(state.reg.DX,expected,mode+" CWD result");
   assert.equal(state.reg.SP,0x0100,mode+" CWD stack balance");
   assertFlags(state,mode+" CWD FLAGS preserved");
  }
 });
}
test("CBW/CWD/NOP/HLT exact opcodes and disassembly",()=>{
 const assembled=api.assemble("CBW\nCWD\nNOP\nHLT");
 assert.deepEqual(Array.from(assembled.bytes),[0x98,0x99,0x90,0xF4]);
 const decoded=api.disassemble([0x98,0x99,0x90,0xF4]);
 const expectedNames=["CBW","CWD","NOP","HLT"];
 const expectedBytes=[[0x98],[0x99],[0x90],[0xF4]];
 assert.equal(decoded.rows.length,4);
 for(let i=0;i<4;i++){
  assert.equal(decoded.rows[i].instruction,expectedNames[i]);
  assert.equal(Array.from(decoded.rows[i].bytes).join(","),expectedBytes[i].join(","));
 }
});
test("NOP preserves registers and FLAGS before continuing",()=>{
 const source="MOV SP,0100h\nMOV CX,0FD7h\nPUSH CX\nPOPF\nMOV AX,1234h\nNOP\nMOV BX,5678h\nHLT";
 const {src,bin}=runBoth(source);
 for(const [mode,state] of [["source",src],["binary",bin]]){
  assert.equal(state.reg.AX,0x1234,mode+" NOP preserves AX");
  assert.equal(state.reg.BX,0x5678,mode+" executes following instruction");
  assert.equal(state.reg.SP,0x0100,mode+" stack balance");
  assertFlags(state,mode+" NOP FLAGS preserved");
 }
});
test("HLT stops execution and preserves architectural state",()=>{
 const source="MOV SP,0100h\nMOV CX,0FD7h\nPUSH CX\nPOPF\nMOV AX,1234h\nHLT\nMOV BX,5678h";
 const {src,bin}=runBoth(source);
 for(const [mode,state] of [["source",src],["binary",bin]]){
  assert.equal(state.reg.AX,0x1234,mode+" HLT preserves AX");
  assert.equal(state.reg.BX,0,mode+" HLT stops before following instruction");
  assert.equal(state.reg.SP,0x0100,mode+" stack balance");
  assertFlags(state,mode+" HLT FLAGS preserved");
 }
});
for(const invalid of ["CBW AX","CWD AX","NOP AX","HLT AX"]){
 test("No-operand instruction rejects "+invalid,()=>{
  assert.throws(()=>api.assemble(invalid));
  assert.ok(api.execute(invalid).error);
 });
}
console.log("8086 CBW/CWD/NOP/HLT audit: "+passed+" passed, "+failed+" failed.");
console.log("CBW 256 values; CWD 16 sign boundaries; source/binary; opcodes 98h,99h,90h,F4h.");
if(failed)process.exit(1);
