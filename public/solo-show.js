import * as T from 'three';
import {FLOOR} from './club-layout.js';
import {soloEnvelope} from './solo-motion.js';
import {planSoloAudience,addAudienceTargets} from './solo-gathering.js';
const eligible=p=>p.role==='dance'&&!p.walking&&!p.solo&&!p.giftHidden&&!p.moneyHidden&&!p.moneyInteraction&&!p.moneyGuest&&!p.giftActor;
const remember=p=>({position:p.root.position.clone(),revision:p.serverRevision,slot:p.danceSlot,facing:p.danceFacing,yaw:p.root.rotation.y});
const current=(p,r)=>eligible(p)&&p.serverRevision===r.revision&&p.danceSlot===r.slot;
function gatheringPoint(from,target,center,u){
 if(u<=0)return from;if(u>=1)return target;
 const fromR=Math.hypot(from.x-center.x,from.z-center.z),toR=Math.hypot(target.x-center.x,target.z-center.z),toA=Math.atan2(target.x-center.x,target.z-center.z),fromA=fromR<.05?toA:Math.atan2(from.x-center.x,from.z-center.z);
 // Walk around the solo space, not straight through the performer. Guests
 // initially inside it first step outward before joining their ring position.
 const turn=T.MathUtils.smoothstep(u,fromR<2.8?.2:0,1),a=fromA+Math.atan2(Math.sin(toA-fromA),Math.cos(toA-fromA))*turn;
 const radius=T.MathUtils.lerp(fromR,toR,fromR<2.8?T.MathUtils.smoothstep(u,0,.6):u),p={x:center.x+Math.sin(a)*radius,z:center.z+Math.cos(a)*radius};
 const r=Math.hypot(p.x-FLOOR.x,p.z-FLOOR.z),limit=FLOOR.r-.5;if(r>limit){p.x=FLOOR.x+(p.x-FLOOR.x)*limit/r;p.z=FLOOR.z+(p.z-FLOOR.z)*limit/r;}return p;
}
export class SoloShow{
 constructor(scene,getPeople){this.getPeople=getPeople;this.active=null;
  this.light=new T.SpotLight('#ffe0a2',0,16,.48,.65,1.5);this.light.position.set(0,6,0);scene.add(this.light,this.light.target);
  this.ring=new T.Mesh(new T.RingGeometry(2.25,2.29,80),new T.MeshBasicMaterial({color:'#f3cf7c',transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}));this.ring.rotation.x=-Math.PI/2;this.ring.visible=false;scene.add(this.ring);
 }
 start(person,time,variant){
  this.stop();const original={position:person.root.position.clone(),yaw:person.root.rotation.y,role:person.role,slot:person.danceSlot};
  const neighbors=new Map();for(const p of this.getPeople())if(p!==person&&eligible(p))neighbors.set(p,remember(p));
  const {center,targets}=planSoloAudience([...neighbors.values()].map(r=>r.position));
  person.placeAt([center.x,0,center.z],'dance',0);person.solo={variant,startedAt:time};person.danceFacing=0;
  this.active={person,startedAt:time,lastTime:time,center,original,neighbors,unplaced:new Set()};this.ring.visible=true;
  this.arrange(this.active,time,targets);
 }
 arrange(s,time,targets,entries=s.neighbors){
  let i=0;for(const [p,r]of entries){const index=i++;r.target=targets[index];if(!r.target){s.neighbors.delete(p);s.unplaced.add(p);p.soloAudience=null;continue;}r.from=p.root.position.clone();r.moveAt=time+(index%4)*.045;r.duration=Math.max(1,Math.min(3.1,Math.hypot(r.target.x-r.from.x,r.target.z-r.from.z)/2.7+.45));r.arrivedAt=null;r.phase=(index%5)*.045;p.lastPoseTime=-1;}
 }
 update(time){const s=this.active;if(!s)return;const age=time-s.startedAt,w=soloEnvelope(age),existing=new Set(this.getPeople());
  if(!existing.has(s.person)){this.stop();return;}
  const dt=Math.max(0,time-s.lastTime);s.lastTime=time;const arrivals=new Map();
  for(const [p,r]of s.neighbors)if(!existing.has(p)||!current(p,r)){if(existing.has(p))p.soloAudience=null;s.neighbors.delete(p);s.unplaced.clear();}
  for(const p of existing)if(p!==s.person&&eligible(p)&&!s.neighbors.has(p)&&!s.unplaced.has(p)){const r=remember(p);s.neighbors.set(p,r);arrivals.set(p,r);}
  // A late arrival gets a free place without restarting everyone else's walk
  // or applause. Existing circles stay put during a busy stream of joins.
  if(arrivals.size)this.arrange(s,time,addAudienceTargets([...arrivals.values()].map(r=>r.position),s.center,[...s.neighbors.values()].map(r=>r.target).filter(Boolean)),arrivals);
  for(const [p,r]of s.neighbors){
   const u=T.MathUtils.smoothstep(time,r.moveAt,r.moveAt+r.duration),oldX=p.root.position.x,oldZ=p.root.position.z;
   const position=gatheringPoint(r.from,r.target,s.center,u);p.root.position.x=position.x;p.root.position.z=position.z;
   const dx=p.root.position.x-oldX,dz=p.root.position.z-oldZ,speed=Math.hypot(dx,dz)/Math.max(.0001,dt),moving=u<1;
   if(!moving&&r.arrivedAt===null)r.arrivedAt=time;
   p.soloAudience={startedAt:s.startedAt,phase:r.phase,weight:moving?0:T.MathUtils.smoothstep(time,r.arrivedAt,r.arrivedAt+.35),center:s.center,moving,speed,direction:Math.hypot(dx,dz)>.00001?{x:dx,z:dz}:{x:r.target.x-r.from.x,z:r.target.z-r.from.z},travel:0};
  }
  s.person.root.position.set(s.center.x,0,s.center.z);
  this.light.position.set(s.person.root.position.x,6.2,s.person.root.position.z+1);this.light.target.position.copy(s.person.root.position).y=1;this.light.intensity=28*w;
  this.ring.position.set(s.center.x,.069,s.center.z);this.ring.material.opacity=.65*w;
 }
 stop(){const s=this.active;if(!s)return;const existing=new Set(this.getPeople());for(const [p,r]of s.neighbors)if(existing.has(p)){p.soloAudience=null;if(current(p,r)){p.root.position.copy(r.position);p.danceFacing=r.facing;p.root.rotation.y=r.yaw;p.danceBlend=0;p.lastPoseTime=-1;}}
  if(existing.has(s.person)){s.person.solo=null;s.person.soloAccessory=null;s.person.placeAt(s.original.position.toArray(),s.original.role,s.original.yaw);s.person.danceSlot=s.original.slot;}
  this.active=null;this.light.intensity=0;this.ring.visible=false;
 }

}
