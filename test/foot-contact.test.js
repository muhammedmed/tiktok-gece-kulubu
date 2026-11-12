import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {applySnapPose,snapCycle} from '../public/finger-gesture.js';
import {dancePose} from '../public/dance-motion.js';
import {limitWrist} from '../public/wrist-pose.js';
import {insideInstrument} from '../public/instrument-surface.js';
import {allModels,chooseModel} from '../public/wardrobe.js';
import {measureSoles,groundedAnkle} from '../public/foot-contact.js';
import {floorHeight,constrainCamera,CAMERA_BOUNDS} from '../public/spatial.js';
// Load the shipped rigs without textures, so the test needs no browser or network.
async function rig(name){
 const data=fs.readFileSync(new URL('../public/assets/characters/'+name+'.glb',import.meta.url)),length=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+length));
 json.materials=json.materials.map(m=>({name:m.name,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1]}}));delete json.images;delete json.textures;delete json.samplers;
 const content=Buffer.from(JSON.stringify(json)),size=Math.ceil(content.length/4)*4,tail=data.subarray(20+length),glb=Buffer.alloc(20+size+tail.length,32);
 glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(size,12);glb.writeUInt32LE(0x4e4f534a,16);content.copy(glb,20);tail.copy(glb,20+size);
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 return (await loader.parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),'' )).scene;
}
test('all active character shoe meshes clear the LED floor through turns and heel tilts',async()=>{
 for(const name of allModels){
  const model=await rig(name),root=new T.Group();root.add(model);root.updateMatrixWorld(true);
  const feet={};model.traverse(n=>{const name=n.name.replace(/[^a-z0-9]/gi,'').toLowerCase();if(name==='bip01lfoot'||name==='bip01rfoot')feet[name==='bip01lfoot'?'L':'R']=n;});
  const supports=measureSoles(model,root,feet);assert.equal(Object.keys(supports).length,2,name);
  for(const support of Object.values(supports)){
   assert.ok(support.points.length>8,name+' must sample real shoe vertices');
   const rest=support.foot.getWorldQuaternion(new T.Quaternion());
   for(const yaw of [0,1.1,3.14])for(const pitch of [0,-.15,-.3]){
    const rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),pitch)).multiply(rest);
    const target=groundedAnkle(support,rotation,new T.Vector3(0,0,0));
    const lowest=Math.min(...support.points.map(p=>p.clone().applyQuaternion(rotation).add(target).y));
    assert.ok(lowest>=floorHeight(0,0)+.0039,name+' shoe penetrated the LED floor');
    assert.ok(lowest<=floorHeight(0,0)+.0041,name+' shoe is floating');
   }
  }
 }
});
test('room, LED floor, stairs, stage and VIP resolve their real surface heights',()=>{
 assert.equal(floorHeight(0,0),.055);assert.equal(floorHeight(16,3),0);
 assert.equal(floorHeight(0,-7),.64);assert.equal(floorHeight(8,-8),.32);assert.equal(floorHeight(-8,-8),.32);
 assert.equal(floorHeight(0,-1.8),.2);assert.equal(floorHeight(0,-2),.4);
});
test('manual and automatic camera constraints never allow an exterior position',()=>{
 for(let i=0;i<100;i++){
  const p=constrainCamera({x:Math.sin(i)*40,y:Math.cos(i)*20,z:Math.cos(i*.3)*40}),b=CAMERA_BOUNDS;
  assert.ok(p.x>=b.minX&&p.x<=b.maxX&&p.y>=b.minY&&p.y<=b.maxY&&p.z>=b.minZ&&p.z<=b.maxZ);
 }
});
test('deformed shoe vertices stay above the floor during a full dance cycle on every model',async()=>{
 // Minimal element stubs for Person labels and the shared procedural weave canvas.
 const oldDocument=globalThis.document;
 globalThis.document={createElement:()=>({style:{},getContext:()=>({fillRect(){}}),querySelector:()=>({textContent:''}),remove(){}})};
 try{
  const {Person}=await import('../public/actors.js');
  for(const name of allModels){
   const model=await rig(name),gender=name.includes('female')?'female':'male',modelKey=name;
   const person=new Person({models:{[modelKey]:model},animations:{female:{},male:{}}},{name,gender,modelName:name,role:'dance',danceSlot:0},new T.Scene(),{append(){}});
   person.ensureSnap();
   // Test the actual thumb/middle tips after the calibrated preparation pose.
   for(const side of ['L','R']){
    applySnapPose(person.snapPoses[side],.3,1);person.root.updateWorldMatrix(true,true);
    const fingertip=bone=>bone.localToWorld(new T.Vector3(Math.max(.012,bone.position.length()*.72),0,0));
    const gap=fingertip(person.bone(side+' Finger02')).distanceTo(fingertip(person.bone(side+' Finger22')));
    assert.ok(gap<.008,`${name} ${side} snap contact gap ${gap}: thumb ${person.bone(side+' Hand').worldToLocal(fingertip(person.bone(side+' Finger02'))).toArray()} middle ${person.bone(side+' Hand').worldToLocal(fingertip(person.bone(side+' Finger22'))).toArray()}`);
   }
   person.hype=1;
   for(let t=0;t<105;t+=.24){
    person.update(.05,t);
    const pose=dancePose(t,0,-1,1);for(const [side,key]of [['L','left'],['R','right']])if(pose.beltWeight[key]>.999){const hand=person.bone(side+' Hand'),rest=person.restBones.find(r=>r.bone===hand);assert.ok(hand.quaternion.angleTo(rest.quaternion)<=.421, name+' waist wrist overextended');}
    person.root.updateWorldMatrix(true,true);person.model.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});
    for(const support of Object.values(person.soles))for(const {mesh,index}of support.samples){
     const world=mesh.getVertexPosition(index,new T.Vector3()).applyMatrix4(mesh.matrixWorld);
     assert.ok(world.y>=floorHeight(world.x,world.z)-.003,`${name} at ${t.toFixed(2)}: sole ${world.y.toFixed(4)}`);
    }
   }
   person.dispose();
  }
 }finally{globalThis.document=oldDocument;}
});

test('finger snap contains contact, quick release and a continuous recovery',()=>{
 assert.equal(snapCycle(.3).pinch,1);assert.equal(snapCycle(.3).release,0);
 assert.ok(snapCycle(.63).release>.99);assert.equal(snapCycle(.63).pinch,0);
 for(const key of ['pinch','release'])assert.ok(Math.abs(snapCycle(1-1e-7)[key]-snapCycle(1+1e-7)[key])<.0001);
});

test('wrist limit preserves neutral and caps extreme hand rotations without mutation',()=>{
 const neutral=new T.Quaternion(),extreme=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),2.5),before=extreme.clone();
 assert.ok(Math.abs(limitWrist(neutral,extreme,.42).angleTo(neutral)-.42)<1e-7);
 assert.equal(extreme.angleTo(before),0);assert.equal(limitWrist(neutral,neutral,.42).angleTo(neutral),0);
});

test('seated guests and musicians meet the seat, floor and playable hand targets on every rig',async()=>{
 const oldDocument=globalThis.document;
 globalThis.document={createElement:()=>({style:{},getContext:()=>({fillRect(){}}),querySelector:()=>({textContent:''}),remove(){}})};
 try{
  const {Person}=await import('../public/actors.js');
  for(const name of allModels){
   const model=await rig(name),gender=name.includes('female')?'female':'male',modelKey=name;
   const person=new Person({models:{[modelKey]:model},animations:{female:{},male:{}}},{name,gender,modelName:name,role:'dance',x:8,z:0},new T.Scene(),{append(){}});
   person.modelName=name;
   for(const role of ['table','vip','saz','drum']){
    person.setRole(role);
    for(let t=0;t<8;t+=.23){person.handTargets={};person.update(.04,t);person.root.updateWorldMatrix(true,true);
     const hip=(person.bone('L Thigh').getWorldPosition(new T.Vector3()).y+person.bone('R Thigh').getWorldPosition(new T.Vector3()).y)/2;
     assert.ok(Math.abs(hip-(['saz','drum'].includes(role)?.62:.57))<.025,`${name} ${role}: hip ${hip}`);
     for(const [side,target]of Object.entries(person.handTargets)){const error=person.bone(side+' Hand').getWorldPosition(new T.Vector3()).distanceTo(target);assert.ok(error<.065,`${name} ${role} ${side} hand misses by ${error}`);const hand=person.bone(side+' Hand'),rest=person.restBones.find(r=>r.bone===hand).quaternion,bend=hand.quaternion.angleTo(rest);assert.ok(bend<1.3,`${name} ${role} ${side} wrist bends ${bend}`);}
     person.model.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});
     for(const support of Object.values(person.soles))for(const {mesh,index}of support.samples){const world=mesh.getVertexPosition(index,new T.Vector3()).applyMatrix4(mesh.matrixWorld);assert.ok(world.y>=floorHeight(world.x,world.z)-.003,`${name} ${role}: shoe under floor ${world.y}`);}
    }
   }person.dispose();
  }
 }finally{globalThis.document=oldDocument;}
});


test('instruments stay outside torso, clothing, arms and hands on all active seated rigs',async()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({style:{},getContext:()=>({fillRect(){}}),querySelector:()=>({textContent:''}),remove(){}})};
 try{const {Person}=await import('../public/actors.js');
 for(const name of allModels){const model=await rig(name),gender=name.includes('female')?'female':'male',key=name;
  const person=new Person({models:{[key]:model},animations:{female:{},male:{}}},{name,gender,modelName:name,role:'dance',x:8,z:0},new T.Scene(),{append(){}});
  person.modelName=name;
  for(const role of ['saz','drum']){person.setRole(role);for(let t=0;t<26;t+=.37){
   person.update(.05,t);person.root.updateWorldMatrix(true,true);let bad=[];
   person.model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();const index=mesh.geometry.attributes.skinIndex,weight=mesh.geometry.attributes.skinWeight;
    for(let i=0;i<index.count;i++){let dominant=0;for(let j=1;j<4;j++)if(weight.getComponent(i,j)>weight.getComponent(i,dominant))dominant=j;
     const bone=mesh.skeleton.bones[index.getComponent(i,dominant)].name;
     if(!/Spine|Pelvis|Thigh|Calf|Forearm|Hand|Finger/i.test(bone))continue;
     const p=person.instrument.worldToLocal(mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld));
     if(insideInstrument(p,role))bad.push({bone,p:p.toArray()});
    }
   });assert.equal(bad.length,0,`${name} ${role} at ${t}: ${JSON.stringify(bad.slice(0,2))} (${bad.length} penetrating vertices)`);
  }}person.dispose();
 }}finally{globalThis.document=old;}
});
test('background NPCs hide their names and a new waiter patrol starts at the arrival position',async()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({style:{},getContext:()=>({fillRect(){}}),querySelector:()=>({textContent:''}),remove(){}})};
 try{const {Person}=await import('../public/actors.js');const {chooseModel}=await import('../public/wardrobe.js');const name=chooseModel('male',0,'waiter'),assets={models:{[name]:await rig(name)},animations:{male:{}}};
  const p=new Person(assets,{name:'Guest',gender:'male',variant:0,role:'waiter',npc:true,x:6.4,z:10},new T.Scene(),{append(){}});
  p.label(null,100,100,true);assert.equal(p.tag.hidden,true);const initial=p.root.position.clone();p.update(.03,200);assert.ok(p.root.position.distanceTo(initial)<.001,'first patrol frame must not teleport');
  p.update(.03,200.03);assert.ok(p.root.position.distanceTo(initial)<.04,'patrol must start continuously');p.dispose();
 }finally{globalThis.document=old;}
});

test('all four solo figures keep shoes above the floor on every shipped rig',async()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({style:{},getContext:()=>({fillRect(){}}),querySelector:()=>({textContent:''}),remove(){}})};
 try{const {Person}=await import('../public/actors.js');
  for(const name of allModels){const model=await rig(name),gender=name.includes('female')?'female':'male';
   const person=new Person({models:{[name]:model},animations:{female:{},male:{}}},{name,gender,modelName:name,role:'dance',x:0,z:11},new T.Scene(),{append(){}});
   for(let variant=0;variant<4;variant++){person.placeAt([0,0,11],'dance',0);person.soloAccessory=null;person.solo={variant,startedAt:0};
    for(let t=0;t<15;t+=.29){person.update(.04,t);person.root.updateWorldMatrix(true,true);person.model.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});
     for(const support of Object.values(person.soles))for(const {mesh,index}of support.samples){const world=mesh.getVertexPosition(index,new T.Vector3()).applyMatrix4(mesh.matrixWorld);assert.ok(world.y>=floorHeight(world.x,world.z)-.003,`${name} solo ${variant}: shoe under floor ${world.y}`);}
     for(const part of ['L Hand','R Hand','L Foot','R Foot'])assert.ok(person.bone(part).getWorldPosition(new T.Vector3()).toArray().every(Number.isFinite));
    }
   }person.dispose();
  }
 }finally{globalThis.document=old;}
});

test('oriental costume rigs keep feet on stage through hip and arm figures and release ornaments cleanly',async()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({style:{},getContext:()=>({fillRect(){}}),querySelector:()=>({textContent:''}),remove(){}})};
 try{const {Person}=await import('../public/actors.js'),{dancerModels}=await import('../public/wardrobe.js');
 for(const [variant,name]of dancerModels.entries()){const model=await rig(name),person=new Person({models:{[name]:model},animations:{female:{},male:{}}},{name,gender:'female',variant,modelName:name,role:'dancer',x:0,y:.64,z:-4.2},new T.Scene(),{append(){}});
  const {costumeSurface}=await import('../public/costume-fit.js'),surface=costumeSurface(person);const waist=person.restHipHeight+.015,anchors=Array.from({length:48},(_,i)=>surface.sample(waist+.012,i/48*Math.PI*2));assert.ok(anchors.every(Boolean),name+' belt must fit every side of the torso');
  for(let t=0;t<40;t+=.23){person.update(.04,t);person.root.updateWorldMatrix(true,true);person.model.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});
   for(const support of Object.values(person.soles))for(const {mesh,index}of support.samples){const world=mesh.getVertexPosition(index,new T.Vector3()).applyMatrix4(mesh.matrixWorld);assert.ok(world.y>=floorHeight(world.x,world.z)-.003,`${name} dancer: shoe under stage`);}
   surface.prepare();const band=person.prop.getObjectByName('costumeWaistband');for(let i=0;i<48;i+=8){const actual=new T.Vector3().fromBufferAttribute(band.geometry.attributes.position,i*2),expected=surface.position(anchors[i],new T.Vector3(),.003);assert.ok(actual.distanceTo(expected)<.00001,name+' belt detached during dance');}
   person.prop.traverse(o=>assert.ok(o.position.toArray().every(Number.isFinite)));
  }assert.ok(person.prop.children.length>=4);person.setRole('dance');assert.ok(person.prop.children.length>=4,'solo keeps the stage costume');person.clearProps();assert.equal(person.prop.children.length,0);person.dispose();
 }
 }finally{globalThis.document=old;}
});

test('money bow and two-handed toss keep real soles grounded and wrist angles bounded',async()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({style:{},getContext:()=>({fillRect(){}}),querySelector:()=>({textContent:''}),remove(){}})};
 try{const {Person}=await import('../public/actors.js');for(const [name,receiver]of [['female-adult-03',true],['male-adult-08',false]]){const model=await rig(name),person=new Person({models:{[name]:model},animations:{female:{},male:{}}},{name,gender:receiver?'female':'male',modelName:name,role:receiver?'dancer':'dance',x:0,y:.64,z:-4.2},new T.Scene(),{append(){}});person.moneyInteraction={startedAt:0,receiver};person.danceFacing=.3;
  for(let t=0;t<4.9;t+=.055){person.update(.055,t);person.root.updateWorldMatrix(true,true);person.model.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});for(const support of Object.values(person.soles))for(const {mesh,index}of support.samples){const world=mesh.getVertexPosition(index,new T.Vector3()).applyMatrix4(mesh.matrixWorld);assert.ok(world.y>=floorHeight(world.x,world.z)-.003,name+' money foot under stage');}for(const side of ['L','R']){const hand=person.bone(side+' Hand'),rest=person.restBones.find(r=>r.bone===hand);assert.ok(hand.quaternion.angleTo(rest.quaternion)<.76,name+' money wrist bent too far');}}
  person.dispose();}
 }finally{globalThis.document=old;}
});
