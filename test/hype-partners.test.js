import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {HypePartners,HYPE_PARTNER_CLEARANCE} from '../public/hype-partners.js';
import {floorSpot} from '../public/dance-motion.js';
import {FLOOR,ROOM,MAX_DANCERS} from '../public/club-layout.js';

function crowd(count){return Array.from({length:count},(_,slot)=>{
 const spot=floorSpot(slot),root=new T.Group();root.position.set(spot.x,0,spot.z);
 return {name:`guest-${slot}`,root,role:'dance',danceSlot:slot,serverRevision:1};
});}
const snapshot=people=>people.map(p=>p.root.position.clone());
function restored(people,origins){people.forEach((p,i)=>{
 assert.deepEqual(p.root.position.toArray(),origins[i].toArray());assert.equal(p.danceSlot,i);assert.equal(p.role,'dance');
 assert.equal(p.hypePartner,null);assert.equal(p.hypeMoving,false);assert.equal(p.hypeTravel,null);
});}

test('Coştur really swaps places and partner identities, then returns to the exact assigned spots',()=>{
 for(const count of [4,8,30,MAX_DANCERS]){
  const people=crowd(count),origins=snapshot(people),show=new HypePartners(()=>people);
  assert.equal(show.start(10),true);assert.equal(show.start(11),false);
  show.update(18);
  const moved=people.filter((p,i)=>p.root.position.distanceTo(origins[i])>.5);
  assert.ok(moved.length>=2,`${count}: guests exchange positions`);
  if(count===MAX_DANCERS)assert.ok(moved.length>=24,'a full floor still has many real exchanges');
  for(const p of moved){assert.ok(p.hypePartner);assert.notEqual(p.hypePartner,people[p.danceSlot^1]);assert.equal(p.hypePartner.hypePartner,p);assert.equal(p.hypeMoving,false);}
  assert.ok(people.filter(p=>p.hypePartner!==people[p.danceSlot^1]).length>=4);
  show.update(26);people.forEach((p,i)=>assert.deepEqual(p.root.position.toArray(),origins[i].toArray()));
  show.update(28);assert.equal(show.active,null);restored(people,origins);
 }
});

test('sparse and capacity routes stay finite, in bounds and clear of every other root at 120 Hz',()=>{
 for(const count of [1,2,4,8,30,MAX_DANCERS]){
  const people=crowd(count),origins=snapshot(people),show=new HypePartners(()=>people);show.start(0);
  for(let frame=0;frame<=18*120;frame++){
   show.update(frame/120);
   for(let i=0;i<people.length;i++){
    const p=people[i],at=p.root.position;
    assert.ok(at.toArray().every(Number.isFinite));
    assert.ok(Math.hypot(at.x-FLOOR.x,at.z-FLOOR.z)<=FLOOR.r);
    assert.ok(Math.hypot(at.x-ROOM.x,at.z-ROOM.z)<=ROOM.r);
    if(p.hypeTravel){assert.ok(Object.values(p.hypeTravel).every(Number.isFinite));assert.ok(p.hypeTravel.weight>0&&p.hypeTravel.weight<=1);assert.ok(Math.abs(Math.hypot(p.hypeTravel.x,p.hypeTravel.z)-1)<1e-8);}
    for(let j=i+1;j<people.length;j++)assert.ok(at.distanceTo(people[j].root.position)>=HYPE_PARTNER_CLEARANCE,`${count} guests, frame ${frame}: ${i}/${j}`);
   }
  }
  restored(people,origins);
 }
});

test('one or two guests preserve their pair, odd counts leave the final guest safely unpaired',()=>{
 for(const count of [0,1,2,5]){
  const people=crowd(count),origins=snapshot(people),show=new HypePartners(()=>people);show.start(0);show.update(8);
  if(count<3)people.forEach((p,i)=>{assert.deepEqual(p.root.position.toArray(),origins[i].toArray());assert.equal(p.hypePartner,people[i^1]||null);});
  if(count%2)assert.equal(people.at(-1).hypePartner,null);
  show.stop();restored(people,origins);
 }
});

test('release restores the complete affected group and remaining routes stay clear of its original spots',()=>{
 const people=crowd(MAX_DANCERS),origins=snapshot(people),show=new HypePartners(()=>people);show.start(0);show.update(4.5);
 const group=show.active.groups.find(g=>g.routes.size),person=[...group.routes.keys()][0];
 show.release(undefined);show.release(person);show.release(person);
 for(const p of group.members){assert.deepEqual(p.root.position.toArray(),origins[p.danceSlot].toArray());assert.equal(p.hypePartner,null);}
 for(let frame=0;frame<240;frame++){
  show.update(4.5+frame/30);
  for(let i=0;i<people.length;i++)for(let j=i+1;j<people.length;j++)assert.ok(people[i].root.position.distanceTo(people[j].root.position)>=HYPE_PARTNER_CLEARANCE);
 }
 show.stop();restored(people,origins);
});

test('leaving, role/slot/revision changes, a new position and solo never get overwritten',()=>{
 for(const change of ['leave','role','slot','revision','position','solo','walking','moneyHidden','moneyGuest','moneyInteraction']){
  let people=crowd(8);const show=new HypePartners(()=>people);show.start(0);show.update(4.5);
  const group=show.active.groups.find(g=>g.routes.size),person=[...group.routes.keys()][0];
  if(change==='leave')people=people.filter(p=>p!==person);
  else if(change==='role')person.role='vip';
  else if(change==='slot')person.danceSlot=MAX_DANCERS-1;
  else if(change==='revision')person.serverRevision++;
  else if(change!=='position')person[change]=true;
  person.root.position.set(20,.32,9);
  show.update(5);show.stop();
  assert.deepEqual(person.root.position.toArray(),[20,.32,9],change);
  assert.equal(person.hypePartner,null);assert.equal(person.hypeMoving,false);
  for(const p of group.members.filter(p=>p!==person)){const spot=floorSpot(p.danceSlot);assert.deepEqual(p.root.position.toArray(),[spot.x,0,spot.z]);}
 }
});

test('ineligible guests and stationary obstacles are respected while planning',()=>{
 const people=crowd(10),excluded=people[0];excluded.solo={startedAt:0};
 const obstruction={role:'vip',root:new T.Group()};obstruction.root.position.set(0,0,5);people.push(obstruction);
 const origins=snapshot(people),show=new HypePartners(()=>people);show.start(0);
 assert.ok(!show.active.records.has(excluded));assert.ok(!show.active.records.has(obstruction));
 for(let frame=0;frame<18*60;frame++){
  show.update(frame/60);assert.deepEqual(excluded.root.position.toArray(),origins[0].toArray());assert.deepEqual(obstruction.root.position.toArray(),origins.at(-1).toArray());
  for(const p of people.filter(p=>p.hypeMoving))assert.ok(p.root.position.distanceTo(obstruction.root.position)>=HYPE_PARTNER_CLEARANCE);
 }
 show.stop();assert.equal(show.start(30),true);show.stop();
});

test('mid-show arrivals cancel obstructed exchanges without changing the newcomer',()=>{
 for(const walking of [false,true]){
  const people=crowd(30),origins=snapshot(people),show=new HypePartners(()=>people);show.start(0);show.update(4.5);
  const group=show.active.groups.find(g=>g.routes.size),mover=[...group.routes.keys()][0];
  const newcomer={role:'dance',danceSlot:MAX_DANCERS-2,root:new T.Group(),walking};newcomer.root.position.copy(mover.root.position);
  const position=newcomer.root.position.clone();people.push(newcomer);show.update(4.6);
  assert.equal(group.cancelled,true);assert.deepEqual(newcomer.root.position.toArray(),position.toArray());assert.equal(newcomer.danceSlot,MAX_DANCERS-2);
  for(const p of group.members)assert.deepEqual(p.root.position.toArray(),origins[p.danceSlot].toArray());
  if(walking)assert.ok(show.active.groups.filter(g=>g.routes.size).every(g=>g.cancelled));
  show.stop();
 }
});
