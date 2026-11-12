import test from 'node:test';
import assert from 'node:assert/strict';
import {dancePose,DANCE_BPM} from '../public/dance-motion.js';
import {hypePose,hypeEnvelope,HYPE_SECONDS} from '../public/hype-motion.js';

const world=(p,a)=>[p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],-p[0]*Math.sin(a)+p[2]*Math.cos(a)];
const distance=(a,b)=>Math.hypot(...a.map((value,i)=>value-b[i]));
function numbers(value){return typeof value==='number'?[value]:value&&typeof value==='object'?Object.values(value).flatMap(numbers):[];}
function poseDistance(a,b){
 const paths=[['hands','left'],['hands','right'],['feet','left'],['feet','right']];
 return Math.max(...paths.map(([kind,key])=>distance(world(a[kind][key],a.turn),world(b[kind][key],b.turn))),
  ...['x','y','z','lean','twist'].map(key=>Math.abs(a.body[key]-b.body[key])),
  ...['clap','shoulder','wrist','headYaw','headNod','solo'].map(key=>Math.abs(a[key]-b[key])),
  Math.abs(Math.sin(a.turn)-Math.sin(b.turn)),Math.abs(Math.cos(a.turn)-Math.cos(b.turn)));
}

test('the entire 18-second event returns exactly to the ordinary global dance clock',()=>{
 assert.equal(HYPE_SECONDS,18);
 for(const time of [0,.25,7.3,25.4,41.7,70])for(const pair of [0,2,7])for(const side of [-1,1]){
  const ordinary=dancePose(time,pair,side);
  for(const age of [-10,0,18,25])for(const travel of [0,.5,1])assert.deepEqual(hypePose(time,age,pair,side,3,travel),ordinary);
  for(const age of [1e-7,18-1e-7])assert.ok(poseDistance(ordinary,hypePose(time,age,pair,side,3))<1e-10);
 }
 assert.equal(hypeEnvelope(0),0);assert.equal(hypeEnvelope(18),0);assert.equal(hypeEnvelope(5),1);
});

test('all individual phrases and both envelope edges blend without a pose jump',()=>{
 const boundaries=[0,.65,.85,1.2,1.3,15.2,16.1,16.85,18,...Array.from({length:6},(_,i)=>[1.2+i*2.8,1.2+(i+.68)*2.8]).flat()];
 for(const start of [0,3.141,19.7])for(const pair of [0,1,5])for(const side of [-1,1])for(const variant of [0,1,2,3,4])for(const age of boundaries){
  const a=hypePose(start+age-1e-6,age-1e-6,pair,side,variant),b=hypePose(start+age+1e-6,age+1e-6,pair,side,variant);
  assert.ok(poseDistance(a,b)<.0001,`jump at ${age}, pair ${pair}, side ${side}`);
 }
});

test('five guests show raised applause, shoulders, knees, a waist flourish and a turn simultaneously',()=>{
 const time=20.2,poses=[0,1,2,3,4].map(variant=>hypePose(time,2.6,0,-1,variant));
 assert.equal(new Set(poses.map(p=>p.phrase)).size,5);
 assert.ok(poses[0].clap>.99&&poses[0].hands.left[1]>1.55);
 assert.ok(poses[1].clap<.01&&Math.abs(poses[1].shoulder)>Math.abs(dancePose(time).shoulder)*2);
 assert.ok(poses[2].body.y<poses[0].body.y-.04);
 assert.ok(poses[2].hands.left[0]>.47&&poses[2].hands.right[0]<-.47);
 assert.ok(poses[3].beltWeight.left>.99&&poses[3].hands.left[1]===1.1);
 assert.ok(poses[3].hands.right[1]>1.58&&poses[3].beltWeight.right===0);
 assert.ok(Math.abs(poses[4].turn-dancePose(time).turn)>1.5);
 const tapTime=(40+.5)*60/DANCE_BPM,ordinary=dancePose(tapTime),taps=hypePose(tapTime,2.6,0,-1,1);
 assert.ok(Math.max(...taps.heel)>Math.max(...ordinary.heel)+.1);
});

test('individual orders keep five figures active and partners different throughout the middle',()=>{
 for(const age of [1.5,2.6,4.7,6.9,8.3,10.1,12.8,14.9])for(const pair of [0,1,4])for(const side of [-1,1]){
  const poses=Array.from({length:5},(_,variant)=>hypePose(20.2,age,pair,side,variant));
  assert.equal(new Set(poses.map(p=>p.phrase)).size,5,`all figures at age ${age}, pair ${pair}, side ${side}`);
  for(const [variant,pose]of poses.entries()){
   assert.notEqual(pose.phrase,hypePose(20.2,age,pair,-side,variant).phrase);
   assert.notEqual(pose.phrase,hypePose(20.2,age,pair+1,side,variant).phrase);
  }
 }
 for(const pair of [0,2])for(const side of [-1,1])for(const variant of [0,2,4]){
  const phrases=Array.from({length:5},(_,index)=>hypePose(20.2,2.6+index*2.8,pair,side,variant).phrase);
  assert.equal(new Set(phrases).size,5);
 }
 // The demonstration crowd shares each pair's variant; those partners still
 // differ, and its ten real slot identities cover all five middle figures.
 for(const age of [2.6,5.4,8.2,11,13.8]){
  const crowd=Array.from({length:10},(_,slot)=>{
   const pair=Math.floor(slot/2);return hypePose(20.2,age,pair,slot%2?1:-1,pair);
  });
  assert.equal(new Set(crowd.map(p=>p.phrase)).size,5);
  for(let slot=0;slot<10;slot+=2)assert.notEqual(crowd[slot].phrase,crowd[slot+1].phrase);
 }
});

test('partners answer each other and the final applause rejoins the shared beat',()=>{
 const time=20.2;
 const a=hypePose(time,2.6,0,-1,4),partner=hypePose(time,2.6,0,1,1);
 assert.ok(a.turn*partner.turn<0);
 assert.ok(Math.abs(a.solo-partner.solo)>.1);
 assert.notDeepEqual(hypePose(time,5,0,-1,0).hands,hypePose(time,5,0,-1,4).hands);
 assert.notDeepEqual(hypePose(time,12,0,-1,0).hands,hypePose(time,12,2,-1,0).hands);
 const finale=hypePose(time,16.3,0,-1,0);
 for(const pair of [0,1,4])for(const side of [-1,1])for(const variant of [0,1,3]){
  const pose=hypePose(time,16.3,pair,side,variant);
  assert.deepEqual(pose.hands,finale.hands);assert.equal(pose.clap,1);assert.deepEqual(pose.snapWeight,{left:0,right:0});
 }
});

test('every support foot preserves its ordinary world contact, including during quarter turns',()=>{
 for(const start of [0,4.125,24.1])for(const pair of [0,2,5])for(const side of [-1,1])for(const variant of [0,2,4])for(let age=.017;age<18;age+=.043){
  const time=start+age,base=dancePose(time,pair,side),pose=hypePose(time,age,pair,side,variant);
  let grounded=0;
  for(const key of ['left','right'])if(base.feet[key][1]===0){
   grounded++;assert.equal(pose.feet[key][1],0);
   assert.ok(distance(world(base.feet[key],base.turn),world(pose.feet[key],pose.turn))<1e-12);
  }
  assert.ok(grounded>0);
  assert.ok(distance(world([base.body.x,0,base.body.z],base.turn),world([pose.body.x,0,pose.body.z],pose.turn))<1e-12);
 }
});

test('crowd motion remains finite, reachable and grounded across repeated dance rounds',()=>{
 for(const start of [0,11,29,48,80])for(const side of [-1,1])for(let age=0;age<=18;age+=.037){
  const pose=hypePose(start+age,age,3,side,7);
  assert.ok(numbers(pose).every(Number.isFinite));
  assert.ok(pose.body.y>=-.14&&pose.body.y<=-.034);
  assert.ok(Math.hypot(pose.body.x,pose.body.z)<.14);
  assert.ok(Math.abs(pose.wrist)<.08&&Math.abs(pose.shoulder)<.09);
  assert.ok(Math.min(pose.feet.left[1],pose.feet.right[1])===0);
  for(const key of ['left','right']){
   const hand=pose.hands[key],foot=pose.feet[key];
   assert.ok(Math.abs(hand[0])<=.52&&hand[1]<=1.65&&hand[2]>=.025-1e-12);
   if(hypeEnvelope(age)===1)assert.ok(hand[2]>=.085-1e-12);
   assert.ok(foot[1]>=0&&foot[1]<.09);
   assert.ok(Math.hypot(foot[0],foot[2])<.35);
   if(pose.elbows){assert.ok(Math.sign(pose.elbows[key][0])===Math.sign(hand[0]));assert.ok(pose.elbows[key][1]>=1.1&&pose.elbows[key][1]<1.3);}
  }
 }
});

test('formation travel fades smoothly into lifted steps, open hands and smaller flourishes',()=>{
 const still=hypePose(20.2,2.6,0,-1,4),moving=hypePose(20.2,2.6,0,-1,4,1),base=dancePose(20.2);
 assert.ok(Math.abs(moving.turn-base.turn)<Math.abs(still.turn-base.turn)*.1);
 assert.deepEqual(moving.beltWeight,{left:0,right:0});
 assert.deepEqual(moving.snapWeight,{left:0,right:0});assert.equal(moving.clap,0);
 assert.ok(Math.max(moving.feet.left[1],moving.feet.right[1])>Math.max(still.feet.left[1],still.feet.right[1]));
 for(const weight of [0,.25,.5,.75,1,NaN,Infinity])for(const pair of [0,2])for(const side of [-1,1])for(let age=0;age<=18;age+=.043){
  const pose=hypePose(11+age,age,pair,side,3,weight);
  assert.ok(numbers(pose).every(Number.isFinite));
  assert.equal(Math.min(pose.feet.left[1],pose.feet.right[1]),0);
  assert.ok(Math.max(pose.feet.left[1],pose.feet.right[1])<.14);
  const a=hypePose(11+age,age,pair,side,3,weight-1e-6),b=hypePose(11+age,age,pair,side,3,weight+1e-6);
  assert.ok(poseDistance(a,b)<.0001);
 }
});
