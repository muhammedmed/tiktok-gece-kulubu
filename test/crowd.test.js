import {FLOOR,ROOM,VIP_LOUNGES,vipPoint,MAX_VIP} from '../public/club-layout.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {MAX_GUESTS,MAX_DANCERS,FrameClock,freeDanceSlot,freeSeat,crowdBudget,animationInterval} from '../public/crowd.js';
import {floorSpot} from '../public/dance-motion.js';
import {appearanceVariant,sharedMaterial} from '../public/appearance.js';
test('crowd reserves 66 distinct dance slots including incoming guests',()=>{
 assert.equal(MAX_DANCERS,66);const people=[];for(let i=0;i<MAX_DANCERS;i++){assert.equal(freeDanceSlot(people),i);const spot=floorSpot(i);people.push({role:i%2?'dance':'table',walking:i%2===0,destinationRole:'dance',danceSlot:i,root:{position:spot},path:[spot]});}
 assert.equal(freeDanceSlot(people),null);assert.equal(freeDanceSlot(people,people[15]),15);assert.equal(floorSpot(MAX_DANCERS),null);assert.equal(MAX_GUESTS,128);
});
test('incoming seated guests reserve their destination rather than their departure point',()=>{
 const seats=[{x:8,z:4},{x:8,z:5},{x:9,z:5,vip:true}],guest={walking:true,path:[{x:8,z:4}],root:{position:{x:0,z:23}}};
 assert.equal(freeSeat(seats,[guest]),seats[1]);assert.equal(freeSeat(seats,[guest],guest),seats[0]);assert.equal(freeSeat(seats,[guest],null,true),seats[2]);
});
test('distant or unseen actors receive less animation work while entrances and featured actors stay responsive',()=>{
 assert.equal(animationInterval(20,false,true,false),0);assert.equal(animationInterval(20,false,false,true),0);
 assert.ok(animationInterval(20,false,false,false)>animationInterval(20,true,false,false));
 assert.ok(animationInterval(20,true,false,false)>animationInterval(8,true,false,false));
 assert.equal(crowdBudget(100).fps,30);assert.ok(crowdBudget(100).pixelRatio<crowdBudget(30).pixelRatio);
});
test('six looks share source textures and reuse the same material within a wardrobe combination',()=>{
 const colors=new Set(Array.from({length:6},(_,i)=>appearanceVariant('female-party-02',i*10).cloth));assert.equal(colors.size,6);
 const source=new T.MeshStandardMaterial({map:new T.Texture()}),assets={};source.name='female_head';
 const first=sharedMaterial(assets,source,{modelName:'female-party-02',gender:'female',variant:0});
 assert.equal(first,sharedMaterial(assets,source,{modelName:'female-party-02',gender:'female',variant:1}));
 const alternate=sharedMaterial(assets,source,{modelName:'female-party-02',gender:'female',variant:10});assert.notEqual(first,alternate);assert.equal(first.map,alternate.map);assert.equal(first.customProgramCacheKey(),alternate.customProgramCacheKey());
});
test('expanded room has enough seats for 128 guests with separated standing and seated positions',async()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}})})};
 try{const {buildClub}=await import('../public/environment.js');const scene=new T.Scene(),club=buildClub(scene);
  assert.equal(club.seats.filter(s=>s.vip).length,MAX_VIP);assert.equal(new Set(club.seats.filter(s=>s.vip).map(s=>s.loungeId)).size,4);
  assert.ok(club.seats.length+MAX_DANCERS+4>=MAX_GUESTS);
  for(let i=0;i<club.seats.length;i++)for(let j=i+1;j<club.seats.length;j++)assert.ok(Math.hypot(club.seats[i].x-club.seats[j].x,club.seats[i].z-club.seats[j].z)>.75);
  for(let i=0;i<MAX_DANCERS;i++){const spot=floorSpot(i);for(const s of club.seats)assert.ok(Math.hypot(spot.x-s.x,spot.z-s.z)>1.25);}
  assert.ok(club.batchedDraws>500);const bars=club.bars.map(b=>b.scale.y);club.update(2);assert.ok(club.bars.some((b,i)=>b.scale.y!==bars[i]));assert.ok(club.bars.every(b=>b.parent));
 }finally{globalThis.document=old;}
});

test('frame pacing retains fractional time and pauses cleanly in background',()=>{
 const clock=new FrameClock(0);let frames=0,total=0;for(let i=1;i<=600;i++){const dt=clock.tick(i*1000/60,30);if(dt!==null){frames++;total+=dt;}}
 assert.equal(frames,300);assert.ok(Math.abs(total-10)<1e-7);assert.equal(clock.tick(11000,30,true),null);assert.equal(clock.tick(11001,30),null);
});

test('circular floor contains every dancer and camera stays inside the circular room',async()=>{const {constrainCamera}=await import('../public/spatial.js');for(let i=0;i<MAX_DANCERS;i++){const p=floorSpot(i);assert.ok(Math.hypot(p.x-FLOOR.x,p.z-FLOOR.z)<FLOOR.r-.35);}for(let i=0;i<100;i++){const p=constrainCamera({x:Math.sin(i)*40,z:Math.cos(i)*40,y:8});assert.ok(Math.hypot(p.x-ROOM.x,p.z-ROOM.z)<=ROOM.r-1.2+.000001);}});

test('all four VIP platforms, entrances and camera points stay inside the room',async()=>{
 const {floorHeight}=await import('../public/spatial.js');
 for(const l of VIP_LOUNGES){for(const x of [-2.45,0,2.45])for(const z of [-2.65,0,2.65]){const p=vipPoint(l,x,0,z);assert.ok(Math.hypot(p[0]-ROOM.x,p[2]-ROOM.z)<ROOM.r);}
  for(const x of [-1.2,0,1.2]){const [px,,pz]=vipPoint(l,x,0,-1.55);assert.equal(floorHeight(px,pz),.32);}
  const [x,,z]=vipPoint(l,0,2.33,6.1);assert.ok(Math.hypot(x-ROOM.x,z-ROOM.z)<ROOM.r-1.2);
 }
});

test('adaptive quality requires sustained pressure and recovers slowly within safe bounds',async()=>{
 const {AdaptiveQuality}=await import('../public/crowd.js'),q=new AdaptiveQuality();q.sample(15);q.sample(15);assert.equal(q.scale,1);assert.equal(q.sample(15),true);assert.equal(q.scale,.9);for(let i=0;i<30;i++)q.sample(15);assert.equal(q.scale,.8);for(let i=0;i<14;i++)q.sample(30);assert.equal(q.scale,.8);q.sample(30);assert.equal(q.scale,.9);for(let i=0;i<30;i++)q.sample(30);assert.equal(q.scale,1);
});
test('distant appearance shares texture resources and uses the simpler lighting model',()=>{
 const source=new T.MeshStandardMaterial({map:new T.Texture()}),assets={};source.name='female_body';const material=sharedMaterial(assets,source,{modelName:'female-party-02',gender:'female',variant:0});const low=material.userData.distantMaterial;assert.ok(low.isMeshStandardMaterial);assert.ok(!low.isMeshPhysicalMaterial);assert.equal(low.map,material.map);assert.equal(low.onBeforeCompile,material.onBeforeCompile);
});
