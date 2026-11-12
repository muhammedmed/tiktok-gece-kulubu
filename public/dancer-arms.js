import * as T from 'three';
// Root-local, measured reach limits preserve a bent elbow even when the pelvis
// shifts. A lateral elbow pole stays away from the chest at every hand height.
export function dancerArmTarget(root,upper,forearm,hand,requested,side){
 const sign=side==='L'?1:-1,A=root.worldToLocal(upper.getWorldPosition(new T.Vector3())),B=root.worldToLocal(forearm.getWorldPosition(new T.Vector3())),C=root.worldToLocal(hand.getWorldPosition(new T.Vector3()));
 const length=A.distanceTo(B)+B.distanceTo(C),target=new T.Vector3(...requested);
 target.x=sign*Math.max(.24,sign*target.x);target.z=Math.max(.12,target.z);
 const direction=target.clone().sub(A),distance=direction.length();direction.normalize();target.copy(A).addScaledVector(direction,T.MathUtils.clamp(distance,length*.43,length*.93));
 const raised=T.MathUtils.smoothstep(target.y,A.y-.15,A.y+.30);
 const pole=A.clone().add(new T.Vector3(sign*.40,-.30+raised*.40,.14));
 return{target:root.localToWorld(target),pole:root.localToWorld(pole)};
}
