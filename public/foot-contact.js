import * as T from 'three';
import {ConvexHull} from 'three/addons/math/ConvexHull.js';
import {floorHeight} from './spatial.js';
const v=()=>new T.Vector3();
// Only hull vertices can attain the lowest point under any rigid foot rotation.
// Keep original mesh samples for regression checks; runtime uses the exact support hull.
export function supportHull(points){if(points.length<5)return points;const hull=new ConvexHull().setFromPoints(points),vertices=new Set();for(const face of hull.faces){let e=face.edge;do{vertices.add(e.head().point);e=e.next;}while(e!==face.edge);}return vertices.size>=4?[...vertices]:points;}
export function soleProfile(soles){return Object.fromEntries(Object.entries(soles).map(([side,s])=>[side,{points:s.points,samples:s.samples.map(({mesh,index})=>({name:mesh.name,index}))}]));}
export function bindSoles(profile,model,feet){return Object.fromEntries(Object.entries(profile).map(([side,s])=>[side,{points:s.points,samples:s.samples.map(({name,index})=>({mesh:model.getObjectByName(name),index})),foot:feet[side]}]));}

// Calibrate the shoe, not the skeleton's ankle: heels and boots need different clearance.
export function measureSoles(model,root,feet){
 root.updateWorldMatrix(true,true);model.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});
 const result={};for(const [side,foot]of Object.entries(feet))if(foot){
  const ankle=foot.getWorldPosition(v()),inv=new T.Matrix4().copy(foot.matrixWorld).invert(),scale=foot.getWorldScale(v()),points=[],samples=[];
  const rootY=root.getWorldPosition(v()).y;
  model.traverse(m=>{if(!m.isSkinnedMesh)return;const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){
   const world=m.getVertexPosition(i,v()).applyMatrix4(m.matrixWorld);
   if(world.y-rootY>.24||world.distanceTo(ankle)>.36)continue;
   // Assign the shoe to the closest ankle, keeping the other shoe out of the sample.
   if(Object.entries(feet).some(([s,f])=>s!==side&&f&&world.distanceTo(f.getWorldPosition(v()))<world.distanceTo(ankle)))continue;
   points.push(world.applyMatrix4(inv).multiply(scale));samples.push({mesh:m,index:i});
  }});
  result[side]={samples,points:points.length?supportHull(points):[new T.Vector3(0,-.11,0)],foot};
 }
 return result;
}
export function soleOffset(support,rotation){let min=Infinity;const point=new T.Vector3();for(const p of support.points)min=Math.min(min,point.copy(p).applyQuaternion(rotation).y);return -min;}
export function groundedAnkle(support,rotation,target,lift=0){target.y=floorHeight(target.x,target.z)+soleOffset(support,rotation)+.004+Math.max(0,lift);return target;}
export function penetration(support){const foot=support.foot,rotation=foot.getWorldQuaternion(new T.Quaternion()),origin=foot.getWorldPosition(v());let depth=0;const world=new T.Vector3();for(const p of support.points){world.copy(p).applyQuaternion(rotation).add(origin);depth=Math.max(depth,floorHeight(world.x,world.z)+.002-world.y);}return depth;}
