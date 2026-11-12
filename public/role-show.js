import {ENTRY_SECONDS,entranceApproach,DIRECT_ROLES} from './role-transitions.js';

// A single temporary actor lets queued gifts show their original role even if
// this viewer (or the next musician) has already bought another role on the server.
export class RoleShow {
 constructor({getPeople,spawn,remove,destinationFor,decorate}){Object.assign(this,{getPeople,spawn,remove,destinationFor,decorate});this.active=null;}
 start(data,{entrance=true,hideDestination=true}={}){
  this.stop();const dest=this.destinationFor(data),p=this.spawn({name:data.name,gender:data.gender,variant:data.variant,role:data.role,
   x:dest.position[0],y:dest.position[1],z:dest.position[2],yaw:dest.yaw,danceSlot:data.role==='dance'?data.slot:null});
  p.giftActor=true;p.stageSlot=data.role==='dancer'?data.slot:null;this.decorate?.(p,data);
  this.active={person:p,data,dest,hideDestination,hidden:new Set()};this.update();
  if(entrance&&!DIRECT_ROLES.has(data.role)){const approach=entranceApproach(dest.position,data.role);p.root.position.set(...approach.start);p.walkTo(approach.path,data.role,dest.yaw,ENTRY_SECONDS);}
  return p;
 }
 update(){
  const s=this.active;if(!s)return;
  for(const p of this.getPeople()){
   if(p===s.person||p.giftActor)continue;
   const atDestination=s.hideDestination&&Math.hypot(p.root.position.x-s.dest.position[0],p.root.position.z-s.dest.position[2])<.8;
   if(p.viewerId===s.data.id||atDestination){s.hidden.add(p);p.giftHidden=true;p.root.visible=false;p.tag.hidden=true;}
  }
 }
 stop(){const s=this.active;if(!s)return;this.active=null;
  const present=new Set(this.getPeople());
  for(const p of s.hidden)if(present.has(p)){p.giftHidden=false;p.lastPoseTime=-1;}
  if(present.has(s.person))this.remove(s.person);
 }
}
