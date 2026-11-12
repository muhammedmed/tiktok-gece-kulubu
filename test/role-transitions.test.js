import {MAX_DANCERS,VIP_LOUNGES,vipPoint} from '../public/club-layout.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {ENTRY_SECONDS,advancePath,entranceApproach} from '../public/role-transitions.js';
import {ShotQueue,AutoTour} from '../public/director.js';
import {floorSpot} from '../public/dance-motion.js';
test('all dance and VIP approaches finish in 1.8 seconds even across corners and frame rates',()=>{
 const destinations=[...Array.from({length:MAX_DANCERS},(_,i)=>{const p=floorSpot(i);return {role:'dance',dest:[p.x,0,p.z]};}),...VIP_LOUNGES.flatMap(l=>[-1.2,0,1.2].map(x=>({role:'vip',dest:vipPoint(l,x,0,-1.55)})))];
 for(const {role,dest} of destinations)for(const fps of [12,30,60]){const approach=entranceApproach(dest,role),position=new T.Vector3(...approach.start),path=approach.path.map(p=>new T.Vector3(...p));const length=path.reduce((sum,p,i)=>sum+p.distanceTo(i?path[i-1]:position),0);let elapsed=0;
  while(path.length&&elapsed<2.1){advancePath(position,path,length/ENTRY_SECONDS/fps);elapsed+=1/fps;}
  assert.ok(elapsed>=ENTRY_SECONDS-1e-6&&elapsed<=ENTRY_SECONDS+1/fps+1e-6);assert.ok(position.distanceTo(new T.Vector3(...dest))<1e-6);
 }
});
test('direct role cuts into an entrance immediately and repeated same-role gifts do not extend it',()=>{
 const q=new ShotQueue();let released=false,started=0;q.push({key:'join',person:{walking:true},priority:1,duration:9,followArrival:true,onRelease:()=>released=true},0);q.tick(0);
 const event={key:'saz',person:{walking:false},priority:4,duration:5,immediate:true,onStart:()=>started++};q.push(event,.1);assert.equal(q.current.key,'saz');assert.equal(released,true);
 for(let i=0;i<50;i++)q.push(event,.2);assert.equal(started,1);assert.equal(q.until,5.1);assert.equal(q.items.length,0);
});
test('short entrance announces arrival once then returns to dance, not a long room tour',()=>{
 const q=new ShotQueue(),p={walking:true};let arrivals=0;q.push({key:'vip',person:p,priority:2,duration:8,followArrival:true,arrivalHold:4,returnView:'dance',returnDuration:1.5,onArrival:()=>arrivals++},0);q.tick(0);p.walking=false;q.tick(1.8);q.tick(3);assert.equal(arrivals,1);assert.equal(q.tick(5.81),null);assert.equal(q.returnView,'dance');assert.equal(q.returnUntil,7.31);
 const tour=new AutoTour();tour.tick(0);tour.tick(20);assert.equal(tour.tick(20).view,'saz');tour.resumeDance();assert.equal(tour.tick(20).view,'dance');
});
test('queued dancer upgraded to a direct role is removed from the old queue',()=>{
 const q=new ShotQueue(),p={walking:true};q.push({key:'a',priority:3,duration:10},0);q.tick(0);q.push({key:'dance',person:p,priority:1,duration:8},1);q.push({key:'dj',person:p,priority:4,duration:5,immediate:true},2);assert.equal(q.current.key,'dj');assert.equal(q.items.length,0);
});
