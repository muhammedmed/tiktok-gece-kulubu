import * as T from 'three';
import {dancePose} from './dance-motion.js';
// Most of each 32-second passage is a full-body duet. Reserve the feet before turns/taps.
export function duetCloseUp(time,pair,shotAge=null,shotIndex=0){
 for(const offset of [0,.8,1.6]){
  const name=dancePose(time+offset,pair,-1).phrase;
  if(/dönüş|Topuk|topuk/.test(name))return null;
 }
 if(shotAge!==null)return shotIndex%3===1&&shotAge>=1.4&&shotAge<3.4?Math.floor(shotIndex/3)%2:null;
 const phase=((time%32)+32)%32;
 return phase>=10&&phase<13?0:phase>=25&&phase<28?1:null;
}
// Fit both complete bodies, including hands/feet, inside the broadcast-safe middle area.
export function frameDuet(first,second,angle,aspect,fov=58,heightBoost=0){
 const center=first.clone().lerp(second,.5),target=center.clone().add(new T.Vector3(0,1.08,0));
 const camera=new T.PerspectiveCamera(fov,aspect,.1,90);
 for(let d=3.8;d<=14;d+=.12){
  camera.position.set(center.x+Math.sin(angle)*d,Math.min(heightBoost?4.25:4.15,1.08+d*.20+heightBoost),center.z+Math.cos(angle)*d);
  camera.lookAt(target);camera.updateMatrixWorld(true);
  let fits=true;
  for(const person of [first,second])for(const x of [-.46,.46])for(const y of [.015,2.02])for(const z of [-.32,.32]){
   const p=person.clone().add(new T.Vector3(x,y,z)).project(camera);
   if(Math.abs(p.x)>.88||p.y<-.50||p.y>.70)fits=false;
  }
  if(fits)return{pos:camera.position.clone(),target,fov};
 }
 return{pos:camera.position.clone(),target,fov};
}
