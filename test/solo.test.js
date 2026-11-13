import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {SoloShow} from '../public/solo-show.js';
import {soloPose,soloCenter,soloClearance,soloEnvelope,SOLO_SECONDS,SOLO_CAMERA_SECONDS} from '../public/solo-motion.js';
import {floorSpot} from '../public/dance-motion.js';
import {FLOOR,MAX_DANCERS} from '../public/club-layout.js';
import {ShotQueue} from '../public/director.js';
import {ClubSession} from '../src/session.js';
import {DEFAULT_SETTINGS,validateSettings,giftRole} from '../public/club-contract.js';
import {eventDecoder} from '../src/live.js';
test('solo mapping stays unassigned until selected; gift streak gives one solo and preserves VIP reservation',()=>{
 assert.equal(DEFAULT_SETTINGS.assignments.solo,undefined);
 const settings=validateSettings({...DEFAULT_SETTINGS,handle:'host',defaultGender:'female',assignments:{solo:{id:'999',name:'Test'}}});
 const s=new ClubSession(settings,{},()=>1000);s.assign({id:'a',name:'Ada'},'vip');const original={...s.players.get('a')};
 const decode=eventDecoder(e=>!!giftRole(settings,e));
 for(const repeatEnd of [0,0,1,1]){const e=decode({type:'WebcastGiftMessage',data:{user:{id:'a',nickname:'Ada'},giftId:'999',gift:{type:1},groupId:'series',repeatEnd}});if(e)s.accept(e);}
 assert.equal(s.events.filter(e=>e.role==='solo').length,1);assert.deepEqual(s.players.get('a'),original);
});
test('solo sender chooses a character, waits for floor capacity and gets a solo on admission',()=>{
 const s=new ClubSession({...DEFAULT_SETTINGS,handle:'host',chatJoin:true});s.mode='test';
 for(let i=0;i<MAX_DANCERS;i++){s.select(String(i),'male');s.assign({id:String(i),name:'Guest'},'dance');}
 s.assign({id:'new',name:'Ada'},'solo');assert.equal(s.pending.size,1);
 s.accept({type:'chat',id:'new',name:'Ada',text:'kadın'});assert.equal(s.waitlist.get('new').soloRequested,true);assert.equal(s.events.filter(e=>e.role==='solo').length,0);
 s.players.delete('0');s.sweepInactive();assert.equal(s.players.get('new').role,'dance');assert.equal(s.events.filter(e=>e.role==='solo').length,1);
});
test('12 second show cannot be cut or extended by other gifts; queued shows and role changes survive',()=>{
 const q=new ShotQueue(),a={},b={};let releases=0;
 const first={key:'solo:a',person:a,priority:5,locked:true,fixedDuration:true,duration:SOLO_SECONDS,returnDuration:2,onRelease:()=>releases++};
 q.push(first,0);q.tick(0);q.push({...first},3);q.push({key:'solo:b',person:b,priority:5,locked:true,duration:SOLO_SECONDS},4);q.push({key:'vip:b',person:b,priority:4,immediate:true,duration:5},5);
 assert.equal(q.current.key,'solo:a');assert.equal(q.until,SOLO_SECONDS);assert.equal(q.items.length,2);q.tick(SOLO_SECONDS-.01);assert.equal(releases,0);q.tick(SOLO_SECONDS);assert.equal(releases,1);q.tick(SOLO_SECONDS+2);assert.equal(q.current.key,'solo:b');q.clear();assert.equal(q.current,null);
});
test('temporary circle fits a full 84-person floor without altering reserved slots',()=>{
 const slots=Array.from({length:MAX_DANCERS},(_,i)=>floorSpot(i)),before=JSON.stringify(slots);
 for(const slot of [0,19,40,MAX_DANCERS-1]){const center=soloCenter(slots[slot]),others=slots.filter((_,i)=>i!==slot),targets=soloClearance(others,center);
  for(const p of targets){assert.ok(Math.hypot(p.x-center.x,p.z-center.z)>=2.649);assert.ok(Math.hypot(p.x-FLOOR.x,p.z-FLOOR.z)<=FLOOR.r-.499);}
  for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++)assert.ok(Math.hypot(targets[i].x-targets[j].x,targets[i].z-targets[j].z)>1.40);
 }assert.equal(JSON.stringify(slots),before);
});
test('solo poses are finite, bounded and fade at both ends',()=>{
 assert.equal(SOLO_CAMERA_SECONDS,12);assert.equal(SOLO_SECONDS,12);assert.equal(soloEnvelope(0),0);assert.equal(soloEnvelope(SOLO_SECONDS),0);
 const numbers=v=>typeof v==='number'?[v]:v&&typeof v==='object'?Object.values(v).flatMap(numbers):[];
 for(let variant=0;variant<4;variant++)for(let t=0;t<SOLO_SECONDS;t+=.03){const p=soloPose(t,variant);assert.ok(numbers(p).every(Number.isFinite));assert.ok(p.body.y>-.45);assert.ok(p.feet.left[1]>=0&&p.feet.right[1]>=0);}
});
const person=(x,z,role='dance')=>({root:new T.Group(),role,danceSlot:4,serverRevision:1,placeAt(pos,role,yaw){this.root.position.set(...pos);this.root.rotation.y=yaw;this.role=role;}});
test('solo restores sender role, neighbors and accessories after completion or removal',()=>{
 const a=person(),b=person();a.root.position.set(0,.32,-7);a.role='vip';b.root.position.set(0,0,11);const people=[a,b],scene=new T.Scene(),show=new SoloShow(scene,()=>people);
 show.start(a,0,3);for(let t=0;t<8;t+=.03)show.update(t);assert.equal(a.role,'dance');assert.ok(b.root.position.distanceTo(new T.Vector3(0,0,11))>2.5);
 show.stop();assert.equal(a.role,'vip');assert.deepEqual(a.root.position.toArray(),[0,.32,-7]);assert.deepEqual(b.root.position.toArray(),[0,0,11]);assert.equal(a.solo,null);assert.equal(show.light.intensity,0);assert.equal(show.ring.visible,false);
 show.start(a,20,1);people.shift();show.update(21);assert.equal(show.active,null);assert.deepEqual(b.root.position.toArray(),[0,0,11]);
});
