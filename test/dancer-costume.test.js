import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {rig} from './helpers/rig.js';import {floorHeight} from '../public/spatial.js';
test('split costume keeps its mesh proportions, skinned legs and grounded hem through a complete dance',async()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({style:{},getContext:()=>({fillRect(){}}),querySelector:()=>({textContent:''}),remove(){}})};
 try{const {Person}=await import('../public/actors.js');for(const name of ['female-adult-03','female-party-01']){
  const model=await rig(name),p=new Person({models:{[name]:model},animations:{female:{},male:{}}},{name,gender:'female',modelName:name,role:'dancer',x:0,y:.64,z:-4.2},new T.Scene(),{append(){}});
  p.root.updateWorldMatrix(true,true);p.model.traverse(m=>{if(!m.isSkinnedMesh)return;m.skeleton.update();const rest=m.geometry.attributes.costumeRestPosition;for(let i=0;i<rest.count;i++){const actual=p.root.worldToLocal(m.getVertexPosition(i,new T.Vector3()).applyMatrix4(m.matrixWorld)),expected=new T.Vector3().fromBufferAttribute(rest,i);assert.ok(actual.distanceTo(expected)<.0001,`${name}: waist vertex left its bind pose`);}});
  for(const side of ['L','R']){const leg=p.prop.getObjectByName('costumeLeg'+side);assert.ok(leg?.isSkinnedMesh);const weights=leg.geometry.attributes.skinWeight;for(let i=0;i<weights.count;i++)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)-1)<1e-6);}
  for(let t=0;t<36;t+=.23){p.update(.04,t);p.root.updateWorldMatrix(true,true);const skirt=p.prop.getObjectByName('costumeSkirt'),positions=skirt.geometry.attributes.position;
   for(let i=0;i<positions.count;i++){const point=new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(skirt.matrixWorld);assert.ok(point.toArray().every(Number.isFinite));assert.ok(point.y>=floorHeight(point.x,point.z)+.0249,'hem entered the floor');assert.ok(point.distanceTo(p.root.position)<2.2,'cloth exploded');}
   for(const side of ['L','R']){const leg=p.prop.getObjectByName('costumeLeg'+side);leg.skeleton.update();for(let i=0;i<leg.geometry.attributes.position.count;i+=9){const point=leg.getVertexPosition(i,new T.Vector3()).applyMatrix4(leg.matrixWorld);assert.ok(point.toArray().every(Number.isFinite));assert.ok(point.distanceTo(p.root.position)<1.5,'leg detached from rig');}}
  }p.dispose();
 }}finally{globalThis.document=old;}
});
