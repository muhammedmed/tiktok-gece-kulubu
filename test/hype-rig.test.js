import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {rig} from './helpers/rig.js';
import {floorSpot} from '../public/dance-motion.js';
import {HYPE_SECONDS} from '../public/hype-motion.js';
import {floorHeight} from '../public/spatial.js';

test('ordinary male and female rigs keep stable arms and grounded shoes while dancing and travelling through Coştur',async t=>{
 const oldDocument=globalThis.document;
 globalThis.document={createElement:()=>({style:{},getContext:()=>({fillRect(){}}),querySelector:()=>({textContent:''}),remove(){}})};
 try{
  const {Person}=await import('../public/actors.js');
  const names=['male-adult-08','female-party-02','male-adult-04','female-adult-03'];
  for(const travelling of [false,true])for(const [index,name]of names.entries()){
   const model=await rig(name),gender=name.startsWith('female')?'female':'male',slot=index<2?index:index+2,spot=floorSpot(slot);
   const person=new Person({models:{[name]:model},animations:{female:{},male:{}}},
    {name,gender,modelName:name,role:'dance',danceSlot:slot,variant:index*2,x:spot.x,z:spot.z,yaw:spot.yaw},new T.Scene(),{append(){}});
   person.danceBlend=1;person.hypeStartedAt=0;
   const previous=new Map(),origin=person.root.position.clone(),expectedRoot=origin.clone(),phrases=new Set(),vector=new T.Vector3();
   const arms=new Set(['L','R'].flatMap(side=>['UpperArm','Forearm','Hand'].map(part=>person.bone(side+' '+part))));
   const wrists=new Set(['L','R'].map(side=>person.bone(side+' Hand')));
   let maxFrameRotation=0,maxWrist=0;
   try{
    assert.equal(person.costumed,false);
    assert.equal(Object.keys(person.soles).length,2);
    for(const support of Object.values(person.soles))assert.ok(support.samples.length>0);
    // Include the frames immediately before entry and after the 18-second exit.
    for(let frame=-1;frame<=HYPE_SECONDS*60+1;frame++){
     const time=frame/60;
     if(travelling){
      const progress=Math.max(0,Math.min(1,time/HYPE_SECONDS));
      person.hypeTravel={weight:Math.sin(progress*Math.PI)**2};
      expectedRoot.copy(origin);expectedRoot.x+=.6*(progress-Math.sin(progress*Math.PI*2)/(Math.PI*2));
      person.root.position.copy(expectedRoot);
     }
     person.update(1/60,time);phrases.add(person.dancePhrase);
     person.root.updateWorldMatrix(true,true);
     for(const {bone,quaternion:rest}of person.restBones){
      assert.ok([...bone.position.toArray(),...bone.quaternion.toArray(),...bone.matrixWorld.elements].every(Number.isFinite),`${name} ${time}: non-finite ${bone.name}`);
      if(!arms.has(bone))continue;
      const prior=previous.get(bone);
      if(prior){const rotation=prior.angleTo(bone.quaternion);maxFrameRotation=Math.max(maxFrameRotation,rotation);assert.ok(rotation<.25,`${name} ${time}: ${bone.name} frame rotation ${rotation}`);}
      previous.set(bone,bone.quaternion.clone());
      if(wrists.has(bone)){const wrist=rest.angleTo(bone.quaternion);maxWrist=Math.max(maxWrist,wrist);assert.ok(wrist<.9,`${name} ${time}: wrist exceeds its bounded range`);}
     }
     for(const side of ['L','R']){
      const shoulder=person.bone(side+' UpperArm').getWorldPosition(new T.Vector3()),elbow=person.bone(side+' Forearm').getWorldPosition(new T.Vector3()),hand=person.bone(side+' Hand').getWorldPosition(new T.Vector3());
      const bend=Math.PI-shoulder.sub(elbow).angleTo(hand.sub(elbow));
      assert.ok(bend>.15&&bend<2.95,`${name} ${time}: elbow bend ${bend}`);
     }
     person.model.traverse(mesh=>{if(mesh.isSkinnedMesh)mesh.skeleton.update();});
     let lowestGap=Infinity;
     for(const support of Object.values(person.soles))for(const {mesh,index:vertex}of support.samples){
      const world=mesh.getVertexPosition(vertex,vector).applyMatrix4(mesh.matrixWorld);
      const gap=world.y-floorHeight(world.x,world.z);lowestGap=Math.min(lowestGap,gap);
      assert.ok(gap>=-.003,`${name} ${time}: shoe penetrates floor by ${-gap}`);
     }
     assert.ok(lowestGap<.025,`${name} ${time}: both shoes floated ${lowestGap} above the floor`);
     assert.ok(person.root.position.distanceTo(expectedRoot)<1e-12,`${name}: pose changed the caller's formation position`);
    }
    assert.equal(previous.size,6,`${name}: both complete arm chains must be inspected`);
    for(const phrase of ['Eller havaya','Omuz silk','Diz kır','Bir el belde','Karşılıklı adım','Hep birlikte'])assert.ok([...phrases].some(value=>value.startsWith(phrase)),`${name}: ${phrase} was not integrated`);
    t.diagnostic(`${name}${travelling?' travelling':''}: maximum arm change ${maxFrameRotation.toFixed(3)} rad/frame; wrist bend ${maxWrist.toFixed(3)} rad`);
   }finally{person.dispose();}
  }
 }finally{globalThis.document=oldDocument;}
});
