const fs=require("node:fs");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8");
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match);
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};
vm.createContext(context);
const injection="\nglobalThis.__unaryPrefixApi={assemble:s=>assembleProgram(s),disassemble:b=>disassembleBytes(b),execute:s=>executeAll(s),binary:(b,c,i,st)=>executeBinary(b,c,i,st)};\n})();\n";
const instrumented=match[1].replace(/\n\}\)\(\);\s*$/,injection);
assert.notEqual(instrumented,match[1]);
vm.runInContext(instrumented,context,{timeout:30000});
const api=context.__unaryPrefixApi;
const OPS=[
 {name:"INC",byteOpcode:0xFE,wordOpcode:0xFF,ext:0,initial8:0x7F,result8:0x80,initial16:0x7FFF,result16:0x8000,cf:1,of:1},
 {name:"DEC",byteOpcode:0xFE,wordOpcode:0xFF,ext:1,initial8:0x80,result8:0x7F,initial16:0x8000,result16:0x7FFF,cf:1,of:1},
 {name:"NEG",byteOpcode:0xF6,wordOpcode:0xF7,ext:3,initial8:1,result8:0xFF,initial16:1,result16:0xFFFF,cf:1,of:0}
];
const SEG=[
 {name:"ES",prefix:0x26,value:0x2000},
 {name:"CS",prefix:0x2E,value:0},
 {name:"SS",prefix:0x36,value:0x3000},
 {name:"DS",prefix:0x3E,value:0x1000}
];
let assertions=0,cases=0;
function check(v,m){assert.ok(v,m);assertions++;}
function same(a,b,m){assert.deepEqual(a,b,m);assertions++;}
function assemble(s){return Array.from(api.assemble(s).bytes);}
function decode(bytes,mnemonic,label){
 const d=api.disassemble(bytes);
 check(d.rows.length===1,label+" one row");
 same(Array.from(d.rows[0].bytes),bytes,label+" exact length");
 check(d.rows[0].instruction.startsWith(mnemonic+" "),label+" mnemonic");
}
function physical(seg,off){return (((seg&0xFFFF)<<4)+(off&0xFFFF))&0xFFFFF;}
function modrm(ext){return (ext<<3)|7;}

// Segment overrides across byte/word INC, DEC and NEG memory operands.
for(const op of OPS)for(const seg of SEG)for(const bits of [8,16]){
 const initial=bits===8?op.initial8:op.initial16;
 const result=bits===8?op.result8:op.result16;
 const opcode=bits===8?op.byteOpcode:op.wordOpcode;
 const width=bits===8?"BYTE":"WORD";
 const prefix=seg.name==="DS"?[]:[seg.prefix];
 const source=[
  "MOV AX,1000h","MOV DS,AX",
  "MOV AX,2000h","MOV ES,AX",
  "MOV AX,3000h","MOV SS,AX",
  "MOV BX,0200h",
  "MOV "+width+" PTR "+seg.name+":[BX],"+initial.toString(16)+"h",
  "STC","STD",
  seg.name+":",op.name+" "+width+" PTR [BX]","HLT"
 ].join("\n");
 const instruction=[...prefix,opcode,modrm(op.ext)];
 const stream=assemble(source);
 const at=stream.length-1-instruction.length;
 same(stream.slice(at,at+instruction.length),instruction,op.name+" "+width+" "+seg.name+" encoding");
 decode(instruction,op.name,op.name+" "+width+" "+seg.name);
 const src=api.execute(source),bin=api.binary(stream,0,0,{});
 const addr=physical(seg.value,0x0200);
 for(const [mode,state] of [["source",src],["binary",bin]]){
  check(state.error===undefined,op.name+" "+width+" "+seg.name+" "+mode+" execution");
  if(bits===8){
   same(state.mem[addr],result,op.name+" "+width+" "+seg.name+" "+mode+" result");
  }else{
   same(state.mem[addr],result&0xFF,op.name+" "+width+" "+seg.name+" "+mode+" low byte");
   same(state.mem[(addr+1)&0xFFFFF],(result>>8)&0xFF,op.name+" "+width+" "+seg.name+" "+mode+" high byte");
  }
  same(state.flags.CF,op.cf,op.name+" "+width+" "+mode+" CF");
  same(state.flags.OF,op.of,op.name+" "+width+" "+mode+" OF");
  same(state.flags.DF,1,op.name+" "+width+" "+mode+" DF preserved");
 }
 cases++;
}
check(cases===24,"3 unary arithmetic operations × 4 segments × 2 widths");

function parity8(value){
 let n=value&0xFF,count=0;
 for(let i=0;i<8;i++)count+=(n>>i)&1;
 return count%2===0?1:0;
}
function expectedUnary(op,bits,input){
 const mask=bits===8?0xFF:0xFFFF,sign=bits===8?0x80:0x8000;
 const result=op.name==="INC"?(input+1)&mask:op.name==="DEC"?(input-1)&mask:(-input)&mask;
 let af=0;
 if(op.name==="INC")af=(input&15)===15?1:0;
 else if(op.name==="DEC")af=(input&15)===0?1:0;
 else af=(input&15)!==0?1:0;
 return {result,CF:op.name==="NEG"?(input===0?0:1):1,OF:op.of,
   AF:af,ZF:result===0?1:0,SF:(result&sign)?1:0,PF:parity8(result)};
}
function readRegister(state,reg,bits){
 if(bits===16)return state.reg[reg];
 const parent=reg[0]+"X";
 return reg==="AH"||reg==="CH"||reg==="DH"||reg==="BH"
   ?(state.reg[parent]>>8)&0xFF:state.reg[parent]&0xFF;
}
const regs8=["AL","CL","DL","BL","AH","CH","DH","BH"];
const regs16=["AX","CX","DX","BX","SP","BP","SI","DI"];
let registerCases=0;
for(const op of OPS)for(const bits of [8,16]){
 const initial=bits===8?op.initial8:op.initial16;
 const expected=expectedUnary(op,bits,initial);
 for(const reg of bits===8?regs8:regs16){
  const source=["MOV "+reg+", "+initial.toString(16)+"h","STC","STD",op.name+" "+reg,"HLT"].join("\n");
  const bytes=assemble(source);
  const states=[["source",api.execute(source)],["binary",api.binary(bytes,0,0,{})]];
  for(const [mode,state] of states){
   check(state.error===undefined,op.name+" "+reg+" "+mode+" register execution");
   same(readRegister(state,reg,bits),expected.result,op.name+" "+reg+" "+mode+" result");
   for(const flag of ["CF","OF","AF","ZF","SF","PF"])
    same(state.flags[flag],expected[flag],op.name+" "+reg+" "+mode+" "+flag);
   same(state.flags.DF,1,op.name+" "+reg+" "+mode+" DF preserved");
  }
  registerCases++;
 }
}
check(registerCases===48,"3 operations × 2 widths × 8 registers");
const defaultEA=[
 {expr:"[BX+SI]",segment:"DS",setup:["MOV BX,0100h","MOV SI,0100h"]},
 {expr:"[BX+DI]",segment:"DS",setup:["MOV BX,0100h","MOV DI,0100h"]},
 {expr:"[BP+SI]",segment:"SS",setup:["MOV BP,0100h","MOV SI,0100h"]},
 {expr:"[BP+DI]",segment:"SS",setup:["MOV BP,0100h","MOV DI,0100h"]},
 {expr:"[SI]",segment:"DS",setup:["MOV SI,0200h"]},
 {expr:"[DI]",segment:"DS",setup:["MOV DI,0200h"]},
 {expr:"[BP]",segment:"SS",setup:["MOV BP,0200h"]},
 {expr:"[BX]",segment:"DS",setup:["MOV BX,0200h"]}
];
let defaultEACases=0;
for(const op of OPS.filter(x=>x.name==="INC"||x.name==="DEC"))for(const bits of [8,16]){
 const initial=bits===8?op.initial8:op.initial16;
 const expected=expectedUnary(op,bits,initial);
 const width=bits===8?"BYTE":"WORD";
 for(const form of defaultEA){
  const source=[
   "MOV AX,1000h","MOV DS,AX","MOV AX,3000h","MOV SS,AX",
   "MOV "+width+" PTR DS:[0200h],"+initial.toString(16)+"h",
   "MOV "+width+" PTR SS:[0200h],"+initial.toString(16)+"h",
   ...form.setup,"STC","STD",op.name+" "+width+" PTR "+form.expr,"HLT"
  ].join("\n");
  const bytes=assemble(source);
  const states=[["source",api.execute(source)],["binary",api.binary(bytes,0,0,{})]];
  const selected=physical(form.segment==="SS"?0x3000:0x1000,0x0200);
  const other=physical(form.segment==="SS"?0x1000:0x3000,0x0200);
  for(const [mode,state] of states){
   check(state.error===undefined,op.name+" "+form.expr+" "+mode+" execution");
   const low=bits===8?expected.result:expected.result&0xFF;
   const high=(expected.result>>8)&0xFF;
   same(state.mem[selected],low,op.name+" "+form.expr+" "+mode+" selected segment low");
   if(bits===16)same(state.mem[(selected+1)&0xFFFFF],high,op.name+" "+form.expr+" "+mode+" selected segment high");
   same(state.mem[other],bits===8?initial:initial&0xFF,op.name+" "+form.expr+" "+mode+" other segment unchanged");
   if(bits===16)same(state.mem[(other+1)&0xFFFFF],(initial>>8)&0xFF,op.name+" "+form.expr+" "+mode+" other segment high unchanged");
   for(const flag of ["CF","OF","AF","ZF","SF","PF"])
    same(state.flags[flag],expected[flag],op.name+" "+form.expr+" "+mode+" "+flag);
   same(state.flags.DF,1,op.name+" "+form.expr+" "+mode+" DF preserved");
  }
  defaultEACases++;
 }
}
check(defaultEACases===32,"INC/DEC × byte/word × eight effective addresses");


// LOCK prefix must remain attached to the memory read-modify-write instruction.
for(const op of OPS)for(const bits of [8,16]){
 const width=bits===8?"BYTE":"WORD",opcode=bits===8?op.byteOpcode:op.wordOpcode;
 const source="MOV BX,0200h\nLOCK\n"+op.name+" "+width+" PTR [BX]\nHLT";
 const stream=assemble(source),at=stream.indexOf(0xF0);
 check(at>=0,"LOCK emitted for "+op.name+" "+width);
 const expected=[0xF0,opcode,modrm(op.ext)];
 same(stream.slice(at,at+3),expected,"LOCK "+op.name+" "+width+" bytes");
 const d=api.disassemble(expected);
 check(d.rows.length===1,"LOCK "+op.name+" "+width+" one row");
 check(d.rows[0].instruction.startsWith("LOCK "+op.name+" "),"LOCK "+op.name+" "+width+" decode");
}
for(const op of OPS)for(const prefix of ["REP","REPE","REPNE"]){
 let rejected=false;try{api.assemble(prefix+"\n"+op.name+" AX");}catch(_){rejected=true;}
 check(rejected,prefix+" rejected before "+op.name);
}
for(const op of OPS)for(const seg of SEG){
 let rejected=false;try{api.assemble(seg.name+":\n"+op.name+" AX");}catch(_){rejected=true;}
 check(rejected,seg.name+" segment prefix rejected without memory for "+op.name);
}
console.log("INC/DEC/NEG prefix audit: "+cases+" segment-override source/binary cases; "+registerCases+" register forms; "+defaultEACases+" INC/DEC default-segment EA forms; LOCK byte/word; REP and invalid segment-prefix rejection.");
console.log("Assertions: "+assertions+" passed.");
