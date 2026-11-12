import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {rig} from './helpers/rig.js';
import {DANCER_FIGURES,DANCER_PHRASE_BEATS} from '../public/dancer-motion.js';
import {DANCE_BPM} from '../public/dance-motion.js';
test('both stage rigs keep elbows bent, forearms outside torso and wrists neutral through every figure',async()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({style:{},getContext:()=>({fillRect(){}}),querySelector:()=>({textContent:''}),remove(){}})};
 try{const {Person}=await import('../public/actors.js');for(const name of ['female-adult-03','female-party-01']){
  const model=await rig(name),p=new Person({models:{[name]:model},animations:{female:{},male:{}}},{name,gender:'female',modelName:name,role:'dancer',x:0,y:.64,z:-4.2},new T.Scene(),{append(){}});p.danceBlend=1;const previous=new Map();
  const cycleSeconds=DANCER_FIGURES.length*DANCER_PHRASE_BEATS*60/DANCE_BPM;
  for(let t=0;t<cycleSeconds;t+=1/60){p.update(1/60,t);
   for(const side of ['L','R']){const upper=p.bone(side+' UpperArm'),elbow=p.bone(side+' Forearm'),hand=p.bone(side+' Hand'),A=upper.getWorldPosition(new T.Vector3()),B=elbow.getWorldPosition(new T.Vector3()),C=hand.getWorldPosition(new T.Vector3());
    const bend=Math.PI-A.clone().sub(B).angleTo(C.clone().sub(B));assert.ok(bend>.70&&bend<2.15,`${name} ${t}: elbow ${bend}`);
    const rest=p.restBones.find(r=>r.bone===hand);assert.ok(rest.quaternion.angleTo(hand.quaternion)<.15,`${name} ${t} ${side}: wrist over-bent (${rest.quaternion.angleTo(hand.quaternion)} radians)`);
    for(const fraction of [0,.25,.5,.75,1]){const v=p.root.worldToLocal(B.clone().lerp(C,fraction));if(v.y>1.0&&v.y<1.5){const clearance=(v.x-p.model.position.x)**2/.19**2+(v.z-p.model.position.z)**2/.14**2;assert.ok(clearance>1,`${name} ${t}: forearm entered torso`);}}
    for(const bone of [upper,elbow,hand]){const prev=previous.get(bone);if(prev)assert.ok(prev.angleTo(bone.quaternion)<.25,`${name} ${t}: arm flipped`);previous.set(bone,bone.quaternion.clone());}
   }
  }p.dispose();
 }}finally{globalThis.document=old;}
});
