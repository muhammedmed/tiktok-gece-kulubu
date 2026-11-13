import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {rig} from './helpers/rig.js';
import {guestModels} from '../public/wardrobe.js';
import {hasEveningOutfit} from '../public/evening-outfit.js';

test('evening clothing is scoped to adult female participants, keeping staff/NPC and dancer costumes separate',()=>{
 const base={gender:'female',modelName:'female-party-01',costumed:false,npc:false};
 assert.equal(hasEveningOutfit(base),true);
 for(const change of [{gender:'male'},{costumed:true},{npc:true},{modelName:'business-female-03'}])assert.equal(hasEveningOutfit({...base,...change}),false);
});

test('long hair clears the actual skinned torso during dance, head turns and seated poses',async()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({style:{},getContext:()=>({fillRect(){}}),querySelector:()=>({textContent:''}),remove(){}})};
 try{
  const {Person}=await import('../public/actors.js');let contacts=0;
  for(const modelName of guestModels.female){
   const p=new Person({models:{[modelName]:await rig(modelName)},animations:{female:{}}},{name:'Hair clearance',modelName,gender:'female'},new T.Scene(),{append(){}});
   const hair=p.model.getObjectByName('eveningHair'),rest=hair.geometry.attributes.position,bodies=[];p.model.traverse(m=>{if(m.geometry?.attributes.eveningRest)bodies.push(m);});
   for(const [role,time,yaw,nod]of [['dance',3,.5,.25],['dance',17,-.5,-.2],['dance',36,.3,-.3],['vip',4,-.4,.2],['saz',8,.4,.2]]){
    p.setRole(role);p.update(.7,time);p.bone('Head').rotateY(yaw);p.bone('Head').rotateZ(nod);p.root.updateWorldMatrix(true,true);
    p.model.traverse(m=>{if(m.isSkinnedMesh){m.skeleton.update();m.computeBoundingSphere();}});
    for(let i=0;i<rest.count;i+=28){if(rest.getY(i)>1.46||rest.getY(i)<1.1)continue;
     const front=rest.getZ(i)>0,point=hair.getVertexPosition(i,new T.Vector3()).applyMatrix4(hair.matrixWorld),outward=new T.Vector3(0,0,front?1:-1).applyQuaternion(p.root.quaternion);
     const ray=new T.Raycaster(point.clone().addScaledVector(outward,2),outward.negate(),0,3);
     const hit=ray.intersectObjects(bodies,false).find(h=>[h.face.a,h.face.b,h.face.c].every(j=>h.object.geometry.attributes.eveningArm.getX(j)<.25));
     if(hit){contacts++;assert.ok(hit.distance>=2.005,`${modelName} ${role} hair intersects torso at vertex ${i}: ${hit.distance-2}`);}
    }
   }p.dispose();
  }
  assert.ok(contacts>300,'must check real torso contacts, not only empty space');
 }finally{globalThis.document=old;}
});

test('every female evening outfit stays bound through dance turns, sitting and role changes',async()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({style:{},getContext:()=>({fillRect(){}}),querySelector:()=>({textContent:''}),remove(){}})};
 try{
  const {Person}=await import('../public/actors.js');
  for(const [variant,modelName]of guestModels.female.entries()){
   const model=await rig(modelName),assets={models:{[modelName]:model},animations:{female:{},male:{}}};
   const p=new Person(assets,{name:'Look',gender:'female',variant,modelName,role:'dance',x:1,z:2,yaw:.7},new T.Scene(),{append(){}});
   const dress=p.model.getObjectByName('eveningDress'),hair=p.model.getObjectByName('eveningHair');assert.ok(dress?.isSkinnedMesh);assert.ok(hair?.isSkinnedMesh);
   assert.ok(dress.geometry.index.count/3<6500,'dress, legs and jewellery triangle budget');assert.ok(hair.geometry.index.count/3<5500,'hair triangle budget');
   p.model.traverse(mesh=>{const a=mesh.geometry?.attributes;if(!a?.eveningRest)return;
    for(let i=0;i<a.position.count;i++){
     let handWeight=0;for(let j=0;j<4;j++)if(/Hand|Finger/.test(mesh.skeleton.bones[a.skinIndex.getComponent(i,j)]?.name||''))handWeight+=a.skinWeight.getComponent(i,j);
     if(handWeight>.8){assert.ok(a.eveningArm.getX(i)>.8,'skirt mask would cut a finger');assert.ok(a.eveningHand.getX(i)>.8,'fabric mask would recolor a hand');}
    }
   });
   for(const [a,b]of dress.geometry.userData.legSeams){const normals=dress.geometry.attributes.normal;assert.ok(new T.Vector3().fromBufferAttribute(normals,a).distanceTo(new T.Vector3().fromBufferAttribute(normals,b))<1e-6,'leg UV seam must shade smoothly');}
   for(const mesh of [dress,hair]){
    const w=mesh.geometry.attributes.skinWeight;for(let i=0;i<w.count;i++)assert.ok(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-6);
    mesh.skeleton.update();
    for(let i=0;i<mesh.geometry.attributes.position.count;i+=13){const actual=p.root.worldToLocal(mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld)),expected=new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);assert.ok(actual.distanceTo(expected)<1e-4,modelName+' bind pose moved');}
   }
   const startGeometry=dress.geometry;
   for(const role of ['dance','vip','waiter','dance']){
    p.setRole(role);assert.equal(p.model.getObjectByName('eveningDress'),dress);assert.equal(dress.geometry,startGeometry);
    for(let t=0;t<50;t+=.73){p.update(.04,t);p.root.updateWorldMatrix(true,true);
     for(const mesh of [dress,hair]){mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i+=19){const v=mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld);assert.ok(v.toArray().every(Number.isFinite));assert.ok(v.distanceTo(p.root.position)<2.1,modelName+' detached garment');}}
    }
   }
   const other=new Person(assets,{name:'Same look',gender:'female',variant,modelName,role:'dance'},new T.Scene(),{append(){}});
   const d2=other.model.getObjectByName('eveningDress');assert.equal(d2.geometry,dress.geometry);assert.equal(d2.material,dress.material);assert.notEqual(d2.skeleton,dress.skeleton);
   // A seated background guest shares the base rig, but has no evening shoes.
   // Its cached sole samples must never point at the participant-only dress.
   const npc=new Person(assets,{name:'Audience',gender:'female',variant,modelName,role:'table',npc:true},new T.Scene(),{append(){}});
   for(const sole of Object.values(npc.soles))for(const sample of sole.samples)assert.ok(sample.mesh,'NPC inherited a missing evening mesh');
   npc.update(.04,3);npc.dispose();
   p.dispose();assert.ok(d2.geometry.attributes.position);other.update(.04,2);other.dispose();
  }
 }finally{globalThis.document=old;}
});
