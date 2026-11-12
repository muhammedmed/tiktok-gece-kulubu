// Keep hand rotation near the forearm's neutral pose. Aim targets alone can flip
// a wrist when a raised snapping hand moves down to the waist.
export function limitWrist(neutral,desired,limit){
 const angle=neutral.angleTo(desired);
 return angle>limit?neutral.clone().slerp(desired,limit/angle):desired.clone();
}
