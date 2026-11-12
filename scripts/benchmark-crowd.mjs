import {MAX_DANCERS} from '../public/club-layout.js';
import fs from 'node:fs';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';import {allModels,chooseModel} from '../public/wardrobe.js';import {floorSpot} from '../public/dance-motion.js';
globalThis.document={createElement:()=>({style:{},getContext:()=>({fillRect(){}}),querySelector:()=>({textContent:''}),remove(){}})};
async function rig(name){
 const data=fs.readFileSync(new URL('../public/assets/characters/'+name+'.glb',import.meta.url)),length=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+length));
 json.materials=json.materials.map(m=>({name:m.name,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1]}}));delete json.images;delete json.textures;delete json.samplers;
 const content=Buffer.from(JSON.stringify(json)),size=Math.ceil(content.length/4)*4,tail=data.subarray(20+length),glb=Buffer.alloc(20+size+tail.length,32);
 glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(size,12);glb.writeUInt32LE(0x4e4f534a,16);content.copy(glb,20);tail.copy(glb,20+size);
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 return (await loader.parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),'' )).scene;
}

const {Person}=await import('../public/actors.js');
const assets={models:{},animations:{female:{},male:{}}};for(const n of allModels)assets.models[n]=await rig(n);
const people=[],scene=new T.Scene();for(let i=0;i<100;i++){const gender=i%2?'male':'female',spot=floorSpot(i%MAX_DANCERS);people.push(new Person(assets,{name:'Bench '+i,gender,variant:i,role:'dance',danceSlot:i%MAX_DANCERS,x:spot.x,z:spot.z},scene,{append(){}}));}
for(const p of people)p.update(1/30,0);
const durations=[];for(let frame=1;frame<=30;frame++){const start=performance.now();for(const p of people)p.update(1/30,frame/30);durations.push(performance.now()-start);}durations.sort((a,b)=>a-b);
console.log(JSON.stringify({actors:people.length,soleSamples:people.reduce((n,p)=>n+Object.values(p.soles).reduce((a,s)=>a+s.points.length,0),0),medianAnimationMs:durations[15],p95AnimationMs:durations[28]},null,2));for(const p of people)p.dispose();
