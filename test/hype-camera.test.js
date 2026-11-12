import {MAX_DANCERS} from '../public/club-layout.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {hypeCamera} from '../public/hype-camera.js';
import {floorSpot} from '../public/dance-motion.js';
import {constrainCamera} from '../public/spatial.js';

function dancers(count){
 const people=Array.from({length:count},(_,slot)=>{
  const spot=floorSpot(slot),root=new T.Group();root.position.set(spot.x,0,spot.z);
  return {role:'dance',danceSlot:slot,root};
 });
 for(const p of people)p.dancePartner=people[p.danceSlot^1];
 return people;
}
function assertSafe(plan,aspect){
 assert.ok([...plan.pos.toArray(),...plan.target.toArray(),plan.fov].every(Number.isFinite));
 assert.ok(constrainCamera(plan.pos.clone()).distanceTo(plan.pos)<.00001);
 if(plan.wide)return;
 assert.equal(plan.people.length,2);
 const camera=new T.PerspectiveCamera(plan.fov,aspect,.1,90);camera.position.copy(plan.pos);camera.lookAt(plan.target);camera.updateMatrixWorld(true);
 for(const person of plan.people)for(const x of [-.46,.46])for(const y of [.015,2.02])for(const z of [-.32,.32]){
  const point=person.root.position.clone().add(new T.Vector3(x,y,z)).project(camera);
  assert.ok(Math.abs(point.x)<=.881&&point.y>=-.501&&point.y<=.701,`${plan.shotId} crops a full body at ${aspect}`);
 }
}

test('Coştur tours seven shots and several distinct pairs across the occupied floor',()=>{
 for(const count of [8,MAX_DANCERS])for(const aspect of [9/16,16/9]){
  const people=dancers(count),plans=[1,3,6,9,12,15,17].map(age=>hypeCamera(people,age,aspect));
  assert.equal(new Set(plans.map(p=>p.shotId)).size,7);
  assert.ok(plans.every(p=>p.cut===true&&p.label));
  assert.equal(plans[0].wide,true);assert.equal(plans[5].wide,true);
  const duets=plans.filter(p=>!p.wide);assert.equal(duets.length,5);
  assert.ok(new Set(duets.map(p=>p.people[0])).size>=Math.min(4,count/2));
  const centers=duets.map(p=>p.target);
  if(count===MAX_DANCERS){assert.ok(Math.max(...centers.map(p=>p.x))-Math.min(...centers.map(p=>p.x))>10);assert.ok(Math.max(...centers.map(p=>p.z))-Math.min(...centers.map(p=>p.z))>12);}
  const angles=duets.map(p=>Math.atan2(p.pos.x-p.target.x,p.pos.z-p.target.z));
  assert.ok(angles.some(a=>angles.some(b=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))>1)));
  for(const plan of plans)assertSafe(plan,aspect);
 }
});

test('sparse and crowded tours preserve feet and heads with every camera inside the room',()=>{
 for(const count of [1,2,8,MAX_DANCERS])for(const aspect of [356/778,9/16,16/9]){
  const people=dancers(count);
  // Add seated/non-dancing guests to the camera's obstruction population.
  if(count===MAX_DANCERS)for(let i=0;i<20;i++){const root=new T.Group();root.position.set((i%5-2)*3,0,25+Math.floor(i/5));people.push({role:'vip',root});}
  for(let age=0;age<18;age+=.37)assertSafe(hypeCamera(people,age,aspect),aspect);
 }
 assert.equal(hypeCamera([],4,1),null);
});

test('temporary same-parity partners are deduplicated by identity and followed during a shot',()=>{
 const people=dancers(8);
 for(const [a,b] of [[0,2],[1,3],[4,6],[5,7]]){people[a].hypePartner=people[b];people[b].hypePartner=people[a];}
 for(const age of [3,6,9,12,17]){
  const plan=hypeCamera(people,age,9/16);assert.equal(plan.wide,false);
  assert.equal(plan.people[0].hypePartner,plan.people[1]);assertSafe(plan,9/16);
 }
 const before=hypeCamera(people,6,9/16),first=before.people[0],old=before.people[1];
 const next=people.find(p=>p!==first&&p!==old),other=next.hypePartner;
 first.hypePartner=next;next.hypePartner=first;old.hypePartner=other;other.hypePartner=old;
 const after=hypeCamera(people,6.1,9/16);
 assert.equal(after.shotId,before.shotId);assert.ok(after.people.includes(first));assert.ok(after.people.includes(next));assertSafe(after,9/16);
});

test('shot identity and pair stay stable while the camera tracks within a phase',()=>{
 const people=dancers(MAX_DANCERS),before=hypeCamera(people,8.5,9/16);
 for(const p of before.people)p.root.position.x+=.12;
 const after=hypeCamera(people,8.6,9/16);
 assert.equal(after.shotId,before.shotId);assert.deepEqual(after.people,before.people);
 assert.ok(after.pos.distanceTo(before.pos)<.5);assert.ok(after.target.distanceTo(before.target)>.1);
 assertSafe(after,9/16);
 // Rewinding to a new show must also select the opening phase correctly.
 assert.equal(hypeCamera(people,0,9/16).shotId,'opening');
});

test('angle selection avoids guests even if the previous camera culled them',()=>{
 const clear=dancers(2),baseline=hypeCamera(clear,3.5,9/16);
 const blocked=dancers(2),root=new T.Group();
 root.position.copy(baseline.pos).lerp(baseline.people[0].root.position,.55);root.position.y=0;root.visible=false;
 blocked.push({role:'vip',root});
 const plan=hypeCamera(blocked,3.5,9/16);
 assert.ok(plan.pos.distanceTo(baseline.pos)>1,'a blocked preferred angle should be replaced');
 assertSafe(plan,9/16);
});

test('the exchange cut favors an actively swapping pair',()=>{
 const people=dancers(MAX_DANCERS);people[MAX_DANCERS-2].hypeMoving=true;people[MAX_DANCERS-1].hypeTravel=.5;
 const plan=hypeCamera(people,5,9/16);
 assert.equal(plan.shotId,'exchange');assert.ok(plan.people.some(p=>p.hypeMoving||p.hypeTravel));assertSafe(plan,9/16);
});
