import * as T from 'three';
import {MONEY_SECONDS,MONEY_ENTRY,moneyGesture,moneyEnvelope} from './money-motion.js';
import {floorHeight} from './spatial.js';
function hideForShow(show,person){
 if(person.moneyHidden)return;
 show.hidden.add(person);person.moneyHidden=true;person.root.visible=false;person.tag.hidden=true;
}
export class MoneyShow{
 constructor({getPeople,spawn,remove,effect}){Object.assign(this,{getPeople,spawn,remove,effect});this.active=null;}
 start(event,time){
  this.stop();const people=this.getPeople(),source=people.find(p=>p.viewerId===event.id);
  const receiver=people.filter(p=>p.role==='dancer'&&!p.walking&&p!==source).sort((a,b)=>Math.abs(a.stageSlot-2)-Math.abs(b.stageSlot-2))[0];if(!receiver)return false;
  const end=receiver.root.position.clone().add(new T.Vector3(1.05,0,.65)),start=end.clone().add(new T.Vector3(.3,0,1.5));end.y=floorHeight(end.x,end.z);start.y=floorHeight(start.x,start.z);
  const yaw=Math.atan2(receiver.root.position.x-end.x,receiver.root.position.z-end.z);
  const proxy=this.spawn({name:event.name,gender:source?.gender||event.gender||'male',variant:source?.variant??0,modelName:source?.modelName,role:'dance',x:start.x,y:start.y,z:start.z,yaw});proxy.moneyGuest=true;
  const avatar=source?.avatar||event.avatar;if(avatar){const img=document.createElement('img');img.src=avatar;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>img.remove();proxy.tag.querySelector('em').replaceChildren(img);}
  proxy.walkTo([end.toArray()],'dance',yaw,MONEY_ENTRY);
  this.active={source,proxy,receiver,hidden:new Set(),startedAt:time,lastEmission:-1,yaw,receiverYaw:receiver.root.rotation.y,receiverFacing:receiver.danceFacing,end:end.clone(),exiting:false};if(source)hideForShow(this.active,source);this.update(time);return true;
 }
 update(time){const s=this.active;if(!s)return;const age=time-s.startedAt;if(age>=MONEY_SECONDS){this.stop();return;}
  const people=this.getPeople();if(!people.includes(s.receiver)){this.stop();return;}
  // A later gift can create a new stage owner during this duet. Keep that
  // authoritative actor intact but reveal it only after this show finishes.
  for(const p of people)if(p!==s.proxy&&p!==s.receiver&&Math.hypot(p.root.position.x-s.receiver.root.position.x,p.root.position.z-s.receiver.root.position.z)<.8)hideForShow(s,p);
  if(age>=MONEY_ENTRY){s.proxy.moneyInteraction={startedAt:s.startedAt+MONEY_ENTRY,receiver:false};s.proxy.danceFacing=s.yaw;
   s.receiver.moneyInteraction={startedAt:s.startedAt+MONEY_ENTRY,receiver:true};const from=s.receiverFacing??0,target=Math.atan2(s.proxy.root.position.x-s.receiver.root.position.x,s.proxy.root.position.z-s.receiver.root.position.z);s.receiver.danceFacing=from+Math.atan2(Math.sin(target-from),Math.cos(target-from))*moneyEnvelope(age-MONEY_ENTRY);
   if(age>5.35&&!s.exiting){s.exiting=true;s.proxy.moneyInteraction=null;const exit=s.end.clone().add(new T.Vector3(.25,0,.42));exit.y=floorHeight(exit.x,exit.z);s.proxy.walkTo([exit.toArray()],'dance',s.yaw,.65);}
  }
 }
 emit(time){const s=this.active;if(!s)return;const age=time-s.startedAt-MONEY_ENTRY,g=moneyGesture(age);this.effect.holdHands?.(s.proxy,g,!s.proxy.walking&&g.active);
  if(s.proxy.walking||!g.active||g.releaseIndex<0||g.releaseIndex===s.lastEmission)return;s.lastEmission=g.releaseIndex;
  const side=g.releaseIndex%2?'R':'L',hand=s.proxy.bone(side+' Finger1')||s.proxy.bone(side+' Hand');if(hand)this.effect.toss(hand.getWorldPosition(new T.Vector3()),s.receiver.root.position.clone().add(new T.Vector3(0,1.35,0)));
 }
 stop(){const s=this.active;if(!s)return;this.active=null;const present=new Set(this.getPeople());
  for(const p of s.hidden)if(present.has(p)){p.moneyHidden=false;p.lastPoseTime=-1;}
  if(present.has(s.receiver)){s.receiver.moneyInteraction=null;s.receiver.root.rotation.y=s.receiverYaw;s.receiver.danceFacing=s.receiverFacing;s.receiver.lastPoseTime=-1;}
  if(present.has(s.proxy))this.remove(s.proxy);this.effect.clear();
 }
}
