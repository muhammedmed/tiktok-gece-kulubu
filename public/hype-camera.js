import * as T from 'three';
import {frameDuet} from './camera-choreography.js';
import {constrainCamera} from './spatial.js';

// Each cut has its own part of the floor. Keep the exchange in a moving duet
// shot, then give the last collective applause a brief overhead view.
const SHOTS=[
 {id:'opening',start:0,end:2,wide:true,label:'tüm pist'},
 {id:'left-duet',start:2,end:5,anchor:[.08,.30],angle:-1.15,label:'sol pist · tam boy çift'},
 {id:'exchange',start:5,end:8,anchor:[.50,.48],angle:.65,label:'eş değişimi takibi'},
 {id:'right-duet',start:8,end:11,anchor:[.92,.62],angle:1.15,label:'sağ pist · tam boy çift'},
 {id:'rear-duet',start:11,end:14,anchor:[.35,.95],angle:.1,label:'arka pist · tam boy çift'},
 {id:'overhead',start:14,end:16,wide:true,reverse:true,label:'yukarıdan · tüm pist'},
 {id:'finale',start:16,end:18,anchor:[.66,.05],angle:2.65,label:'final · ön pist'},
];
// Choices belong to a caller's live cast, rather than to a global shot clock.
// Expensive angle scoring runs at cuts/partner changes; tracking fits one pair.
const tours=new WeakMap();
const eligible=p=>p.role==='dance'&&!p.walking&&!p.moneyGuest&&!p.moneyHidden&&!p.solo;
const partnerOf=p=>p.hypePartner||p.dancePartner;
const angleDistance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

function pairsOnFloor(floor){
 const available=new Set(floor),used=new Set(),pairs=[];
 for(const first of floor){
  const second=partnerOf(first);
  // Temporary partners can share the same slot parity. Identity is the only
  // reliable way to avoid filming a pair twice during the exchange.
  if(!second||second===first||!available.has(second)||used.has(first)||used.has(second))continue;
  used.add(first);used.add(second);pairs.push([first,second]);
 }
 return pairs;
}

function boundsOf(floor){
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(const p of floor){const v=p.root.position;minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minZ=Math.min(minZ,v.z);maxZ=Math.max(maxZ,v.z);}
 return {minX,maxX,minZ,maxZ};
}

function selectPair(pairs,shot,bounds){
 const chosen=new Set();let selected;
 // Reserve distinct pairs for preceding stops even when a show is first
 // sampled halfway through. This also makes sparse floors deterministic.
 for(const stop of SHOTS){
  if(!stop.anchor)continue;
  const x=bounds.minX+(bounds.maxX-bounds.minX)*stop.anchor[0],z=bounds.minZ+(bounds.maxZ-bounds.minZ)*stop.anchor[1];
  const width=Math.max(3,bounds.maxX-bounds.minX),depth=Math.max(3,bounds.maxZ-bounds.minZ);
  if(chosen.size===pairs.length)chosen.clear();
  let best=Infinity;
  for(const pair of pairs){
   if(chosen.has(pair))continue;
   const a=pair[0].root.position,b=pair[1].root.position;
   const moving=pair.some(p=>p.hypeMoving||p.hypeTravel);
   const distance=((a.x+b.x)*.5-x)**2/width**2+((a.z+b.z)*.5-z)**2/depth**2-(stop.id==='exchange'&&moving?3:0);
   if(distance<best){best=distance;selected=pair;}
  }
  chosen.add(selected);if(stop===shot)return selected;
 }
 return selected;
}

function fitsPair(plan,pair,aspect){
 const camera=new T.PerspectiveCamera(plan.fov,aspect,.1,90);
 camera.position.copy(plan.pos);camera.lookAt(plan.target);camera.updateMatrixWorld(true);
 for(const person of pair)for(const x of [-.46,.46])for(const y of [.015,2.02])for(const z of [-.32,.32]){
  const projected=person.root.position.clone().add(new T.Vector3(x,y,z)).project(camera);
  if(Math.abs(projected.x)>.881||projected.y<-.501||projected.y>.701)return false;
 }
 return true;
}

function obstructionScore(plan,pair,people){
 let score=0;
 for(const other of people){
  // root.visible may reflect the previous camera's frustum; those guests
  // still obstruct a new cut and must be included in its angle selection.
  if(pair.includes(other)||other.moneyHidden||!other.root)continue;
  const origin=other.root.position;
  // Trace to feet, torso and face. A raised lens can see over a distant row,
  // but a person immediately in front still hides the featured footwork.
  for(const subject of pair){
   const end=subject.root.position,vx=end.x-plan.pos.x,vz=end.z-plan.pos.z,length=vx*vx+vz*vz;
   const ox=origin.x-plan.pos.x,oz=origin.z-plan.pos.z,u=(ox*vx+oz*vz)/length;
   if(u<=0||u>=.97)continue;
   const lateral=Math.hypot(ox-u*vx,oz-u*vz);
   if(lateral>=.58)continue;
   for(const [height,weight] of [[.15,2],[1.1,1.3],[1.95,.7]]){
    const y=plan.pos.y+(end.y+height-plan.pos.y)*u;
    if(y>origin.y+.03&&y<origin.y+2.06)score+=(1-lateral/.58)*weight;
   }
  }
 }
 return score;
}

function chooseAngle(pair,shot,people,aspect){
 const fov=aspect<.8?64:57,boost=shot.id==='exchange'?1.2:.95;
 let best=null,score=Infinity;
 const angles=[shot.angle,-shot.angle,0,Math.PI,-1.5,1.5,2.35,-2.35];
 for(const angle of [...new Set(angles)]){
  const plan=frameDuet(pair[0].root.position,pair[1].root.position,angle,aspect,fov,boost);
  if(constrainCamera(plan.pos.clone()).distanceTo(plan.pos)>.001||!fitsPair(plan,pair,aspect))continue;
  const cost=obstructionScore(plan,pair,people)*4+angleDistance(angle,shot.angle)*.6;
  if(cost<score){score=cost;best={angle,fov,boost};}
 }
 return best;
}

function wideShot(shot,age,aspect,bounds){
 const {minX,maxX,minZ,maxZ}=bounds,width=maxX-minX;
 const target=new T.Vector3((minX+maxX)*.5,1.05,(minZ+maxZ)*.5);
 const reverse=shot.reverse?-1:1,travel=(age-shot.start)/(shot.end-shot.start);
 const pos=constrainCamera(new T.Vector3(target.x+reverse*(1.8+Math.sin(travel*Math.PI)*1.6),shot.reverse?6.2:5.8,
  (shot.reverse?minZ:maxZ)+reverse*Math.max(8,width*.64)));
 return {pos,target,fov:aspect<.8?84:68,people:[],wide:true,shotId:shot.id,cut:true,label:shot.wide?shot.label:'tüm pist'};
}

export function hypeCamera(people,age,aspect){
 aspect=Number.isFinite(aspect)&&aspect>0?aspect:1;
 const floor=people.filter(eligible).sort((a,b)=>(a.danceSlot??0)-(b.danceSlot??0));
 if(!floor.length)return null;
 age=Math.max(0,Number.isFinite(age)?age:0);
 const shot=SHOTS.find(s=>age<s.end)||SHOTS.at(-1),bounds=boundsOf(floor);
 let tour=tours.get(people);
 const lineupChanged=!tour||floor.length!==tour.floor.length||floor.some((p,i)=>p!==tour.floor[i]);
 if(lineupChanged||age<tour.age||tour.aspect!==aspect){tour={floor,aspect,shot:null,age};tours.set(people,tour);}
 tour.age=age;
 if(shot.wide)return wideShot(shot,age,aspect,bounds);
 const pairs=pairsOnFloor(floor);
 if(!pairs.length)return wideShot(shot,age,aspect,bounds);
 let currentPair=tour.pair&&pairs.find(pair=>pair.includes(tour.pair[0]));
 if(tour.shot!==shot||!currentPair){
  tour.shot=shot;tour.pair=selectPair(pairs,shot,bounds);tour.choice=null;
  currentPair=tour.pair;
 }
 const partner=currentPair.find(p=>p!==tour.pair[0]);
 if(partner!==tour.pair[1]){tour.pair=[tour.pair[0],partner];tour.choice=null;}
 if(!tour.choice)tour.choice=chooseAngle(tour.pair,shot,people,aspect);
 if(!tour.choice)return wideShot(shot,age,aspect,bounds);
 const {angle,fov,boost}=tour.choice;
 const progress=Math.max(0,Math.min(1,(age-shot.start)/(shot.end-shot.start)));
 const orbit=Math.sin((progress-.5)*Math.PI)*.10;
 let framed=frameDuet(tour.pair[0].root.position,tour.pair[1].root.position,angle+orbit,aspect,fov,boost);
 // Small orbits must not push a fitted camera through the room boundary.
 if(constrainCamera(framed.pos.clone()).distanceTo(framed.pos)>.001||!fitsPair(framed,tour.pair,aspect)){
  framed=frameDuet(tour.pair[0].root.position,tour.pair[1].root.position,angle,aspect,fov,boost);
  if(constrainCamera(framed.pos.clone()).distanceTo(framed.pos)>.001||!fitsPair(framed,tour.pair,aspect)){
   tour.choice=null;return wideShot(shot,age,aspect,bounds);
  }
 }
 return {...framed,people:[...tour.pair],wide:false,shotId:shot.id,cut:true,label:shot.label};
}
