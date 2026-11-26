const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};vm.createContext(context);
const injection="\nglobalThis.api={execute:(s,o)=>executeAll(s,o),assemble:s=>assembleProgram(s),binary:(b,c,i,state)=>executeBinary(b,c,i,state)};\n})();\n";
const instrumented=match[1].replace(/\n\}\)\(\);\s*$/,injection);assert.notEqual(instrumented,match[1]);
vm.runInContext(instrumented,context,{timeout:30000});const api=context.api,execute=api.execute;
function run(source,options){const result=execute(source,options);assert.equal(result.error,undefined,result.error||"execution failed");return result;}
function physical(cs,ip){return (((cs<<4)+(ip&65535))&0xFFFFF);}
function binaryFor(main,options,segments){
 const loadCS=options.loadCS===undefined?0:options.loadCS,loadIP=options.loadIP===undefined?0:options.loadIP;
 const assembled=api.assemble(main),mem={};
 for(const segment of segments||[]){
  const image=api.assemble(segment.source);
  image.bytes.forEach((byte,index)=>{mem[physical(segment.cs,(segment.ip+index)&65535)]=byte;});
 }
 const initial=Object.assign({},options.initial||{},{mem:Object.assign({},options.initial&&options.initial.mem||{},mem)});
 return api.binary(Array.from(assembled.bytes),loadCS,loadIP,initial);
}
function compareArchitecturalState(source,binary,label){
 assert.equal(source.error,undefined,label+" source: "+source.error);
 assert.equal(binary.error,undefined,label+" binary: "+binary.error);
 for(const reg of ["AX","BX","CX","DX","SP","BP","SI","DI","CS","DS","ES","SS","IP"])
  assert.equal(source.reg[reg],binary.reg[reg],label+" "+reg);
 for(const flag of ["CF","PF","AF","ZF","SF","TF","IF","DF","OF"])
  assert.equal(source.flags[flag],binary.flags[flag],label+" "+flag);
 assert.equal(source.stack.length,binary.stack.length,label+" stack depth");
}
{
 const main="JMP FAR 2000h:0100h\nMOV BX, 1\nHLT";
 const target="MOV AX, 1234h\nHLT";
 const s=run(main,{segments:[{cs:0x2000,ip:0x0100,source:target}]});
 assert.equal(s.reg.CS,0x2000);assert.equal(s.reg.IP,0x0104);assert.equal(s.reg.AX,0x1234);assert.equal(s.reg.BX,0);
 assert.equal(s.execution.mode,"source-multi-segment");assert.equal(s.execution.segments,2);
 assert.equal(s.mem[0x20100],0xB8);assert.equal(s.mem[0x20101],0x34);
}
{
 const main="CALL FAR 2000h:0100h\nHLT";
 const target="MOV AX, 5678h\nRETF";
 const s=run(main,{segments:[{cs:0x2000,ip:0x0100,source:target}]});
 assert.equal(s.reg.CS,0);assert.equal(s.reg.IP,6);assert.equal(s.reg.AX,0x5678);assert.equal(s.reg.SP,0xFFFE);assert.equal(s.stack.length,0);
}
{
 const main="JMP FAR 2000h:0100h\nHLT";
 const target="MOV AX, 1\nHLT";
 const s=run(main,{segments:[{cs:0x2000,ip:0x0100,source:target}]});
 assert.equal(s.reg.AX,1);assert.equal(s.reg.CS,0x2000);
}
{
 const result=execute("JMP FAR 2000h:0100h\nHLT");
 assert.ok(result.error);assert.match(result.error,/CS:IP/);
}
{
 const result=execute("HLT",{loadCS:0x1000,loadIP:0x0010,segments:[{cs:0x1001,ip:0,source:"HLT"}]});
 assert.ok(result.error);assert.match(result.error,/Chevauchement physique/);
}
{
 const s=run("MOV AX, 1234h\nHLT");
 assert.equal(s.execution.mode,"binary-offset");assert.equal(s.reg.AX,0x1234);assert.equal(s.reg.CS,0);assert.equal(s.reg.IP,4);
}

{
 const main="JMP FAR 2000h:0100h\nMOV BX, 1\nHLT",segments=[{cs:0x2000,ip:0x0100,source:"MOV AX, 1234h\nHLT"}];
 const source=run(main,{segments}),binary=binaryFor(main,{},segments);
 compareArchitecturalState(source,binary,"direct far JMP across source segments");
 assert.equal(source.reg.AX,0x1234);assert.equal(source.reg.BX,0);
}
{
 const main="CALL FAR 2000h:0100h\nHLT",segments=[{cs:0x2000,ip:0x0100,source:"MOV AX, 5678h\nRETF"}];
 const source=run(main,{segments}),binary=binaryFor(main,{},segments);
 compareArchitecturalState(source,binary,"direct far CALL and RETF across source segments");
 assert.equal(source.reg.AX,0x5678);assert.equal(source.reg.CS,0);assert.equal(source.reg.SP,0xFFFE);
}
{
 const main="MOV WORD PTR [0200h], 0100h\nMOV WORD PTR [0202h], 2000h\nJMP FAR PTR [0200h]\nMOV BX, 1\nHLT";
 const segments=[{cs:0x2000,ip:0x0100,source:"MOV AX, 2468h\nHLT"}];
 const source=run(main,{segments}),binary=binaryFor(main,{},segments);
 compareArchitecturalState(source,binary,"indirect far JMP through source-built pointer");
 assert.equal(source.reg.AX,0x2468);assert.equal(source.reg.BX,0);
}
{
 const main="MOV WORD PTR [0200h], 0100h\nMOV WORD PTR [0202h], 2000h\nCALL FAR PTR [0200h]\nHLT";
 const segments=[{cs:0x2000,ip:0x0100,source:"MOV AX, 369Ch\nRETF"}];
 const source=run(main,{segments}),binary=binaryFor(main,{},segments);
 compareArchitecturalState(source,binary,"indirect far CALL and RETF through source-built pointer");
 assert.equal(source.reg.AX,0x369C);assert.equal(source.reg.CS,0);assert.equal(source.reg.SP,0xFFFE);
}
{
 const main="CALL FAR 2000h:0100h\nHLT";
 const target="CALL INNER\nMOV AX, 2222h\nRETF\nINNER: MOV BX, 1111h\nRET";
 const segments=[{cs:0x2000,ip:0x0100,source:target}];
 const source=run(main,{segments}),binary=binaryFor(main,{},segments);
 compareArchitecturalState(source,binary,"nested near CALL/RET inside far-called segment");
 assert.equal(source.reg.AX,0x2222);assert.equal(source.reg.BX,0x1111);assert.equal(source.reg.CS,0);
}
{
 const main="JMP FAR 2000h:0100h\nHLT";
 const options={loadCS:0x1000,loadIP:0x0100},segments=[{cs:0x2000,ip:0x0100,source:"MOV AX, 4321h\nHLT"}];
 const source=run(main,Object.assign({},options,{segments})),binary=binaryFor(main,options,segments);
 compareArchitecturalState(source,binary,"same IP value in distinct CS images");
 assert.equal(source.reg.AX,0x4321);
}
{
 const main="JMP FAR 2000h:0000h";
 const options={loadCS:0x1000,loadIP:0xFFFE},segments=[{cs:0x2000,ip:0,source:"MOV AX, 1111h\nHLT"}];
 const source=run(main,Object.assign({},options,{segments})),binary=binaryFor(main,options,segments);
 compareArchitecturalState(source,binary,"initial IP wrap at FFFFh");
 assert.equal(source.reg.AX,0x1111);
}
{
 const main="JMP FAR 0000h:0000h";
 const options={loadCS:0xFFFF,loadIP:0},segments=[{cs:0,ip:0,source:"MOV AX, 55AAh\nHLT"}];
 const source=run(main,Object.assign({},options,{segments})),binary=binaryFor(main,options,segments);
 compareArchitecturalState(source,binary,"20-bit physical address wrap");
 assert.equal(source.reg.AX,0x55AA);
}
{
 const result=execute("HLT",{loadCS:0x1000,loadIP:0x0010,segments:[{cs:0x1001,ip:0,source:"HLT"}]});
 assert.ok(result.error);assert.match(result.error,/Chevauchement physique/);
}
{
 const result=execute("JMP FAR 2000h:0100h\nHLT");
 assert.ok(result.error);assert.match(result.error,/CS:IP/);
}

console.log("Source multi-segment CS:IP: 16 scénarios PASS.");
