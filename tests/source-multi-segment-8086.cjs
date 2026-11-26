const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync("index.html","utf8"),match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{id,value:"",textContent:"",innerHTML:"",className:"",dataset:{},onclick:null,oninput:null,onchange:null});return elements.get(id);}
const context={document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},console};vm.createContext(context);
const injection="\nglobalThis.api={execute:(s,o)=>executeAll(s,o)};\n})();\n";
const instrumented=match[1].replace(/\n\}\)\(\);\s*$/,injection);assert.notEqual(instrumented,match[1]);
vm.runInContext(instrumented,context,{timeout:30000});const execute=context.api.execute;
function run(source,options){const result=execute(source,options);assert.equal(result.error,undefined,result.error||"execution failed");return result;}
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
console.log("Source multi-segment CS:IP: 5 scénarios PASS.");
