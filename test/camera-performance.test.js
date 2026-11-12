import {MAX_DANCERS} from '../public/club-layout.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {duetCloseUp,frameDuet} from '../public/camera-choreography.js';
import {floorSpot,dancePose} from '../public/dance-motion.js';
import {constrainCamera} from '../public/spatial.js';
import {drumStroke,sazGesture} from '../public/performance-motion.js';
test('automatic duet shots favor full bodies and never close up during a turn or heel figure',()=>{
 for(let pair=0;pair<18;pair++){let close=0,total=0;
  for(let t=0;t<105;t+=.05){total++;if(duetCloseUp(t,pair)!==null){close++;for(const dt of [0,.8,1.6])assert.ok(!/dönüş|topuk/i.test(dancePose(t+dt,pair,-1).phrase));}}
  assert.ok(close/total<.20);
 }
});
test('every pair can fit both heads and feet within the safe frame inside the club',()=>{
 for(const heightBoost of [0,.9])for(const aspect of [356/778,9/16,16/9])for(let slot=0;slot<MAX_DANCERS;slot+=2){
  const a=floorSpot(slot),b=floorSpot(slot+1),positions=[new T.Vector3(a.x,0,a.z),new T.Vector3(b.x,0,b.z)];
  let possible=false;
  for(const angle of [.15,.8,-.8,1.35,-1.35,2.3,-2.3,Math.PI]){
   const plan=frameDuet(...positions,angle,aspect,aspect<.8?60:54,heightBoost);
   if(constrainCamera(plan.pos.clone()).distanceTo(plan.pos)>.001)continue;
   const camera=new T.PerspectiveCamera(plan.fov,aspect,.1,90);camera.position.copy(plan.pos);camera.lookAt(plan.target);camera.updateMatrixWorld(true);
   for(const origin of positions)for(const x of [-.46,.46])for(const y of [.015,2.02])for(const z of [-.32,.32]){
    const p=origin.clone().add(new T.Vector3(x,y,z)).project(camera);assert.ok(Math.abs(p.x)<=.881&&p.y>=-.501&&p.y<=.701);
   }possible=true;
  }assert.ok(possible,'no indoor camera for pair '+slot+' at '+aspect);
 }
});
test('darbuka alternates striking hands and saz stays on the fingerboard',()=>{
 let leftHits=0,rightHits=0;
 for(let t=0;t<10;t+=.005){const l=drumStroke(t,'L'),r=drumStroke(t,'R'),s=sazGesture(t);
  assert.ok(l.lift>=0&&r.lift>=0&&l.lift<=.085&&r.lift<=.085);
  if(l.contact>.98)leftHits++;if(r.contact>.98)rightHits++;
  assert.ok(!(l.contact>.9&&r.contact>.9));assert.ok(s.fret>=.47&&s.fret<=.66&&Math.abs(s.pluck)<=.038);
 }assert.ok(leftHits>rightHits&&rightHits>0);
});

test('saz alternates three stroke phrases and darbuka contacts have no jump',()=>{
 const kinds=new Set();for(let t=0;t<27;t+=.08)kinds.add(sazGesture(t).kind);assert.equal(kinds.size,3);
 for(const side of ['L','R'])for(let beat=0;beat<16;beat+=.25){const t=beat*60/112,a=drumStroke(t-1e-6,side),b=drumStroke(t+1e-6,side);assert.ok(Math.abs(a.lift-b.lift)<.0001);}
});
