import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Static opaque furniture becomes a few material batches instead of hundreds of draw calls.
export function batchRoom(room,exclude=[]){
 const excluded=new Set(exclude),groups=new Map();room.updateWorldMatrix(true,true);const inverse=room.matrixWorld.clone().invert();
 room.traverse(o=>{if(!o.isMesh||excluded.has(o)||Array.isArray(o.material)||(o.material.transparent&&!o.material.forceSinglePass)||!o.visible)return;
  const p=o.getWorldPosition(new T.Vector3()),cell=o.material.transparent?':'+Math.floor(p.x/4)+':'+Math.floor(p.z/4):'';const key=o.material.uuid+o.castShadow+o.receiveShadow+cell;
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);
 });
 let removed=0;
 for(const items of groups.values()){
  if(items.length<2)continue;
  const geometries=items.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(inverse.clone().multiply(o.matrixWorld));return g;});
  const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!merged)continue;
  const mesh=new T.Mesh(merged,items[0].material);mesh.castShadow=items[0].castShadow;mesh.receiveShadow=items[0].receiveShadow;mesh.name='Static room batch';room.add(mesh);
  items.forEach(o=>{o.removeFromParent();o.geometry.dispose();});removed+=items.length-1;
 }return removed;
}
