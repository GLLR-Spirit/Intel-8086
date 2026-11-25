const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};
vm.createContext(context);
const injection="\nglobalThis.api={assemble:s=>assembleProgram(s),disassemble:b=>disassembleBytes(b),execute:s=>executeAll(s),binary:(b,c,i,s)=>executeBinary(b,c,i,s)};\n})();\n";
const instrumented=match[1].replace(/\n\}\)\(\);\s*$/,injection);assert.notEqual(instrumented,match[1]);
vm.runInContext(instrumented,context,{timeout:30000});
const api=context.api;
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
function hx(n){return (n&0xffff).toString(16).toUpperCase().padStart(4,"0")+"h";}
for(const [operand,regs] of modes){
 const lines=[
  "MOV BX, "+hx(regs.BX),"MOV BP, "+hx(regs.BP),
  "MOV SI, "+hx(regs.SI),"MOV DI, "+hx(regs.DI),
  "MOV WORD PTR [0100h], 0000h","MOV WORD PTR [0102h], 2000h",
  "JMP FAR PTR "+operand,"MOV AX, 1","TARGET: HLT"
 ];
 const first=api.assemble(lines.join("\n"));
 const targetOffset=first.symbols.TARGET;
 assert.ok(Number.isInteger(targetOffset),"TARGET symbol for "+operand);
 lines[4]="MOV WORD PTR [0100h], "+hx(targetOffset);
 const source=lines.join("\n"),assembled=api.assemble(source),bytes=Array.from(assembled.bytes);
 const row=api.disassemble(bytes).rows.find(r=>r.instruction.startsWith("JMP FAR"));
 assert.ok(row,"far JMP disassembled for "+operand);
 assert.equal(row.instruction,"JMP FAR PTR "+operand);
 const sourceState=api.execute(source);
 assert.equal(sourceState.error,undefined,"source far indirect JMP "+operand);
 assert.equal(sourceState.reg.CS,0x2000,"source CS "+operand);
 assert.equal(sourceState.reg.IP,targetOffset+1,"source IP after target HLT "+operand);
 assert.equal(sourceState.reg.AX,0,"source skipped MOV "+operand);
 assert.equal(sourceState.reg.SP,0xFFFE,"source stack unchanged "+operand);
 const targetPhysical=(0x2000<<4)+targetOffset;
 const initial={mem:{[targetPhysical]:0xF4},reg:{SP:0xFFFE},flags:{CF:1,PF:1,AF:1,ZF:1,SF:1,TF:1,IF:1,DF:1,OF:1}};
 const binaryState=api.binary(bytes,0,0,initial);
 assert.equal(binaryState.error,undefined,"binary far indirect JMP "+operand);
 assert.equal(binaryState.reg.CS,0x2000,"binary CS "+operand);
 assert.equal(binaryState.reg.IP,targetOffset+1,"binary IP "+operand);
 assert.equal(binaryState.reg.AX,0,"binary skipped MOV "+operand);
 assert.equal(binaryState.reg.SP,0xFFFE,"binary stack unchanged "+operand);
 for(const flag of ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"])assert.equal(binaryState.flags[flag],1,flag+" preserved "+operand);
}
console.log("8086 JMP FAR indirect: FF /5, eight memory addressing modes, source/binary CS:IP, stack and FLAGS PASS.");
