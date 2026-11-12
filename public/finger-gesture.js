import * as T from 'three';
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function snapCycle(beat){
 const p=((beat%1)+1)%1;
 return {pinch:smooth(p/.2)*(1-smooth((p-.49)/.12)),release:smooth((p-.49)/.12)*(1-smooth((p-.68)/.28))};
}
const tip=bone=>bone.localToWorld(new T.Vector3(Math.max(.012,bone.position.length()*.72),0,0));
// Build reusable local hand poses on the actual rig, keeping thumb-middle contact.
export function makeSnapPoses(bone){
 const poses={};
 for(const side of ['L','R']){
  const names=[];for(let f=0;f<5;f++)for(const joint of ['', '1','2'])names.push(side+' Finger'+f+joint);
  const entries=names.map(name=>({name,bone:bone(name)})).filter(x=>x.bone);
  const rest=new Map(entries.map(e=>[e.name,e.bone.quaternion.clone()]));
  const capture=()=>new Map(entries.map(e=>[e.name,e.bone.quaternion.clone()]));
  const reset=()=>{for(const e of entries)e.bone.quaternion.copy(rest.get(e.name));};
  const curl=(finger,a,b,c)=>{for(const [joint,angle]of [['',a],['1',b],['2',c]])bone(side+' Finger'+finger+joint)?.rotateZ(angle);};
  const relaxed=()=>{reset();curl(1,.12,.14,.1);curl(3,.46,.65,.32);curl(4,.55,.72,.35);};
  relaxed();curl(2,.28,.38,.16);const ready=capture();
  relaxed();curl(2,.88,1.0,.34);
  const thumb=[bone(side+' Finger0'),bone(side+' Finger01'),bone(side+' Finger02')],middle=bone(side+' Finger22');
  if(thumb.every(Boolean)&&middle){
   const hand=bone(side+' Hand');hand.updateWorldMatrix(true,true);
   for(let pass=0;pass<16;pass++)for(const joint of [...thumb].reverse()){
    hand.updateWorldMatrix(true,true);
    const origin=joint.getWorldPosition(new T.Vector3()),a=tip(thumb[2]).sub(origin).normalize(),b=tip(middle).sub(origin).normalize();
    const delta=new T.Quaternion().setFromUnitVectors(a,b),angle=2*Math.acos(Math.min(1,Math.abs(delta.w)));
    if(angle>.17)delta.slerpQuaternions(new T.Quaternion(),delta.clone(),.17/angle);
    const world=joint.getWorldQuaternion(new T.Quaternion()).premultiply(delta);
    const local=joint.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world);
    const reference=rest.get(entries.find(e=>e.bone===joint).name),limit=joint===thumb[0]?1.15:.85,d=reference.angleTo(local);
    if(d>limit)local.copy(reference.clone().slerp(local,limit/d));
    joint.quaternion.copy(local);
   }
  }
  const contact=capture();
  relaxed();curl(2,1.05,1.12,.64);bone(side+' Finger0')?.rotateZ(-.12);const released=capture();
  reset();poses[side]={entries,rest,ready,contact,released};
 }
 return poses;
}
export function applySnapPose(pose,beat,weight){
 if(!pose)return;const {pinch,release}=snapCycle(beat);
 for(const e of pose.entries){
  const target=pose.ready.get(e.name).clone().slerp(pose.contact.get(e.name),pinch).slerp(pose.released.get(e.name),release);
  e.bone.quaternion.slerp(target,Math.max(0,Math.min(1,weight)));
 }
}
