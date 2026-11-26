const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};
vm.createContext(context);
const injection="\nglobalThis.api={assemble:s=>assembleProgram(s),disassemble:(b,maxRows)=>disassembleBytes(b,maxRows),execute:s=>executeAll(s),binary:(b,c,i,s)=>executeBinary(b,c,i,s)};\n})();\n";
const instrumented=match[1].replace(/\n\}\)\(\);\s*$/,injection);assert.notEqual(instrumented,match[1]);
vm.runInContext(instrumented,context,{timeout:30000});
const api=context.api;
const regs=["AX","CX","DX","BX","SP","BP","SI","DI"];
function bytes(source){return Array.from(api.assemble(source).bytes);}
function one(code){const r=api.disassemble(code).rows;assert.equal(r.length,1);return r[0].instruction;}
for(let i=0;i<8;i++){
 assert.deepEqual(bytes("PUSH "+regs[i]),[0x50+i],"PUSH "+regs[i]);
 assert.deepEqual(bytes("POP "+regs[i]),[0x58+i],"POP "+regs[i]);
 assert.equal(one([0x50+i]),"PUSH "+regs[i]);
 assert.equal(one([0x58+i]),"POP "+regs[i]);
}
const segments=[["ES",0x06,0x07],["CS",0x0E,null],["SS",0x16,0x17],["DS",0x1E,0x1F]];
for(const [seg,push,pop] of segments){
 assert.deepEqual(bytes("PUSH "+seg),[push],"PUSH "+seg);
 assert.equal(one([push]),"PUSH "+seg);
 if(pop!==null){assert.deepEqual(bytes("POP "+seg),[pop],"POP "+seg);assert.equal(one([pop]),"POP "+seg);}
}
assert.deepEqual(bytes("PUSHF"),[0x9C]);assert.deepEqual(bytes("POPF"),[0x9D]);
assert.equal(one([0x9C]),"PUSHF");assert.equal(one([0x9D]),"POPF");
for(let mod=0;mod<4;mod++)for(let ext=0;ext<8;ext++)for(let rm=0;rm<8;rm++){
 const d=mod===0&&rm===6?[0x34,0x12]:mod===1?[0xFC]:mod===2?[0x00,0x80]:[];
 const code=[0xFF,(mod<<6)|(ext<<3)|rm,...d];let decoded;try{decoded=api.disassemble(code).rows[0].instruction;}catch(error){throw new Error("FF /"+ext+" mod="+mod+" rm="+rm+" bytes="+code.map(x=>x.toString(16)).join(" ")+": "+error.message);}
 if(ext===7||(mod===3&&[3,5,6].includes(ext)))assert.ok(decoded.startsWith("DB "),"FF /"+ext+" invalid for mod="+mod+": "+decoded);
 else assert.ok(!decoded.startsWith("DB "),"FF /"+ext+" must decode for mod="+mod+" rm="+rm+": "+decoded);
}
assert.deepEqual(bytes("PUSH WORD PTR [BX]"),[0xFF,0x37]);
assert.deepEqual(bytes("PUSH WORD PTR [BP+SI+4]"),[0xFF,0x72,0x04]);
assert.deepEqual(bytes("POP WORD PTR [BX]"),[0x8F,0x07]);
assert.deepEqual(bytes("POP WORD PTR [BP+SI+4]"),[0x8F,0x42,0x04]);
for(const source of ["PUSH 1234h","PUSH BYTE PTR [BX]","POP CS","POP BYTE PTR [BX]"])assert.throws(()=>api.assemble(source),source+" must be rejected");
for(const code of [[0x68,0x34,0x12],[0x6A,0x01]])assert.ok(api.disassemble(code,1).rows[0].instruction.startsWith("DB "),"Immediate PUSH is not 8086");
function executeBoth(source,initial){
 const b=bytes(source),a=api.execute(source),d=api.binary(b,0,0,initial||{});
 assert.equal(a.error,undefined,"source "+a.error);assert.equal(d.error,undefined,"binary "+d.error);
 for(const reg of ["AX","BX","CX","DX","SP","BP","SI","DI","CS","DS","ES","SS"])
  assert.equal(a.reg[reg],d.reg[reg],"source/binary "+reg+" for "+source);
 for(const flag of ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"])
  assert.equal(a.flags[flag],d.flags[flag],"source/binary "+flag+" for "+source);
 return [["source",a],["binary",d]];
}
// Execute all compact PUSH/POP register forms in both engines.
for(const reg of regs.filter(r=>r!=="SP")){
 for(const [mode,state] of executeBoth("MOV SP,2000h\nMOV "+reg+",0BEEFh\nPUSH "+reg+"\nMOV DX,0\nPOP DX\nHLT"))
  {assert.equal(state.reg.DX,0xBEEF,mode+" PUSH "+reg+" / POP DX");assert.equal(state.reg.SP,0x2000,mode+" stack balance "+reg);}
 for(const [mode,state] of executeBoth("MOV SP,2000h\nMOV AX,0BEEFh\nPUSH AX\nMOV "+reg+",0\nPOP "+reg+"\nHLT"))
  {assert.equal(state.reg[reg],0xBEEF,mode+" POP "+reg);assert.equal(state.reg.SP,0x2000,mode+" stack balance POP "+reg);}
}
for(const [mode,state] of executeBoth("MOV SP,2000h\nMOV AX,0BEEFh\nPUSH AX\nPOP SP\nHLT"))
 assert.equal(state.reg.SP,0xBEEF,mode+" POP SP loads popped value");

// Execute memory PUSH/POP through all eight effective-address forms.
// BP-based forms must select SS; the other six forms must select DS.
function physical(seg,off){return (((seg&0xFFFF)<<4)+(off&0xFFFF))&0xFFFFF;}
const eaForms=[
 {expr:"[BX+SI]",segment:"DS",setup:["MOV BX,0200h","MOV SI,0200h"]},
 {expr:"[BX+DI]",segment:"DS",setup:["MOV BX,0200h","MOV DI,0200h"]},
 {expr:"[BP+SI]",segment:"SS",setup:["MOV BP,0200h","MOV SI,0200h"]},
 {expr:"[BP+DI]",segment:"SS",setup:["MOV BP,0200h","MOV DI,0200h"]},
 {expr:"[SI]",segment:"DS",setup:["MOV SI,0400h"]},
 {expr:"[DI]",segment:"DS",setup:["MOV DI,0400h"]},
 {expr:"[BP]",segment:"SS",setup:["MOV BP,0400h"]},
 {expr:"[BX]",segment:"DS",setup:["MOV BX,0400h"]}
];
for(const form of eaForms){
 const pushSource=[
  "MOV AX,0BD5h","PUSH AX","POPF","MOV AX,1000h","MOV DS,AX",
  "MOV AX,3000h","MOV SS,AX","MOV WORD PTR DS:[0400h],0BEEFh",
  "MOV WORD PTR SS:[0400h],0BEEFh","MOV SP,2000h",...form.setup,
  "PUSH WORD PTR "+form.expr,"POP DX","HLT"
 ].join("\n");
 for(const [mode,state] of executeBoth(pushSource)){
  assert.equal(state.reg.DX,0xBEEF,mode+" PUSH "+form.expr+" reads selected segment");
  assert.equal(state.reg.SP,0x2000,mode+" PUSH "+form.expr+" balances stack");
  const selected=physical(form.segment==="SS"?0x3000:0x1000,0x0400);
  const other=physical(form.segment==="SS"?0x1000:0x3000,0x0400);
  assert.equal(state.mem[selected],0xEF,mode+" PUSH "+form.expr+" source low unchanged");
  assert.equal(state.mem[selected+1],0xBE,mode+" PUSH "+form.expr+" source high unchanged");
  assert.equal(state.mem[other],0xEF,mode+" PUSH "+form.expr+" other segment unchanged");
 }
 const popSource=[
  "MOV AX,0BD5h","PUSH AX","POPF","MOV AX,1000h","MOV DS,AX",
  "MOV AX,3000h","MOV SS,AX","MOV WORD PTR DS:[0400h],01234h",
  "MOV WORD PTR SS:[0400h],01234h","MOV AX,0CAFEh","MOV SP,2000h",
  "PUSH AX",...form.setup,"POP WORD PTR "+form.expr,"HLT"
 ].join("\n");
 for(const [mode,state] of executeBoth(popSource)){
  assert.equal(state.reg.SP,0x2000,mode+" POP "+form.expr+" balances stack");
  const selected=physical(form.segment==="SS"?0x3000:0x1000,0x0400);
  const other=physical(form.segment==="SS"?0x1000:0x3000,0x0400);
  assert.equal(state.mem[selected],0xFE,mode+" POP "+form.expr+" destination low");
  assert.equal(state.mem[selected+1],0xCA,mode+" POP "+form.expr+" destination high");
  assert.equal(state.mem[other],0x34,mode+" POP "+form.expr+" other segment unchanged");
  assert.equal(state.mem[other+1],0x12,mode+" POP "+form.expr+" other segment high unchanged");
 }
}
for(const [mode,state] of executeBoth("MOV SP, 2000h\nPUSH SP\nHLT")){
 assert.equal(state.reg.SP,0x1FFE,mode+" PUSH SP decrements SP");
 const physical=0x1FFE;assert.equal(state.mem[physical],0xFE,mode+" PUSH SP stores decremented SP low byte");assert.equal(state.mem[physical+1],0x1F,mode+" PUSH SP stores decremented SP high byte");
}
for(const [mode,state] of executeBoth("MOV WORD PTR [2000h], 1234h\nMOV SP, 2000h\nPOP SP\nHLT")){
 assert.equal(state.reg.SP,0x1234,mode+" POP SP loads popped value after increment");
}
for(const [mode,state] of executeBoth("MOV AX, 3000h\nPUSH AX\nPOP SS\nHLT")){
 assert.equal(state.reg.SS,0x3000,mode+" POP SS");
 assert.equal(state.reg.SP,0xFFFE,mode+" POP SS stack balanced");
}
for(const [mode,state] of executeBoth("MOV AX, 3000h\nPUSH AX\nPOP DS\nHLT"))assert.equal(state.reg.DS,0x3000,mode+" POP DS");
for(const [mode,state] of executeBoth("MOV AX, 3000h\nPUSH AX\nPOP ES\nHLT"))assert.equal(state.reg.ES,0x3000,mode+" POP ES");
for(const [mode,state] of executeBoth("PUSH CS\nPOP DS\nHLT"))assert.equal(state.reg.DS,0,mode+" PUSH CS / POP DS");
for(const [mode,state] of executeBoth("PUSH SS\nPOP ES\nHLT"))assert.equal(state.reg.ES,0,mode+" PUSH SS / POP ES");
for(const [mode,state] of executeBoth("PUSH DS\nPOP ES\nHLT"))assert.equal(state.reg.ES,0,mode+" PUSH DS / POP ES");
// Complete segment-register PUSH execution, including ES.
for(const [mode,state] of executeBoth("MOV AX,2000h\nMOV ES,AX\nMOV AX,0\nPUSH ES\nMOV ES,AX\nPOP ES\nHLT")){
 assert.equal(state.reg.ES,0x2000,mode+" PUSH ES / POP ES");
 assert.equal(state.reg.SP,0xFFFE,mode+" PUSH ES / POP ES stack balance");
}

// Explicit segment overrides for memory PUSH and POP, across all four segments.
const segmentOverrides=[["ES",0x2000],["CS",0x0000],["SS",0x3000],["DS",0x1000]];
for(const [segment,segValue] of segmentOverrides){
 const setup=[
  "MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX",
  "MOV AX,3000h","MOV SS,AX",
  "MOV WORD PTR DS:[0400h],0BEEFh",
  "MOV WORD PTR ES:[0400h],0BEEFh",
  "MOV WORD PTR SS:[0400h],0BEEFh",
  "MOV WORD PTR CS:[0400h],0BEEFh",
  "MOV BX,0400h","MOV SP,2000h"
 ];
 const pushSource=[...setup,"PUSH WORD PTR "+segment+":[BX]","POP DX","HLT"].join("\n");
 for(const [mode,state] of executeBoth(pushSource)){
  assert.equal(state.reg.DX,0xBEEF,mode+" PUSH "+segment+" override");
  assert.equal(state.reg.SP,0x2000,mode+" PUSH "+segment+" stack balance");
  const selected=physical(segValue,0x0400);
  assert.equal(state.mem[selected],0xEF,mode+" PUSH "+segment+" source low unchanged");
  assert.equal(state.mem[selected+1],0xBE,mode+" PUSH "+segment+" source high unchanged");
 }
 const popSetup=[
  "MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX",
  "MOV AX,3000h","MOV SS,AX",
  "MOV WORD PTR DS:[0400h],01234h",
  "MOV WORD PTR ES:[0400h],01234h",
  "MOV WORD PTR SS:[0400h],01234h",
  "MOV WORD PTR CS:[0400h],01234h",
  "MOV AX,0CAFEh","MOV SP,2000h","PUSH AX","MOV BX,0400h",
  "POP WORD PTR "+segment+":[BX]","HLT"
 ];
 for(const [mode,state] of executeBoth(popSetup.join("\n"))){
  assert.equal(state.reg.SP,0x2000,mode+" POP "+segment+" stack balance");
  const selected=physical(segValue,0x0400);
  assert.equal(state.mem[selected],0xFE,mode+" POP "+segment+" destination low");
  assert.equal(state.mem[selected+1],0xCA,mode+" POP "+segment+" destination high");
 }
}
const flagsSource="MOV AX, 0BD5h\nPUSH AX\nPOPF\nPUSHF\nPOP BX\nHLT";
for(const [mode,state] of executeBoth(flagsSource)){
 assert.equal(state.reg.BX&0x0FD5,0x0BD5,mode+" PUSHF returns all nine modeled flag bits");
 assert.equal(state.reg.SP,0xFFFE,mode+" PUSHF/POPF balanced");
 for(const flag of ["CF","PF","AF","ZF","SF","TF","IF","OF"])assert.equal(state.flags[flag],1,mode+" "+flag);
 assert.equal(state.flags.DF,0,mode+" DF");
}
console.log("8086 PUSH/POP: eight compact register forms, segment forms, FF /6 memory-only, 8F /0 register/memory, PUSH SP/POP SP 8086 semantics, FLAGS, source and binary PASS.");
