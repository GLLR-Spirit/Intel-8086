const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};
vm.createContext(context);
const injection="\nglobalThis.api={assemble:s=>assembleProgram(s),disassemble:b=>disassembleBytes(b),execute:s=>executeAll(s),binary:(b,c,i,s)=>executeBinary(b,c,i,s)};\n})();\n";
const instrumented=match[1].replace(/\n\}\)\(\);\s*$/,injection);assert.notEqual(instrumented,match[1]);
vm.runInContext(instrumented,context,{timeout:30000});
const api=context.api;assert.ok(api);
const allFlags=["CF","PF","AF","ZF","SF","TF","IF","DF","OF"];
function checkFlags(state,expected){for(const flag of allFlags)assert.equal(state.flags[flag],expected[flag],flag+" preserved");}
function checkMemory(state,segment,offset,value){const physical=(((segment&65535)<<4)+(offset&65535))&0xfffff;assert.equal(state.mem[physical],value,"memory "+segment.toString(16)+":"+offset.toString(16));}
const source=[
 "MOV AX, 1000h","MOV DS, AX","MOV AX, 2000h","MOV ES, AX",
 "MOV SI, 0100h","MOV DI, 0200h","MOV BYTE PTR [SI], 41h",
 "MOV BYTE PTR [SI+1], 42h","MOV AX, 0BD5h","PUSH AX","POPF",
 "CLD","MOV CX, 2","LOCK REP MOVSB","HLT"
].join("\n");
const assembled=api.assemble(source),bytes=Array.from(assembled.bytes),lockIndex=bytes.indexOf(0xF0);
assert.ok(lockIndex>=0,"LOCK prefix must be emitted");
assert.deepEqual(bytes.slice(lockIndex,lockIndex+3),[0xF0,0xF3,0xA4],"LOCK REP MOVSB encoding");
const decoded=api.disassemble(bytes).rows;
assert.equal(decoded.find(r=>r.instruction.includes("MOVSB")).instruction,"LOCK REP MOVSB");
for(const [mode,state] of [["source",api.execute(source)],["binary",api.binary(bytes,0,0,{})]]){
 assert.equal(state.error,undefined,mode+" execution");
 assert.equal(state.reg.CX,0,mode+" CX exhausted");
 assert.equal(state.reg.SI,0x102,mode+" SI advanced");
 assert.equal(state.reg.DI,0x202,mode+" DI advanced");
 checkMemory(state,0x2000,0x200,0x41);checkMemory(state,0x2000,0x201,0x42);
 checkFlags(state,{CF:1,PF:1,AF:1,ZF:1,SF:1,TF:1,IF:1,DF:0,OF:1});
 assert.equal(state.reg.SP,0xFFFE,"PUSHF/POPF stack balanced");
}
const regSource="MOV AX, 1\nLOCK INC AX\nHLT";
const regBytes=Array.from(api.assemble(regSource).bytes);
assert.deepEqual(regBytes.slice(3,5),[0xF0,0x40],"LOCK INC AX must remain encodable on original 8086");
assert.equal(api.disassemble(regBytes).rows[1].instruction,"LOCK INC AX");
for(const [mode,state] of [["source",api.execute(regSource)],["binary",api.binary(regBytes,0,0,{})]]){
 assert.equal(state.error,undefined,mode+" LOCK INC AX");
 assert.equal(state.reg.AX,2,mode+" LOCK INC AX result");
}
console.log("8086 LOCK prefix: LOCK INC AX and LOCK REP MOVSB pass source, encoding, disassembly and binary execution checks; bus-lock signalling remains outside the software model.");
