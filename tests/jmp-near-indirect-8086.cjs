const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};
vm.createContext(context);
const injection="\nglobalThis.api={assemble:s=>assembleProgram(s),disassemble:b=>disassembleBytes(b),execute:s=>executeAll(s),binary:(b,c,i,s)=>executeBinary(b,c,i,s)};\n})();\n";
const instrumented=match[1].replace(/\n\}\)\(\);\s*$/,injection);assert.notEqual(instrumented,match[1]);
vm.runInContext(instrumented,context,{timeout:30000});
const api=context.api,flags=["CF","PF","AF","ZF","SF","TF","IF","DF","OF"];
function hx(n){return (n&0xffff).toString(16).toUpperCase().padStart(4,"0")+"h";}
function checkFlags(state,value,label){for(const flag of flags)assert.equal(state.flags[flag],value,label+" "+flag);}
const regs=["AX","CX","DX","BX","SP","BP","SI","DI"];
for(const reg of regs){
 const lines=["MOV "+reg+", 0000h","JMP "+reg,"MOV AX, 1","TARGET: HLT"];
 const first=api.assemble(lines.join("\n")),target=first.symbols.TARGET;
 lines[0]="MOV "+reg+", "+hx(target);
 const source=lines.join("\n"),bytes=Array.from(api.assemble(source).bytes);
 assert.deepEqual(bytes.slice(3,5),[0xFF,0xE0+regs.indexOf(reg)],"FF /4 register encoding "+reg);
 assert.ok(api.disassemble(bytes).rows.some(r=>r.instruction==="JMP "+reg),"disassembly "+reg);
 const a=api.execute(source),b=api.binary(bytes,0,0,{flags:{CF:1,PF:1,AF:1,ZF:1,SF:1,TF:1,IF:1,DF:1,OF:1}});
 for(const [mode,state] of [["source",a],["binary",b]]){
  assert.equal(state.error,undefined,mode+" JMP "+reg);
  assert.equal(state.reg.CS,0,mode+" CS "+reg);
  assert.equal(state.reg.IP,target+1,mode+" IP "+reg);
  assert.equal(state.reg[reg],target,mode+" target register "+reg);
  assert.equal(state.reg.AX,reg==="AX"?target:0,mode+" AX "+reg);
  assert.equal(state.reg.SP,reg==="SP"?target:0xFFFE,mode+" SP "+reg);
  checkFlags(state,mode==="source"?0:1,mode+" flags "+reg);
 }
}
const modes=[
 ["[BX+SI]",{BX:0x100,SI:0,DI:0,BP:0}],
 ["[BX+DI]",{BX:0x100,SI:0,DI:0,BP:0}],
 ["[BP+SI]",{BX:0,SI:0,DI:0,BP:0x100}],
 ["[BP+DI]",{BX:0,SI:0,DI:0,BP:0x100}],
 ["[SI]",{BX:0,SI:0x100,DI:0,BP:0}],
 ["[DI]",{BX:0,SI:0,DI:0x100,BP:0}],
 ["[BP]",{BX:0,SI:0,DI:0,BP:0x100}],
 ["[BX]",{BX:0x100,SI:0,DI:0,BP:0}]
];
for(const [operand,r] of modes){
 const lines=[
  "MOV BX, "+hx(r.BX),"MOV BP, "+hx(r.BP),
  "MOV SI, "+hx(r.SI),"MOV DI, "+hx(r.DI),
  "MOV WORD PTR [0100h], 0000h",
  "JMP WORD PTR "+operand,"MOV AX, 1","TARGET: HLT"
 ];
 const first=api.assemble(lines.join("\n")),target=first.symbols.TARGET;
 lines[4]="MOV WORD PTR [0100h], "+hx(target);
 const source=lines.join("\n"),bytes=Array.from(api.assemble(source).bytes);
 const row=api.disassemble(bytes).rows.find(x=>x.instruction.startsWith("JMP "));
 assert.ok(row,"memory JMP disassembly "+operand);
 const a=api.execute(source),b=api.binary(bytes,0,0,{flags:{CF:1,PF:1,AF:1,ZF:1,SF:1,TF:1,IF:1,DF:1,OF:1}});
 for(const [mode,state] of [["source",a],["binary",b]]){
  assert.equal(state.error,undefined,mode+" JMP "+operand);
  assert.equal(state.reg.CS,0,mode+" CS "+operand);
  assert.equal(state.reg.IP,target+1,mode+" IP "+operand);
  assert.equal(state.reg.AX,0,mode+" skipped MOV "+operand);
  assert.equal(state.reg.SP,0xFFFE,mode+" SP "+operand);
  checkFlags(state,mode==="source"?0:1,mode+" flags "+operand);
 }
}
console.log("8086 near indirect JMP: FF /4 tested for eight registers and eight memory addressing modes, source/binary, CS:IP, SP and nine FLAGS PASS.");
