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
const injection="\nglobalThis.__8086MovFormsApi = {"+
 "\n assemble: source => assembleProgram(source),"+
 "\n disassemble: bytes => disassembleBytes(bytes),"+
 "\n execute: source => executeAll(source),"+
 "\n executeBinary: (bytes,cs,ip,state) => executeBinary(bytes,cs,ip,state)"+
 "\n};\n})();\n";
const instrumented=match[1].replace(/\n\}\)\(\);\s*$/,injection);
assert.notEqual(instrumented,match[1],"API injection point must exist");
vm.runInContext(instrumented,context,{timeout:30000});
const api=context.__8086MovFormsApi;
assert.ok(api);
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;}catch(e){failed++;console.error("FAIL "+name+": "+e.stack);}}
const FLAGS=0x0FD7;
const flagNames=["CF","PF","AF","ZF","SF","TF","IF","DF","OF"];
const flagBits={CF:1,PF:4,AF:16,ZF:64,SF:128,TF:256,IF:512,DF:1024,OF:2048};
function assertFlags(state,label){
 for(const f of flagNames)assert.equal(state.flags[f],(FLAGS&flagBits[f])?1:0,label+" "+f);
}
function runBoth(source){
 const assembled=api.assemble(source);
 const src=api.execute(source);
 const bin=api.executeBinary(assembled.bytes,0,0,{});
 assert.ok(!src.error,src.error||"source execution failed");
 assert.ok(!bin.error,bin.error||"binary execution failed");
 for(const reg of ["AX","BX","CX","DX","SP","BP","SI","DI","CS","DS","ES","SS"])
  assert.equal(bin.reg[reg],src.reg[reg],"source/binary "+reg);
 for(const f of flagNames)assert.equal(bin.flags[f],src.flags[f],"source/binary "+f);
 return {assembled,src,bin};
}
function bytesOf(source){return Array.from(api.assemble(source).bytes);}
function decodeOne(bytes,label){
 const d=api.disassemble(bytes);
 assert.equal(d.rows.length,1,label+" exactly one instruction");
 assert.equal(Array.from(d.rows[0].bytes).join(","),bytes.join(","),label+" decoded bytes");
 assert.ok(d.rows[0].instruction.startsWith("MOV "),label+" decoded MOV mnemonic");
}
function readReg(state,reg,bits){
 if(bits===16)return state.reg[reg];
 const parent=reg[0]+"X";
 return reg==="AH"||reg==="CH"||reg==="DH"||reg==="BH"
  ?(state.reg[parent]>>8)&255:state.reg[parent]&255;
}
function physical(seg,off){return ((((seg&0xFFFF)<<4)+(off&0xFFFF))&0xFFFFF);}
const REG8=["AL","CL","DL","BL","AH","CH","DH","BH"];
const REG16=["AX","CX","DX","BX","SP","BP","SI","DI"];
const EA=[
 {expr:"[BX+SI]",rm:0,mod:0,segment:"DS",setup:["MOV BX,0200h","MOV SI,0200h"]},
 {expr:"[BX+DI]",rm:1,mod:0,segment:"DS",setup:["MOV BX,0200h","MOV DI,0200h"]},
 {expr:"[BP+SI]",rm:2,mod:0,segment:"SS",setup:["MOV BP,0200h","MOV SI,0200h"]},
 {expr:"[BP+DI]",rm:3,mod:0,segment:"SS",setup:["MOV BP,0200h","MOV DI,0200h"]},
 {expr:"[SI]",rm:4,mod:0,segment:"DS",setup:["MOV SI,0400h"]},
 {expr:"[DI]",rm:5,mod:0,segment:"DS",setup:["MOV DI,0400h"]},
 {expr:"[BP]",rm:6,mod:1,disp:[0],segment:"SS",setup:["MOV BP,0400h"]},
 {expr:"[BX]",rm:7,mod:0,segment:"DS",setup:["MOV BX,0400h"]}
];
function modrm(mod,reg,rm){return (mod<<6)|(reg<<3)|rm;}
function seed(){
 return ["MOV SP,0100h","MOV CX,"+FLAGS.toString(16)+"h","PUSH CX","POPF"];
}
function segmentSetup(){
 return ["MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV AX,3000h","MOV SS,AX"];
}
function memoryAddress(segment){return physical(segment==="SS"?0x3000:0x1000,0x0400);}
const segmentValue={ES:0x2000,CS:0x0000,SS:0x3000,DS:0x1000};

// A. All B0-BF register-immediate forms, with exact encoding, disassembly,
// source/binary execution and FLAGS preservation.
for(let i=0;i<8;i++){
 for(const [bits,reg,opcode,value] of [
  [8,REG8[i],0xB0+i,0xA5],
  [16,REG16[i],0xB8+i,0xA55A]
 ]){
  test("MOV immediate register "+reg,()=>{
   const imm=bits===8?[value]:[value&255,(value>>8)&255];
   const expected=[opcode,...imm];
   const source=[...seed(),"MOV "+reg+","+value.toString(16)+"h","HLT"].join("\n");
   assert.deepEqual(bytesOf("MOV "+reg+","+value.toString(16)+"h"),expected);
   decodeOne(expected,"MOV immediate "+reg);
   const {src,bin}=runBoth(source);
   for(const [mode,state] of [["source",src],["binary",bin]]){
    assert.equal(readReg(state,reg,bits),value,mode+" MOV immediate "+reg);
    assertFlags(state,mode+" MOV immediate "+reg+" FLAGS");
   }
  });
 }
}

// B. MOV r/m,reg and MOV reg,r/m over all eight effective-address forms,
// byte/word and both directions, with default DS/SS selection.
for(const bits of [8,16]){
 const width=bits===8?"BYTE":"WORD",reg=bits===8?"AL":"AX";
 const value=bits===8?0xA5:0xA55A,otherValue=bits===8?0x11:0x1111;
 for(const form of EA){
  test("MOV register to memory "+width+" "+form.expr,()=>{
   const source=[
    ...segmentSetup(),
    width==="BYTE"?"MOV BYTE PTR DS:[0400h],11h":"MOV WORD PTR DS:[0400h],1111h",
    width==="BYTE"?"MOV BYTE PTR SS:[0400h],11h":"MOV WORD PTR SS:[0400h],1111h",
    ...seed(),"MOV SP,2000h",...form.setup,
    "MOV "+reg+","+value.toString(16)+"h",
    "MOV "+width+" PTR "+form.expr+", "+reg,"HLT"
   ].join("\n");
   const expected=[bits===8?0x88:0x89,modrm(form.mod,0,form.rm),...(form.disp||[])];
   assert.deepEqual(bytesOf("MOV "+width+" PTR "+form.expr+", "+reg),expected);
   decodeOne(expected,"MOV store "+form.expr);
   const {src,bin}=runBoth(source);
   const selected=memoryAddress(form.segment),other=memoryAddress(form.segment==="SS"?"DS":"SS");
   for(const [mode,state] of [["source",src],["binary",bin]]){
    assert.equal(state.mem[selected],value&255,mode+" MOV store low "+form.expr);
    if(bits===16)assert.equal(state.mem[(selected+1)&0xFFFFF],value>>8,mode+" MOV store high "+form.expr);
    assert.equal(state.mem[other],otherValue&255,mode+" MOV store other segment "+form.expr);
    assertFlags(state,mode+" MOV store FLAGS "+form.expr);
   }
  });
  test("MOV memory to register "+width+" "+form.expr,()=>{
   const selectedValue=value,other=otherValue;
   const source=[
    ...segmentSetup(),
    "MOV "+width+" PTR DS:[0400h],"+(form.segment==="DS"?selectedValue:other).toString(16)+"h",
    "MOV "+width+" PTR SS:[0400h],"+(form.segment==="SS"?selectedValue:other).toString(16)+"h",
    ...seed(),"MOV SP,2000h",...form.setup,
    "MOV "+reg+", "+width+" PTR "+form.expr,"HLT"
   ].join("\n");
   const expected=[bits===8?0x8A:0x8B,modrm(form.mod,0,form.rm),...(form.disp||[])];
   assert.deepEqual(bytesOf("MOV "+reg+", "+width+" PTR "+form.expr),expected);
   decodeOne(expected,"MOV load "+form.expr);
   const {src,bin}=runBoth(source);
   for(const [mode,state] of [["source",src],["binary",bin]]){
    assert.equal(readReg(state,reg,bits),selectedValue,mode+" MOV load "+form.expr);
    assertFlags(state,mode+" MOV load FLAGS "+form.expr);
   }
  });
 }
}

// C. C6/C7 MOV immediate to r/m over all eight EA forms and both widths.
for(const bits of [8,16]){
 const width=bits===8?"BYTE":"WORD",value=bits===8?0x5A:0x1234;
 for(const form of EA){
  test("MOV immediate to memory "+width+" "+form.expr,()=>{
   const source=[
    ...segmentSetup(),
    "MOV "+width+" PTR DS:[0400h],11h",
    "MOV "+width+" PTR SS:[0400h],11h",
    ...seed(),"MOV SP,2000h",...form.setup,
    "MOV "+width+" PTR "+form.expr+","+value.toString(16)+"h","HLT"
   ].join("\n");
   const expected=[bits===8?0xC6:0xC7,modrm(form.mod,0,form.rm),...(form.disp||[]),value&255];
   if(bits===16)expected.push((value>>8)&255);
   assert.deepEqual(bytesOf("MOV "+width+" PTR "+form.expr+","+value.toString(16)+"h"),expected);
   decodeOne(expected,"MOV immediate memory "+form.expr);
   const {src,bin}=runBoth(source),selected=memoryAddress(form.segment),other=memoryAddress(form.segment==="SS"?"DS":"SS");
   for(const [mode,state] of [["source",src],["binary",bin]]){
    assert.equal(state.mem[selected],value&255,mode+" MOV immediate low "+form.expr);
    if(bits===16)assert.equal(state.mem[(selected+1)&0xFFFFF],value>>8,mode+" MOV immediate high "+form.expr);
    assert.equal(state.mem[other],0x11,mode+" MOV immediate other segment "+form.expr);
    assertFlags(state,mode+" MOV immediate FLAGS "+form.expr);
   }
  });
 }
}

// D. Moffs A0-A3, with DS default and ES/CS/SS overrides.
const segments=["DS","ES","CS","SS"];
const prefixes={DS:[],ES:[0x26],CS:[0x2E],SS:[0x36]};
for(const seg of segments){
 for(const bits of [8,16]){
  const width=bits===8?"BYTE":"WORD",reg=bits===8?"AL":"AX";
  for(const direction of ["load","store"]){
   test("MOV moffs "+direction+" "+width+" "+seg,()=>{
    const initial=bits===8?0x5A:0x1234,other=bits===8?0x11:0x1111,value=bits===8?0xA5:0xA55A;
    const init=[
     "MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV AX,3000h","MOV SS,AX"
    ];
    for(const segment of ["DS","ES","SS","CS"]){
     const word=segment===seg?initial:other;
     init.push("MOV BYTE PTR "+segment+":[0400h],"+(word&255).toString(16)+"h");
     if(bits===16)init.push("MOV BYTE PTR "+segment+":[0401h],"+(word>>8).toString(16)+"h");
    }
    const instr=direction==="load"
      ?"MOV "+reg+", "+seg+":[0400h]"
      :"MOV "+seg+":[0400h], "+reg;
    const source=[...seed(),...init,
      ...(direction==="store"?["MOV "+reg+","+value.toString(16)+"h"]:[]),
      instr,"HLT"].join("\n");
    const opcode=direction==="load"?(bits===8?0xA0:0xA1):(bits===8?0xA2:0xA3);
    const expected=[...prefixes[seg],opcode,0x00,0x04];
    const bytes=bytesOf(instr);
    assert.deepEqual(bytes,expected,"MOV moffs exact bytes");
    decodeOne(expected,"MOV moffs "+seg);
    const {src,bin}=runBoth(source),selected=physical(segmentValue[seg],0x0400);
    for(const [mode,state] of [["source",src],["binary",bin]]){
     if(direction==="load")assert.equal(readReg(state,reg,bits),initial,mode+" MOV moffs load");
     else {
      assert.equal(state.mem[selected],value&255,mode+" MOV moffs store low");
      if(bits===16)assert.equal(state.mem[(selected+1)&0xFFFFF],value>>8,mode+" MOV moffs store high");
     }
     assertFlags(state,mode+" MOV moffs FLAGS");
    }
   });
  }
 }
}

// E. Segment-register transfers through all general registers.
// CS can be read but must never be the destination of MOV.
const segRegs=["ES","CS","SS","DS"];
const genRegs=REG16;
const segValue={ES:0x2000,CS:0x0000,SS:0x3000,DS:0x1000};
for(const seg of segRegs){
 for(let i=0;i<genRegs.length;i++){
  const reg=genRegs[i];
  test("MOV general register from "+seg+" to "+reg,()=>{
   const source=[
    "MOV AX,1000h","MOV DS,AX","MOV AX,2000h","MOV ES,AX","MOV AX,3000h","MOV SS,AX",
    ...seed(),"MOV SP,0100h","MOV "+reg+","+seg,"HLT"
   ].join("\n");
   const expected=[0x8C,modrm(3,segRegs.indexOf(seg),i)];
   assert.deepEqual(bytesOf("MOV "+reg+","+seg),expected);
   decodeOne(expected,"MOV segment source "+seg);
   const {src,bin}=runBoth(source);
   assert.equal(readReg(src,reg,16),segValue[seg],"source MOV "+reg+","+seg);
   assert.equal(readReg(bin,reg,16),segValue[seg],"binary MOV "+reg+","+seg);
   assertFlags(src,"source MOV segment source FLAGS");
   assertFlags(bin,"binary MOV segment source FLAGS");
  });
 }
}
for(const seg of ["ES","SS","DS"]){
 for(let i=0;i<genRegs.length;i++){
  const reg=genRegs[i],value=0x4000+i;
  test("MOV "+seg+" from "+reg,()=>{
   const source=[...seed(),"MOV SP,0100h","MOV "+reg+","+value.toString(16)+"h","MOV "+seg+","+reg,"HLT"].join("\n");
   const expected=[0x8E,modrm(3,segRegs.indexOf(seg),i)];
   assert.deepEqual(bytesOf("MOV "+seg+","+reg),expected);
   decodeOne(expected,"MOV segment destination "+seg);
   const {src,bin}=runBoth(source);
   assert.equal(src.reg[seg],value,"source MOV "+seg+","+reg);
   assert.equal(bin.reg[seg],value,"binary MOV "+seg+","+reg);
   assertFlags(src,"source MOV segment destination FLAGS");
   assertFlags(bin,"binary MOV segment destination FLAGS");
  });
 }
}
test("MOV CS destination remains invalid",()=>{
 assert.throws(()=>api.assemble("MOV CS,AX"));
 assert.ok(api.execute("MOV CS,AX").error);
});
console.log("8086 MOV forms audit: "+passed+" passed, "+failed+" failed.");
console.log("B0-BF, 88-8B, C6-C7, A0-A3, 8C/8E; all source/binary, registers, EA, segments and FLAGS.");
if(failed)process.exit(1);
