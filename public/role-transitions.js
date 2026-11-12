import {nearestLounge,vipPoint} from './club-layout.js';
export const ENTRY_SECONDS=1.8;
export const ROLE_CELEBRATIONS={dance:'Piste çıktı!',dancer:'Dansöz oldu!',vip:'VIP’ye geçti!',saz:'Sazcı oldu!',drum:'Darbukacı oldu!',dj:'DJ oldu!',waiter:'Garson oldu!'};
export const DIRECT_ROLES=new Set(['dancer','saz','drum','dj','waiter']);
// Cut to a short approach outside the destination zone instead of speeding a
// thirty-metre walk into an unreadable two-second dash across the entire club.
export function entranceApproach(destination,role){
 const [x,y,z]=destination,side=x<0?-1:1;
 if(role==='vip'){const lounge=nearestLounge({x,z});return {start:vipPoint(lounge,0,0,2.5),path:[vipPoint(lounge,0,0,1),[x+Math.sin(lounge.yaw)*.6,y,z+Math.cos(lounge.yaw)*.6],destination]};}
 return {start:[side*5.5,y,z+.65],path:[[x,y,z+.65],destination]};
}
// Consume all remaining segment distance, including overshoot at corners.
export function advancePath(position,path,distance){
 let direction=null;
 while(path.length&&distance>0){const diff=path[0].clone().sub(position),length=diff.length();
  if(length<1e-8){path.shift();continue;}direction=diff.clone().multiplyScalar(1/length);
  if(distance>=length){position.copy(path.shift());distance-=length;}else{position.addScaledVector(direction,distance);distance=0;}
 }
 return direction;
}
