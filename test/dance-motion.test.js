import {MAX_DANCERS} from '../public/club-layout.js';
import test from 'node:test';import assert from 'node:assert/strict';
import{dancePose,floorSpot,DANCE_BPM,countedStep,pivotStep}from'../public/dance-motion.js';
test('paired floor slots face one another and keep room between bodies',()=>{for(let i=0;i<MAX_DANCERS;i+=2){const a=floorSpot(i),b=floorSpot(i+1);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>1.85);const dx=b.x-a.x,dz=b.z-a.z;assert.ok(Math.sin(a.yaw)*dx+Math.cos(a.yaw)*dz>1.85);assert.ok(Math.sin(b.yaw)*-dx+Math.cos(b.yaw)*-dz>1.85);}assert.equal(floorSpot(MAX_DANCERS),null);});
test('a complete phrase cycle always keeps a foot planted and bounds knee pulses',()=>{for(let t=0;t<70;t+=.01){const p=dancePose(t,2,-1,1);assert.ok(Math.min(p.feet.left[1],p.feet.right[1])<=.000001);assert.ok(p.body.y>=-.08&&p.body.y<=-.034);assert.ok(p.feet.left[1]<=.101);assert.ok(p.feet.right[1]<=.101);}});
test('phrase boundaries have no visible pose or turn discontinuities',()=>{for(const side of [-1,1])for(const beat of [8,16,24,32,40,48,56,64]){const t=beat*60/DANCE_BPM;const a=dancePose(t-.00001,0,side),b=dancePose(t+.00001,0,side);for(const key of ['x','y','z'])assert.ok(Math.abs(a.body[key]-b.body[key])<.001);for(const key of ['left','right'])for(let i=0;i<3;i++)assert.ok(Math.abs(a.hands[key][i]-b.hands[key][i])<.001);assert.ok(Math.abs(Math.sin(a.turn)-Math.sin(b.turn))<.001);assert.ok(Math.abs(Math.cos(a.turn)-Math.cos(b.turn))<.001);}});
test('partners take turns clapping while the other performs',()=>{
 const t=36*60/DANCE_BPM,a=dancePose(t,0,-1),b=dancePose(t,0,1);
 assert.equal(a.snapWeight.left,0);assert.equal(a.clap,1);assert.equal(b.clap,0);assert.ok(a.hands.left[1]>1.2);assert.ok(b.snapWeight.left>.99);
 const later=44*60/DANCE_BPM;assert.equal(dancePose(later,0,1).snapWeight.left,0);assert.ok(dancePose(later,0,-1).snapWeight.left>.99);
});
test('a full floor keeps distinct dancers separated',()=>{for(let a=0;a<MAX_DANCERS;a++)for(let b=a+1;b<MAX_DANCERS;b++){const x=floorSpot(a),y=floorSpot(b);assert.ok(Math.hypot(x.x-y.x,x.z-y.z)>1.25);}});

test('Ankara accents remain continuous for both partners, every offset and excitement level',()=>{
 for(const pair of [0,1,4,8])for(const side of [-1,1])for(const hype of [0,1])for(let boundary=8;boundary<=192;boundary+=8){
  const t=(boundary-pair*8)*60/DANCE_BPM,a=dancePose(t-1e-6,pair,side,hype),b=dancePose(t+1e-6,pair,side,hype);
  for(const limb of ['left','right'])for(let k=0;k<3;k++)assert.ok(Math.abs(a.feet[limb][k]-b.feet[limb][k])<.0001);
  for(const key of ['wrist','shoulder','headYaw','headNod','solo','clap'])assert.ok(Math.abs(a[key]-b[key])<.0001,key);
 }
});
test('solo invitations alternate and torso movement stays inside the reserved space',()=>{
 assert.ok(dancePose(36*60/DANCE_BPM,0,1).solo>.99);
 assert.equal(dancePose(36*60/DANCE_BPM,0,-1).solo,0);
 assert.ok(dancePose(44*60/DANCE_BPM,0,-1).solo>.99);
 for(let t=0;t<105;t+=.013)for(const side of [-1,1]){const p=dancePose(t,0,side,1);assert.ok(Math.hypot(p.body.x,p.body.z)<.14);assert.ok(p.hands.left[0]>0&&p.hands.right[0]<0);}
});

test('support foot stays fixed for each counted step and the eight-count loop closes',()=>{
 for(let style=0;style<3;style++)for(let i=0;i<8;i++){
  const start=countedStep(i+.001,style),end=countedStep(i+.999,style);
  assert.deepEqual(start.feet[start.support],end.feet[end.support]);
  assert.equal(start.feet[start.support][1],0);
 }
 const a=countedStep(8-1e-6),b=countedStep(8+1e-6);
 for(const side of ['left','right'])for(let i=0;i<3;i++)assert.ok(Math.abs(a.feet[side][i]-b.feet[side][i])<.0001);
});


test('stepped full turns keep the support foot fixed in world space and close cleanly',()=>{
 const world=(p,a)=>[p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],-p[0]*Math.sin(a)+p[2]*Math.cos(a)];
 for(const direction of [-1,1]){
  for(let i=0;i<8;i++){
   const a=pivotStep(i+.001,direction),b=pivotStep(i+.999,direction);
   const x=world(a.feet[a.support],a.turn),y=world(b.feet[b.support],b.turn);
   for(let k=0;k<3;k++)assert.ok(Math.abs(x[k]-y[k])<1e-8);
  }
  const end=pivotStep(8,direction);assert.ok(Math.abs(end.turn-direction*Math.PI*2)<1e-8);
  for(const key of ['left','right'])assert.ok(Math.hypot(end.feet[key][0]-(key==='left'?.15:-.15),end.feet[key][2])<1e-8);
 }
});
test('successive rounds change figure order and partners alternate their full turn',()=>{
 const sequence=round=>Array.from({length:8},(_,i)=>dancePose((round*64+i*8+4)*60/DANCE_BPM,0,-1).phrase);
 assert.notDeepEqual(sequence(0),sequence(1));assert.notDeepEqual(sequence(1),sequence(2));
 assert.ok(Math.abs(dancePose(52*60/DANCE_BPM,0,-1).turn)>3);
 assert.equal(dancePose(52*60/DANCE_BPM,0,1).turn,0);
 assert.ok(Math.abs(dancePose(100*60/DANCE_BPM,0,1).turn)>3);
 assert.equal(dancePose(100*60/DANCE_BPM,0,-1).turn,0);
});
