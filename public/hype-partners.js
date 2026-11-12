import {FLOOR,ROOM} from './club-layout.js';
import {HYPE_SECONDS} from './hype-motion.js';

export const HYPE_PARTNER_CLEARANCE=1.15;
const ROUTE_CLEARANCE=HYPE_PARTNER_CLEARANCE+.05,SAMPLES=96;
const OUT_START=3.2,OUT_END=6.2,RETURN_START=12.5,RETURN_END=16;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>x*x*(3-2*x);
const point=p=>({x:p.x,y:p.y,z:p.z});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const eligible=p=>p?.role==='dance'&&!p.walking&&!p.solo&&!p.moneyGuest&&!p.moneyHidden&&!p.moneyInteraction&&p.root?.position;
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const samePosition=(a,b)=>Math.abs(a.x-b.x)<1e-5&&Math.abs(a.y-b.y)<1e-5&&Math.abs(a.z-b.z)<1e-5;
const inside=p=>distance(p,FLOOR)<=FLOOR.r-.2&&distance(p,ROOM)<=ROOM.r-.8;

function route(from,to,bend){
 const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);
 return {from,to,dx,dz,nx:-dz/length,nz:dx/length,bend};
}
function at(r,u){
 const curve=r.bend*Math.sin(Math.PI*u);
 return {x:r.from.x+r.dx*u+r.nx*curve,y:r.from.y,z:r.from.z+r.dz*u+r.nz*curve};
}
function phase(age){
 if(age<=OUT_START||age>=RETURN_END)return {u:0,velocity:0};
 if(age>=OUT_END&&age<=RETURN_START)return {u:1,velocity:0};
 const returning=age>RETURN_START,start=returning?RETURN_START:OUT_START,duration=returning?RETURN_END-RETURN_START:OUT_END-OUT_START;
 const q=clamp((age-start)/duration),u=smooth(q),velocity=6*q*(1-q)/duration;
 return {u:returning?1-u:u,velocity:returning?-velocity:velocity};
}
function travel(r,u,velocity){
 if(Math.abs(velocity)<1e-6)return null;
 const curve=r.bend*Math.PI*Math.cos(Math.PI*u),x=(r.dx+r.nx*curve)*velocity,z=(r.dz+r.nz*curve)*velocity,speed=Math.hypot(x,z);
 return {x:x/speed,z:z/speed,speed,weight:Math.min(1,speed/1.1)};
}
function pairMap(first,second){return new Map([[first,second],[second,first]]);}
function groupFor(a,b,routes=new Map()){
 const members=[...a,...(b||[])],before=new Map([...pairMap(...a),...(b?pairMap(...b):[])]);
 if(!b)return {members,before,during:before,routes};
 const movers=[...routes.keys()],first=movers[0]||a[1],second=movers[1]||b[1];
 const left=a.find(p=>p!==first),right=b.find(p=>p!==second);
 return {members,before,during:new Map([...pairMap(left,second),...pairMap(right,first)]),routes};
}

// Temporary choreography owns only renderer positions. Slot/role/revision remain
// authoritative, and a newer position always wins over this snapshot on release.
export class HypePartners {
 constructor(getPeople){this.getPeople=getPeople;this.active=null;}
 start(time){
  if(!Number.isFinite(time))return false;
  this.update(time);if(this.active)return false;
  const people=this.getPeople(),records=new Map();
  for(const p of people)if(eligible(p)&&finite(p.root.position)){
   const position=point(p.root.position);
   records.set(p,{position,last:point(position),role:p.role,slot:p.danceSlot,revision:p.serverRevision});
  }
  const slots=new Map([...records.keys()].filter(p=>Number.isInteger(p.danceSlot)).map(p=>[p.danceSlot,p]));
  const pairs=[...records.keys()].filter(p=>Number.isInteger(p.danceSlot)&&p.danceSlot%2===0&&slots.has(p.danceSlot^1))
   .sort((a,b)=>a.danceSlot-b.danceSlot).map(p=>[p,slots.get(p.danceSlot^1)]);
  const obstacles=people.filter(p=>!p.moneyHidden&&finite(p.root?.position)).map(p=>({person:p,position:point(p.root.position)}));
  const candidates=[];
  for(let i=0;i<pairs.length;i++)for(let j=i+1;j<pairs.length;j++){
   const center=pair=>({x:(records.get(pair[0]).position.x+records.get(pair[1]).position.x)/2,z:(records.get(pair[0]).position.z+records.get(pair[1]).position.z)/2});
   const a=center(pairs[i]),b=center(pairs[j]),dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
   if(length>.5&&length<5.4)candidates.push({i,j,cost:length+(Math.abs(dx)>Math.abs(dz)?2:0)});
  }
  candidates.sort((a,b)=>a.cost-b.cost||a.i-b.i||a.j-b.j);
  const groups=[],used=new Set(),accepted=new Map();
  for(const {i,j}of candidates){
   if(used.has(i)||used.has(j))continue;
   const a=pairs[i],b=pairs[j];let result;
   for(const [sideA,sideB]of [[1,1],[0,0],[1,0],[0,1]]){
    const first=a[sideA],second=b[sideB],from=records.get(first).position,to=records.get(second).position;
    if(distance(from,to)<1||distance(from,to)>6||Math.abs(from.y-to.y)>.1)continue;
    for(const bend of [.65,-.65,.75,-.75,.9,-.9,1.1,-1.1,1.3,-1.3]){
     const routes=new Map([[first,route(from,to,bend)],[second,route(to,from,bend)]]);
     if(this.safeRoutes(routes,obstacles,accepted)){result=groupFor(a,b,routes);break;}
    }
    if(result)break;
   }
   if(result){groups.push(result);used.add(i);used.add(j);for(const [p,r]of result.routes)accepted.set(p,r);}
  }
  // If an aisle is too tight to exchange places, four guests can still turn
  // toward new partners without introducing any extra occupied floor space.
  for(const {i,j}of candidates){
   if(used.has(i)||used.has(j))continue;
   const a=pairs[i],b=pairs[j],options=[groupFor(a,b),groupFor(a,[...b].reverse())];
   const result=options.find(g=>[...g.during].every(([p,q])=>distance(records.get(p).position,records.get(q).position)<=4.2));
   if(result){groups.push(result);used.add(i);used.add(j);}
  }
  for(let i=0;i<pairs.length;i++)if(!used.has(i))groups.push(groupFor(pairs[i]));
  const paired=new Set(pairs.flat());
  for(const p of records.keys())if(!paired.has(p))groups.push({members:[p],before:new Map(),during:new Map(),routes:new Map()});
  this.active={startedAt:time,records,groups,known:new Set(people)};this.update(time);return true;
 }
 safeRoutes(routes,obstacles,accepted){
  const entries=[...routes];
  for(let i=0;i<=SAMPLES;i++){
   const u=i/SAMPLES,positions=entries.map(([,r])=>at(r,u));
   if(positions.some(p=>!inside(p))||distance(positions[0],positions[1])<ROUTE_CLEARANCE)return false;
   for(const {person,position}of obstacles){
    if(routes.has(person))continue;
    // Check original positions too: a separately cancelled group can return
    // home at any instant without crossing a remaining group's travel lane.
    if(positions.some(p=>distance(p,position)<ROUTE_CLEARANCE))return false;
    const prior=accepted.get(person);
    if(prior){const moving=at(prior,u);if(positions.some(p=>distance(p,moving)<ROUTE_CLEARANCE))return false;}
   }
  }
  return true;
 }
 valid(p,r,existing){return existing.has(p)&&eligible(p)&&p.role===r.role&&p.danceSlot===r.slot&&p.serverRevision===r.revision&&samePosition(p.root.position,r.last);}
 clearGroup(group,existing){
  if(group.cancelled)return;
  for(const p of group.members){
   const r=this.active.records.get(p);
   if(r&&this.valid(p,r,existing))p.root.position.set(r.position.x,r.position.y,r.position.z);
   p.hypePartner=null;p.hypeMoving=false;p.hypeTravel=null;
  }
  group.cancelled=true;
 }
 update(time){
  const state=this.active;if(!state||!Number.isFinite(time))return;
  const age=time-state.startedAt;if(age>=HYPE_SECONDS){this.stop();return;}
  const existing=new Set(this.getPeople()),{u,velocity}=phase(age),exchanging=age>=OUT_START&&age<RETURN_START;
  const arrivals=[...existing].filter(p=>!state.known.has(p));
  for(const p of arrivals)state.known.add(p);
  // Join animations can cross the whole floor. Release exchanges before the
  // walk advances; a directly placed arrival only cancels routes it obstructs.
  const arrivalWalking=arrivals.some(p=>p.walking&&!p.moneyHidden);
  const arrivalPositions=arrivals.filter(p=>!p.moneyHidden&&finite(p.root?.position)).map(p=>p.root.position);
  for(const group of state.groups){
   if(group.cancelled)continue;
   if(group.members.some(p=>!this.valid(p,state.records.get(p),existing))){this.clearGroup(group,existing);continue;}
   if(group.routes.size&&(arrivalWalking||arrivalPositions.some(position=>[...group.routes.values()].some(r=>{
    for(let i=0;i<=SAMPLES;i++)if(distance(at(r,i/SAMPLES),position)<ROUTE_CLEARANCE)return true;
    return false;
   })))){this.clearGroup(group,existing);continue;}
   const partners=exchanging?group.during:group.before;
   for(const p of group.members){
    const r=state.records.get(p),path=group.routes.get(p),position=path?at(path,u):r.position;
    // Exact endpoint copies avoid residual offsets at the end of the figure.
    const next=path&&u===1?{...path.to,y:r.position.y}:u===0?r.position:position;
    if(path){p.root.position.set(next.x,next.y,next.z);r.last=point(next);}
    const partner=partners.get(p)||null;
    if(p.hypePartner!==partner)p.lastPoseTime=-1;
    p.hypePartner=partner;p.hypeTravel=path?travel(path,u,velocity):null;p.hypeMoving=Boolean(p.hypeTravel);
   }
  }
 }
 release(person){
  if(!person||!this.active)return;
  const existing=new Set(this.getPeople());
  for(const group of this.active.groups)if(group.members.includes(person))this.clearGroup(group,existing);
 }
 stop(){
  if(!this.active)return;
  const existing=new Set(this.getPeople());
  for(const group of this.active.groups)this.clearGroup(group,existing);
  this.active=null;
 }
}
