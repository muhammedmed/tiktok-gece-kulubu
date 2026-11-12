import {FLOOR} from './club-layout.js';

const TAU=Math.PI*2,INNER_RADIUS=3.05,RING_STEP=1.65,BODY_GAP=1.5,EDGE=.5;
const angleOf=(p,c)=>Math.atan2(p.x-c.x,p.z-c.z);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const distanceSq=(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2;
const ringCapacity=r=>Math.floor(TAU/(2*Math.asin(BODY_GAP/(2*r))));
function outerRadius(count){let radius=INNER_RADIUS;while(count>ringCapacity(radius)){count-=ringCapacity(radius);radius+=RING_STEP;}return radius;}

// If new viewers arrive after the center has been chosen, later rings may
// need to use only the inward-facing arc. No target can leave the dancefloor.
function safeArc(center,radius){
 const dx=FLOOR.x-center.x,dz=FLOOR.z-center.z,d=Math.hypot(dx,dz),limit=FLOOR.r-EDGE;
 if(d+radius<=limit)return {full:true,angle:0,half:Math.PI,capacity:ringCapacity(radius)};
 if(d<1e-8||radius>=d+limit)return {full:false,angle:0,half:0,capacity:0};
 const half=Math.acos(Math.max(-1,Math.min(1,(d*d+radius*radius-limit*limit)/(2*d*radius))))-.00001;
 const step=2*Math.asin(BODY_GAP/(2*radius));
 return {full:false,angle:Math.atan2(dx,dz),half,capacity:half>0?Math.floor(2*half/step)+1:0};
}
function point(center,radius,angle,y){return {x:center.x+Math.sin(angle)*radius,y:y??0,z:center.z+Math.cos(angle)*radius};}

function assignFullRing(entries,center,radius,targets){
 const count=entries.length,ordered=[...entries].sort((a,b)=>angleOf(a.position,center)-angleOf(b.position,center));
 if(count===1){targets[ordered[0].index]=point(center,radius,angleOf(ordered[0].position,center),ordered[0].position.y);return;}
 // Preserve clockwise order; choose the rotation that asks the group to
 // travel least instead of assigning arbitrary opposite-side destinations.
 let best=Infinity,bestRotation=0;
 for(let sample=0;sample<count*12;sample++){
  const rotation=-Math.PI+sample*TAU/(count*12);let cost=0;
  for(let i=0;i<count;i++)cost+=distanceSq(ordered[i].position,point(center,radius,rotation+i*TAU/count));
  if(cost<best){best=cost;bestRotation=rotation;}
 }
 ordered.forEach((entry,i)=>{targets[entry.index]=point(center,radius,bestRotation+i*TAU/count,entry.position.y);});
}
function assignArc(entries,center,radius,arc,targets){
 const ordered=[...entries].sort((a,b)=>wrap(angleOf(a.position,center)-arc.angle)-wrap(angleOf(b.position,center)-arc.angle));
 if(ordered.length===1){const entry=ordered[0],offset=Math.max(-arc.half,Math.min(arc.half,wrap(angleOf(entry.position,center)-arc.angle)));targets[entry.index]=point(center,radius,arc.angle+offset,entry.position.y);return;}
 ordered.forEach((entry,i)=>{targets[entry.index]=point(center,radius,arc.angle-arc.half+i*2*arc.half/(ordered.length-1),entry.position.y);});
}

export function audienceGatherTargets(positions,center){
 const targets=new Array(positions.length),remaining=positions.map((position,index)=>({position,index})).sort((a,b)=>distanceSq(a.position,center)-distanceSq(b.position,center));
 for(let radius=INNER_RADIUS;remaining.length&&radius<2*FLOOR.r;radius+=RING_STEP){
  const arc=safeArc(center,radius),count=Math.min(arc.capacity,remaining.length);if(!count)continue;
  const entries=remaining.splice(0,count);
  if(arc.full)assignFullRing(entries,center,radius,targets);else assignArc(entries,center,radius,arc,targets);
 }
 // Capacity is deliberately bounded by the club's 66-person floor. This
 // guard catches a future capacity change rather than returning sparse data.
 if(remaining.length)throw new RangeError('Solo audience exceeds the available floor area.');
 return targets;
}

function freeRingTarget(position,center,radius,occupied){
 const arc=safeArc(center,radius);if(!arc.capacity)return null;
 const gap=BODY_GAP+.0001,angles=[angleOf(position,center)];
 if(!arc.full)angles.push(arc.angle-arc.half,arc.angle+arc.half);
 // The nearest free point is either the viewer's radial direction, an arc
 // endpoint, or just outside another viewer's exclusion interval.
 for(const p of occupied){
  const d=Math.hypot(p.x-center.x,p.z-center.z);
  if(d<1e-8||Math.abs(d-radius)>=gap)continue;
  const delta=Math.acos(Math.max(-1,Math.min(1,(radius*radius+d*d-gap*gap)/(2*radius*d)))),angle=angleOf(p,center);
  angles.push(angle-delta-.0001,angle+delta+.0001);
 }
 let best=null,cost=Infinity;
 for(let angle of angles){
  if(!arc.full)angle=arc.angle+Math.max(-arc.half,Math.min(arc.half,wrap(angle-arc.angle)));
  const candidate=point(center,radius,angle,position.y);
  if(occupied.some(p=>distanceSq(p,candidate)<BODY_GAP*BODY_GAP-.0000001))continue;
  const nextCost=distanceSq(position,candidate);if(nextCost<cost){best=candidate;cost=nextCost;}
 }
 return best;
}

function floorReserve(position,center,occupied){
 // Legal crowds fit the rings. This dense fallback also handles irregular
 // occupied coordinates without moving or restarting an existing spectator.
 let best=null,bestDistance=Infinity;
 for(let z=FLOOR.z-FLOOR.r+EDGE;z<=FLOOR.z+FLOOR.r-EDGE;z+=.2)for(let x=FLOOR.x-FLOOR.r+EDGE;x<=FLOOR.x+FLOOR.r-EDGE;x+=.2){
  const p={x,y:position.y??0,z};
  if(distanceSq(p,FLOOR)>(FLOOR.r-EDGE)**2||distanceSq(p,center)<INNER_RADIUS**2||occupied.some(o=>distanceSq(o,p)<BODY_GAP**2))continue;
  const score=distanceSq(p,center)*4+distanceSq(p,position);if(score<bestDistance){best=p;bestDistance=score;}
 }
 return best;
}

export function addAudienceTargets(positions,center,occupiedTargets){
 const occupied=occupiedTargets.map(p=>({...p})),targets=[];
 for(const position of positions){
  let target=null;
  for(let radius=INNER_RADIUS;!target&&radius<2*FLOOR.r;radius+=RING_STEP)target=freeRingTarget(position,center,radius,occupied);
  target??=floorReserve(position,center,occupied);
  // Null means a genuinely over-capacity/invalid caller: the caller can keep
  // that viewer in their normal slot. Never corrupt all targets or throw in
  // the rendering loop when another event arrives.
  targets.push(target);if(target)occupied.push(target);
 }
 return targets;
}

export function planSoloAudience(positions,preferredCenter={x:FLOOR.x,z:FLOOR.z}){
 const center=positions.length?positions.reduce((sum,p)=>({x:sum.x+p.x/positions.length,z:sum.z+p.z/positions.length}),{x:0,z:0}):{...preferredCenter};
 const dx=center.x-FLOOR.x,dz=center.z-FLOOR.z,d=Math.hypot(dx,dz),limit=Math.max(0,FLOOR.r-EDGE-outerRadius(positions.length));
 if(d>limit){center.x=FLOOR.x+dx*limit/d;center.z=FLOOR.z+dz*limit/d;}
 return {center,targets:audienceGatherTargets(positions,center)};
}
