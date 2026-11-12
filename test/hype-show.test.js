import {MAX_DANCERS} from '../public/club-layout.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {HypeShow,hypeCamera} from '../public/hype-show.js';
import {HYPE_SECONDS} from '../public/hype-motion.js';
import {floorSpot} from '../public/dance-motion.js';
import {constrainCamera} from '../public/spatial.js';
import {ShotQueue} from '../public/director.js';
import {giftShot} from '../public/gift-shots.js';

test('Coştur animation clock rejects direct reentry; queued gifts start a fresh clock after completion',()=>{
 const show=new HypeShow();assert.equal(show.start({id:'a',name:'Ada'},10),true);
 for(let i=0;i<100;i++)assert.equal(show.start({id:'b',name:'Can'},11+i*.05),false);
 assert.equal(show.active.startedAt,10);assert.equal(show.active.name,'Ada');
 assert.equal(show.update(10+HYPE_SECONDS-.001).name,'Ada');assert.equal(show.update(10+HYPE_SECONDS),null);
 assert.equal(show.energy(29),0);assert.equal(show.start({id:'b',name:'Can'},29),true);show.clear();assert.equal(show.active,null);
});
test('gift factory keeps the full Coştur show, then money; a second Coştur queues without cutting money',()=>{
 const show=new HypeShow(),queue=new ShotQueue(),started=[];
 const hype=seq=>giftShot({seq,role:'hype',id:'ada',name:'Ada'},{
  onStart:now=>{assert.equal(show.start({id:'ada',name:'Ada'},now),true);started.push(['hype',seq,now]);},
  onRelease:()=>show.clear(),
 });
 queue.push(hype(1),0);
 queue.push(giftShot({seq:2,role:'money',id:'can'},{onStart:now=>started.push(['money',2,now])}),3);
 assert.equal(queue.tick(HYPE_SECONDS-.001).key,'gift:1');assert.equal(show.active.startedAt,0);assert.ok(show.energy(6)>0);
 assert.equal(queue.tick(HYPE_SECONDS),null);assert.equal(show.active,null);
 assert.equal(queue.tick(18.75).key,'gift:2');assert.equal(queue.until,24.75);
 // Coştur has a higher priority than money, but priority orders waiting
 // gifts only. Its own clock starts when its presentation finally begins.
 queue.push(hype(3),19);assert.equal(queue.current.key,'gift:2');assert.deepEqual(queue.items.map(e=>e.key),['gift:3']);
 assert.equal(show.active,null);assert.equal(queue.tick(24.749).key,'gift:2');assert.equal(queue.tick(24.75),null);
 assert.equal(queue.tick(25.5).key,'gift:3');assert.equal(show.active.startedAt,25.5);assert.equal(queue.until,43.5);
 assert.equal(queue.tick(43.499).key,'gift:3');assert.equal(queue.tick(43.5),null);assert.equal(show.active,null);
 assert.deepEqual(started,[['hype',1,0],['money',2,18.75],['hype',3,25.5]]);
});
test('Coştur alternates a floor view and complete pairs inside the room at sparse and full capacity',()=>{
 for(const count of [1,2,8,30,MAX_DANCERS])for(const aspect of [9/16,16/9]){
  const people=Array.from({length:count},(_,slot)=>{const spot=floorSpot(slot),root=new T.Group();root.position.set(spot.x,0,spot.z);return{role:'dance',danceSlot:slot,root};});
  for(const p of people)p.dancePartner=people[p.danceSlot^1];
  for(let age=0;age<HYPE_SECONDS;age+=.2){const plan=hypeCamera(people,age,aspect);assert.ok(plan);assert.ok([...plan.pos.toArray(),...plan.target.toArray(),plan.fov].every(Number.isFinite));assert.ok(constrainCamera(plan.pos.clone()).distanceTo(plan.pos)<.00001);if(plan.people.length)assert.equal(plan.people.length,2);}
 }
 assert.equal(hypeCamera([],2,1),null);
});
