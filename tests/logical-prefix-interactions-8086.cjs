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
const injection = "\nglobalThis.__logicPrefixApi = {" +
  "\n assemble: s => assembleProgram(s)," +
  "\n disassemble: b => disassembleBytes(b)," +
  "\n execute: s => executeAll(s)," +
  "\n binary: (b,c,i,st) => executeBinary(b,c,i,st)" +
  "\n};\n})();\n";
const instrumented = match[1].replace(/\n\}\)\(\);\s*$/, injection);
assert.notEqual(instrumented, match[1]);
vm.runInContext(instrumented, context, { timeout: 30000 });
const api = context.__logicPrefixApi;
assert.ok(api);

const OPS = [
  { name:"AND", base:0x20, memory:(a,b)=>a&b },
  { name:"OR", base:0x08, memory:(a,b)=>a|b },
  { name:"XOR", base:0x30, memory:(a,b)=>a^b },
  { name:"TEST", base:0x84, memory:(a,b)=>a&b }
];
const SEG = [
  {name:"ES",prefix:0x26,value:0x2000},
  {name:"CS",prefix:0x2E,value:0x0000},
  {name:"SS",prefix:0x36,value:0x3000},
  {name:"DS",prefix:0x3E,value:0x1000}
];
let assertions=0, segmentCases=0;
function check(v,m){assert.ok(v,m);assertions++;}
function same(a,b,m){assert.deepEqual(a,b,m);assertions++;}
function assemble(s){return Array.from(api.assemble(s).bytes);}
function decodeOne(bytes,mnemonic,label){
  const d=api.disassemble(bytes);
  check(d.rows.length===1,label+" one row");
  same(Array.from(d.rows[0].bytes),bytes,label+" exact bytes");
  check(d.rows[0].instruction.startsWith(mnemonic+" ") ||
    d.rows[0].instruction.startsWith("LOCK "+mnemonic+" "),label+" mnemonic");
}
function physical(seg,off){return (((seg&0xFFFF)<<4)+(off&0xFFFF))&0xFFFFF;}

// Segment override applicability across AND/OR/XOR both directions and TEST's
// sole r/m,reg form. DS:[BX] is default and is canonically emitted without 3Eh.
for(const op of OPS){
  for(const seg of SEG){
    const directions=op.name==="TEST"?["memory-destination"]:["memory-destination","memory-source"];
    for(const direction of directions){
      const instruction=direction==="memory-destination"
        ? op.name+" BYTE PTR [BX], CL"
        : op.name+" CL, BYTE PTR [BX]";
      const source=[
        "MOV AX,1000h","MOV DS,AX",
        "MOV AX,2000h","MOV ES,AX",
        "MOV AX,3000h","MOV SS,AX",
        "MOV BX,0200h",
        "MOV BYTE PTR "+seg.name+":[BX],0F0h",
        "MOV CL,0Fh","CLC",
        seg.name+":",instruction,"HLT"
      ].join("\n");
      const segmentPrefix=seg.name==="DS"?[]:[seg.prefix];
      const opcode=op.base+(direction==="memory-source"?(op.name==="TEST"?0:2):0);
      const modrm=0x0F; // MOD=00, REG=CL, R/M=[BX].
      const expected=[...segmentPrefix,opcode,modrm];
      const stream=assemble(source);
      const at=stream.length-1-expected.length;
      same(stream.slice(at,at+expected.length),expected,op.name+" "+seg.name+" "+direction+" bytes");
      decodeOne(expected,op.name,op.name+" "+seg.name+" "+direction);
      const sourceState=api.execute(source),binaryState=api.binary(stream,0,0,{});
      const addr=physical(seg.value,0x0200);
      const expectedResult=op.memory(direction==="memory-destination"?0xF0:0x0F,
        direction==="memory-destination"?0x0F:0xF0)&0xFF;
      for(const [mode,state] of [["source",sourceState],["binary",binaryState]]){
        check(state.error===undefined,op.name+" "+seg.name+" "+mode+" execution");
        if(direction==="memory-destination"){
          const expectedMemory=op.name==="TEST"?0xF0:expectedResult;
          same(state.mem[addr],expectedMemory,op.name+" "+seg.name+" "+mode+" memory");
        }else{
          same(state.reg.CX&0xFF,expectedResult,op.name+" "+seg.name+" "+mode+" register");
          same(state.mem[addr],0xF0,op.name+" "+seg.name+" "+mode+" source unchanged");
        }
      }
      segmentCases++;
    }
  }
}
check(segmentCases===28,"AND/OR/XOR two directions and TEST memory destination across four segments");

// Repeat prefixes are not applicable to these non-string logical instructions.
for(const op of OPS)for(const prefix of ["REP","REPE","REPNE"]){
  let rejected=false;
  try{api.assemble(prefix+"\n"+op.name+" AL, BL");}catch(_){rejected=true;}
  check(rejected,prefix+" rejected before "+op.name);
}
for(const op of OPS)for(const seg of SEG){
  let rejected=false;
  try{api.assemble(seg.name+":\n"+op.name+" AX, BX");}catch(_){rejected=true;}
  check(rejected,seg.name+" override rejected without memory for "+op.name);
}
for(const source of [
  "ES:\nCS:\nAND BYTE PTR [BX], CL",
  "ES:\nAND BYTE PTR ES:[BX], CL",
  "REP\nLOCK\nXOR AX, BX",
  "LOCK\nREP\nOR AX, BX"
]){
  let rejected=false;
  try{api.assemble(source);}catch(_){rejected=true;}
  check(rejected,"invalid duplicate prefix sequence rejected");
}

// LOCK prefix bytes on memory read-modify-write AND/OR/XOR forms.
for(const op of OPS.slice(0,3)){
  const source="MOV BX,0200h\nMOV BYTE PTR [BX],0F0h\nMOV CL,0Fh\nLOCK\n"+
    op.name+" BYTE PTR [BX], CL\nHLT";
  const stream=assemble(source);
  const at=stream.lastIndexOf(0xF0); // avoid matching the 0F0h data immediate
  check(at>=0,"LOCK emitted for "+op.name);
  same(stream.slice(at,at+3),[0xF0,op.base,0x0F],"LOCK "+op.name+" encoding");
  decodeOne([0xF0,op.base,0x0F],op.name,"LOCK "+op.name+" decode");
}
console.log("Logical prefix audit: "+segmentCases+" segment-override source/binary cases; REP rejection; segment-without-memory rejection; duplicate-prefix rejection; LOCK AND/OR/XOR memory forms.");
console.log("Assertions: "+assertions+" passed.");
