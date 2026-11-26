const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match);
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, value: "", textContent: "", innerHTML: "", className: "",
    dataset: {}, onclick: null, oninput: null, onchange: null
  });
  return elements.get(id);
}
const context = {
  document: { getElementById: element, querySelectorAll: () => [] },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  console
};
vm.createContext(context);
const injection = "\nglobalThis.__notFormsApi = {" +
  "\n assemble: s => assembleProgram(s)," +
  "\n disassemble: b => disassembleBytes(b)," +
  "\n execute: s => executeAll(s)," +
  "\n binary: (b,c,i,st) => executeBinary(b,c,i,st)" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1]);
vm.runInContext(instrumented, context, { timeout: 30000 });
const api = context.__notFormsApi;
assert.ok(api);

const REG8 = ["AL","CL","DL","BL","AH","CH","DH","BH"];
const REG16 = ["AX","CX","DX","BX","SP","BP","SI","DI"];
const EA = ["BX+SI","BX+DI","BP+SI","BP+DI","SI","DI","BP","BX"];
const SEG = [
  { name:"ES", prefix:0x26, value:0x2000 },
  { name:"CS", prefix:0x2E, value:0x0000 },
  { name:"SS", prefix:0x36, value:0x3000 },
  { name:"DS", prefix:0x3E, value:0x1000 }
];
let assertions = 0;
function same(a,b,m){assert.deepEqual(a,b,m);assertions++;}
function check(v,m){assert.ok(v,m);assertions++;}
function modrm(mod,rm){return (mod<<6)|(2<<3)|rm;}
function disp(mod,rm){
  if(mod===0&&rm===6)return [0x34,0x12];
  if(mod===1)return [0x01];
  if(mod===2)return [0x00,0x01];
  return [];
}
function expr(mod,rm){
  if(mod===0&&rm===6)return "[4660]";
  if(mod===0)return "["+EA[rm]+"]";
  if(mod===1)return "["+EA[rm]+"+1]";
  return "["+EA[rm]+"+256]";
}
function assemble(s){return Array.from(api.assemble(s).bytes);}
function decode(bytes,mnemonic,label){
  const d=api.disassemble(bytes);
  check(d.rows.length===1,label+" one instruction: "+JSON.stringify(d.rows));
  same(Array.from(d.rows[0].bytes),bytes,label+" exact byte length");
  check(d.rows[0].instruction.startsWith(mnemonic+" ") ||
    d.rows[0].instruction.startsWith("LOCK "+mnemonic+" "),label+" mnemonic");
}

// A. All register-direct forms: F6 /2 r/m8 and F7 /2 r/m16.
for(let rm=0;rm<8;rm++){
  const byte=[0xF6,modrm(3,rm)];
  const word=[0xF7,modrm(3,rm)];
  same(assemble("NOT "+REG8[rm]),byte,"NOT "+REG8[rm]+" encoding");
  decode(byte,"NOT","NOT "+REG8[rm]+" decode");
  same(assemble("NOT "+REG16[rm]),word,"NOT "+REG16[rm]+" encoding");
  decode(word,"NOT","NOT "+REG16[rm]+" decode");
}

// B. Every memory addressing mode and displacement size, byte and word.
let memoryForms=0;
for(const [opcode,width] of [[0xF6,8],[0xF7,16]]){
  for(let mod=0;mod<3;mod++){
    for(let rm=0;rm<8;rm++){
      const source="NOT "+(width===8?"BYTE PTR ":"WORD PTR ")+expr(mod,rm);
      const expected=[opcode,modrm(mod,rm),...disp(mod,rm)];
      same(assemble(source),expected,source+" encoding");
      decode(expected,"NOT",source+" decode");
      memoryForms++;
    }
  }
}
check(memoryForms===48,"2 widths × 3 displacement modes × 8 r/m forms");

function physical(seg,off){return ((((seg&0xFFFF)<<4)+(off&0xFFFF))&0xFFFFF);}
function readRegister(state,reg,bits){
 if(bits===16)return state.reg[reg];
 const parent=reg[0]+"X";
 return reg==="AH"||reg==="CH"||reg==="DH"||reg==="BH"
   ?(state.reg[parent]>>8)&255:state.reg[parent]&255;
}
function executeBoth(source){
 const bytes=assemble(source),src=api.execute(source),bin=api.binary(bytes,0,0,{});
 check(src.error===undefined,"NOT source execution: "+src.error);
 check(bin.error===undefined,"NOT binary execution: "+bin.error);
 for(const reg of ["AX","BX","CX","DX","SP","BP","SI","DI","CS","DS","ES","SS"])
  same(src.reg[reg],bin.reg[reg],"NOT source/binary "+reg);
 for(const flag of ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"])
  same(src.flags[flag],bin.flags[flag],"NOT source/binary "+flag);
 return [["source",src],["binary",bin]];
}
const initialNotFlags=0x0FD7;
const notFlags=["CF","PF","AF","ZF","SF","TF","IF","DF","OF"];
let registerExecutionCases=0;
for(const [bits,regs,input,expected] of [
 [8,REG8,0x55,0xAA],
 [16,REG16,0x55AA,0xAA55]
]){
 for(const reg of regs){
  const source=[
   "MOV SP,0100h","MOV CX,"+initialNotFlags.toString(16)+"h","PUSH CX","POPF",
   "MOV "+reg+","+input.toString(16)+"h","NOT "+reg,"HLT"
  ].join("\n");
  for(const [mode,state] of executeBoth(source)){
   same(readRegister(state,reg,bits),expected,mode+" NOT "+reg+" result");
   if(reg!=="SP")same(state.reg.SP,0x0100,mode+" NOT "+reg+" stack seed balanced");
   for(const flag of notFlags){
    const bit={CF:1,PF:4,AF:16,ZF:64,SF:128,TF:256,IF:512,DF:1024,OF:2048}[flag];
    same(state.flags[flag],(initialNotFlags&bit)?1:0,mode+" NOT "+reg+" preserves "+flag);
   }
  }
  registerExecutionCases++;
 }
}
check(registerExecutionCases===16,"NOT execution across all 8 byte and 8 word registers");

const notEA=[
 {expr:"[BX+SI]",segment:"DS",setup:["MOV BX,0200h","MOV SI,0200h"]},
 {expr:"[BX+DI]",segment:"DS",setup:["MOV BX,0200h","MOV DI,0200h"]},
 {expr:"[BP+SI]",segment:"SS",setup:["MOV BP,0200h","MOV SI,0200h"]},
 {expr:"[BP+DI]",segment:"SS",setup:["MOV BP,0200h","MOV DI,0200h"]},
 {expr:"[SI]",segment:"DS",setup:["MOV SI,0400h"]},
 {expr:"[DI]",segment:"DS",setup:["MOV DI,0400h"]},
 {expr:"[BP]",segment:"SS",setup:["MOV BP,0400h"]},
 {expr:"[BX]",segment:"DS",setup:["MOV BX,0400h"]}
];
let memoryExecutionCases=0;
for(const [bits,width,input,expected] of [
 [8,"BYTE",0x55,0xAA],
 [16,"WORD",0x55AA,0xAA55]
]){
 for(const form of notEA){
  const source=[
   "MOV AX,1000h","MOV DS,AX","MOV AX,3000h","MOV SS,AX",
   "MOV "+width+" PTR DS:[0400h],"+input.toString(16)+"h",
   "MOV "+width+" PTR SS:[0400h],"+input.toString(16)+"h",
   "MOV CX,"+initialNotFlags.toString(16)+"h","PUSH CX","POPF",
   "MOV SP,2000h",...form.setup,
   "NOT "+width+" PTR "+form.expr,"HLT"
  ].join("\n");
  const selected=physical(form.segment==="SS"?0x3000:0x1000,0x0400);
  const other=physical(form.segment==="SS"?0x1000:0x3000,0x0400);
  for(const [mode,state] of executeBoth(source)){
   same(state.mem[selected],expected&255,mode+" NOT "+form.expr+" selected low");
   if(bits===16)same(state.mem[(selected+1)&0xFFFFF],expected>>8,mode+" NOT "+form.expr+" selected high");
   same(state.mem[other],input&255,mode+" NOT "+form.expr+" other segment unchanged");
   if(bits===16)same(state.mem[(other+1)&0xFFFFF],input>>8,mode+" NOT "+form.expr+" other segment high unchanged");
   for(const flag of notFlags){
    const bit={CF:1,PF:4,AF:16,ZF:64,SF:128,TF:256,IF:512,DF:1024,OF:2048}[flag];
    same(state.flags[flag],(initialNotFlags&bit)?1:0,mode+" NOT "+form.expr+" preserves "+flag);
   }
  }
  memoryExecutionCases++;
 }
}
check(memoryExecutionCases===16,"NOT memory execution across 8 EA forms in byte and word");


// C. The reserved /1 extension remains data, never aliases NOT.
for(const [opcode,tail] of [[0xF6,[]],[0xF7,[]]]){
  const invalid=[opcode,0xC8]; // MOD=11, REG=/1 (reserved), R/M=AX
  const d=api.disassemble(invalid);
  check(d.rows[0].instruction.startsWith("DB "),opcode.toString(16)+" /1 is reserved");
}
for(const source of [
  "NOT AX, BX", "NOT 1", "NOT CS", "NOT BYTE PTR [BX], AL",
  "NOT WORD PTR [BX], AX", "NOT"
]){
  let rejected=false;
  try{api.assemble(source);}catch(_){rejected=true;}
  check(rejected,"invalid NOT operands rejected: "+source);
}

// D. Segment overrides on explicit memory operands; DS on [BX] is redundant.
for(const seg of SEG){
  const prefix=seg.name==="DS"?[]:[seg.prefix];
  const source=[
    "MOV AX,1000h","MOV DS,AX",
    "MOV AX,2000h","MOV ES,AX",
    "MOV AX,3000h","MOV SS,AX",
    "MOV BX,0200h",
    "MOV BYTE PTR "+seg.name+":[BX],55h",
    seg.name+":","NOT BYTE PTR [BX]","HLT"
  ].join("\n");
  const expected=[...prefix,0xF6,0x17];
  const bytes=assemble(source);
  const start=bytes.length-1-expected.length; // exclude trailing HLT
  same(bytes.slice(start,start+expected.length),expected,"NOT "+seg.name+" segment prefix bytes");
  decode(expected,"NOT","NOT "+seg.name+" decode");
  const sourceState=api.execute(source);
  const binaryState=api.binary(bytes,0,0,{});
  const address=((((seg.value&0xFFFF)<<4)+0x0200)&0xFFFFF);
  for(const [mode,state] of [["source",sourceState],["binary",binaryState]]){
    check(state.error===undefined,"NOT "+seg.name+" "+mode+" execution");
    same(state.mem[address],0xAA,"NOT "+seg.name+" "+mode+" selected segment");
  }
}

// E. LOCK attaches to the memory read-modify-write operation; REP is not applicable.
const locked="MOV BX,0200h\nMOV BYTE PTR [BX],55h\nLOCK\nNOT BYTE PTR [BX]\nHLT";
const lockedBytes=assemble(locked);
const lockAt=lockedBytes.indexOf(0xF0);
check(lockAt>=0,"LOCK emitted for NOT memory");
same(lockedBytes.slice(lockAt,lockAt+3),[0xF0,0xF6,0x17],"LOCK NOT memory bytes");
decode([0xF0,0xF6,0x17],"NOT","LOCK NOT decode");
for(const prefix of ["REP","REPE","REPNE"]){
  let rejected=false;
  try{api.assemble(prefix+"\nNOT AL");}catch(_){rejected=true;}
  check(rejected,prefix+" rejected before NOT");
}

// F. NOT preserves all modeled FLAGS in source and binary execution.
const flags=2|(1<<9)|(1<<10)|(1<<11)|(1<<7)|(1<<6)|(1<<4)|(1<<2)|1;
const setup=[
  "MOV AX,1000h","MOV DS,AX","MOV BX,0200h",
  "MOV BYTE PTR [BX],55h","MOV AX,"+flags.toString(16)+"h",
  "PUSH AX","POPF"
];
const source=setup.concat(["NOT BYTE PTR [BX]","HLT"]).join("\n");
const baseline=setup.concat(["HLT"]).join("\n");
const bytes=assemble(source);
const src=api.execute(source),bin=api.binary(bytes,0,0,{});
const baselineSource=api.execute(baseline);
const baselineBinary=api.binary(assemble(baseline),0,0,{});
for(const [mode,state,initial] of [
  ["source",src,baselineSource],["binary",bin,baselineBinary]
]){
  check(state.error===undefined,"NOT "+mode+" no error");
  same(state.mem[0x10200],0xAA,"NOT "+mode+" memory result");
  for(const flag of ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"])
    same(state.flags[flag],initial.flags[flag],"NOT "+mode+" preserves "+flag);
}
console.log("NOT independent audit: 16 register forms and 16 memory EA execution cases in source/binary; 48 memory encodings; /1 reserved; four segment overrides; LOCK; REP rejection; FLAGS preservation.");
console.log("Assertions: "+assertions+" passed.");
