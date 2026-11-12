import * as T from 'three';
const tip=bone=>bone.localToWorld(new T.Vector3(Math.max(.012,bone.position.length()*.72),0,0));
export function makeInstrumentGrips(bone){
 const result={};
 for(const side of ['L','R']){
  const hand=bone(side+' Hand'),entries=[];for(let f=0;f<5;f++)for(const j of ['', '1','2']){const b=bone(side+' Finger'+f+j);if(b)entries.push({bone:b,rest:b.quaternion.clone()});}
  const curl=(f,angles)=>['','1','2'].forEach((j,i)=>bone(side+' Finger'+f+j)?.rotateZ(angles[i]));
  for(let f=1;f<5;f++)curl(f,side==='R'?(f===1?[.72,.85,.25]:[.85,1,.45]):[.45,.55,.18]);
  if(side==='R'){
   const thumb=[bone('R Finger0'),bone('R Finger01'),bone('R Finger02')],index=bone('R Finger12');
   for(let pass=0;pass<16;pass++)for(const joint of [...thumb].reverse()){
    hand.updateWorldMatrix(true,true);const origin=joint.getWorldPosition(new T.Vector3()),delta=new T.Quaternion().setFromUnitVectors(tip(thumb[2]).sub(origin).normalize(),tip(index).sub(origin).normalize());
    const angle=delta.angleTo(new T.Quaternion());if(angle>.16)delta.slerpQuaternions(new T.Quaternion(),delta.clone(),.16/angle);
    const desired=joint.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(joint.getWorldQuaternion(new T.Quaternion()).premultiply(delta));
    const rest=entries.find(e=>e.bone===joint).rest,limit=joint===thumb[0]?1.2:.9,d=rest.angleTo(desired);joint.quaternion.copy(d>limit?rest.clone().slerp(desired,limit/d):desired);
   }
  }else{curl(0,[.2,.25,.15]);}
  hand.updateWorldMatrix(true,true);
  const anchor=side==='R'?hand.worldToLocal(tip(bone('R Finger12')).lerp(tip(bone('R Finger02')),.5)):new T.Vector3(.105,.018,0);
  result[side]={entries:entries.map(e=>({...e,pose:e.bone.quaternion.clone()})),anchor};
  for(const e of entries)e.bone.quaternion.copy(e.rest);
 }
 return result;
}
export function applyInstrumentGrip(grip){for(const e of grip.entries)e.bone.quaternion.copy(e.pose);}
// Forearm pronation absorbs axial twist instead of twisting the wrist mesh through 180 degrees.
export function orientInstrumentHand(hand,desired){
 const forearm=hand.parent,axis=hand.getWorldPosition(new T.Vector3()).sub(forearm.getWorldPosition(new T.Vector3())).normalize();
 const current=hand.getWorldQuaternion(new T.Quaternion()),delta=desired.clone().multiply(current.clone().invert());
 const projected=axis.clone().multiplyScalar(new T.Vector3(delta.x,delta.y,delta.z).dot(axis));
 const twist=new T.Quaternion(projected.x,projected.y,projected.z,delta.w).normalize();
 const fw=forearm.getWorldQuaternion(new T.Quaternion()).premultiply(twist);
 forearm.quaternion.copy(forearm.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(fw));forearm.updateWorldMatrix(false,true);
 hand.quaternion.copy(forearm.getWorldQuaternion(new T.Quaternion()).invert().multiply(desired));hand.updateWorldMatrix(false,true);
}
