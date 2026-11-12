import * as T from 'three';
import {constrainCamera} from './spatial.js';
import {VIP_LOUNGES,vipPoint} from './club-layout.js';

const choices=new WeakMap();
const camera=new T.PerspectiveCamera(48,1,.1,90);
const turn=(x,y,z,yaw)=>new T.Vector3(x*Math.cos(yaw)+z*Math.sin(yaw),y,-x*Math.sin(yaw)+z*Math.cos(yaw));
// These solid stage fixtures mirror environment.js. A camera that clears
// people can still look straight through a VIP portal or a PA cabinet.
const fixture=(center,size)=>new T.Box3().setFromCenterAndSize(new T.Vector3(...center),new T.Vector3(...size));
const fixtures=[
 ...[-6,6].map(x=>fixture([x,1.7,-6.77],[.86,2.25,.84])),
 fixture([0,1.30,-8.1],[3.4,1.3,1.12]),
];
for(const lounge of VIP_LOUNGES){
 const portal=[[-2.24,.08,1.95],[-2.24,2.2,1.95],[-2.18,3.65,1.95],[-1.6,4.15,1.95],[0,4.28,1.95],[1.6,4.15,1.95],[2.18,3.65,1.95],[2.24,2.2,1.95],[2.24,.08,1.95]];
 for(let i=1;i<portal.length;i++){
  const a=new T.Vector3(...vipPoint(lounge,...portal[i-1])),b=new T.Vector3(...vipPoint(lounge,...portal[i]));
  fixtures.push(new T.Box3().setFromPoints([a,b]).expandByScalar(.13));
 }
}
function fixtureCost(plan,points){
 let cost=0;
 for(const box of fixtures){
  const clearance=box.distanceToPoint(plan.pos);
  // Thin columns beside the lens become huge screen-space bars even when
  // their center misses a ray to the face; do not park the lens beside one.
  if(clearance<.9)cost+=(.9-clearance)*30;
  for(const target of points){
   const delta=target.clone().sub(plan.pos),length=delta.length(),ray=new T.Ray(plan.pos,delta.normalize());
   const hit=ray.intersectBox(box,new T.Vector3());
   if(hit&&hit.distanceTo(plan.pos)<length-.05)cost+=12;
  }
 }
 return cost;
}
// Include the seated feet and the full saz neck, not just the face. These
// conservative bounds also cover the moving picking/striking hands.
function subjectPoints(origin,yaw){
 const points=[];
 for(const x of [-.83,.83])for(const y of [.035,1.94])for(const z of [-.34,.76])points.push(origin.clone().add(turn(x,y,z,yaw)));
 return points;
}
function framed(origin,yaw,angle,aspect,fov){
 const target=origin.clone().add(turn(0,.94,.10,yaw)),points=subjectPoints(origin,yaw);
 for(let distance=2.8;distance<=7;distance+=.15){
  const pos=origin.clone().add(turn(Math.sin(angle)*distance,2.05,Math.cos(angle)*distance,yaw));
  if(constrainCamera(pos.clone()).distanceToSquared(pos)>.000001)continue;
  camera.aspect=aspect;camera.fov=fov;camera.updateProjectionMatrix();camera.position.copy(pos);camera.lookAt(target);camera.updateMatrixWorld(true);
  if(points.every(point=>{const p=point.clone().project(camera);return Math.abs(p.x)<.84&&p.y>-.82&&p.y<.78&&p.z>-1&&p.z<1;}))return{pos,target,fov};
 }
 return null;
}
function obstruction(plan,origin,yaw,nearby){
 let cost=0;
 // Rays to instrument edges, hands, torso, face and feet protect what makes
 // this shot useful. A clear face alone is not enough for a musician view.
 const targets=[[-.65,.88,.30],[.72,1.05,.38],[0,.8,.24],[0,1.75,.12],[-.28,.18,.35],[.28,.18,.35]];
 for(const other of nearby){
  const center=other.root.position;
  for(const [x,y,z] of targets){
   const target=origin.clone().add(turn(x,y,z,yaw)),line=target.clone().sub(plan.pos),offset=center.clone().sub(plan.pos);
   const u=(offset.x*line.x+offset.z*line.z)/(line.x*line.x+line.z*line.z);
   if(u<=0||u>=.98)continue;
   const lateral=Math.hypot(offset.x-u*line.x,offset.z-u*line.z),height=plan.pos.y+line.y*u-center.y;
   if(lateral<.74&&height>-.05&&height<2.22)cost+=1+(1-lateral/.74)*4;
  }
 }
 return cost;
}

export function musicianCamera(person,people=[],aspect=1,time=0){
 if(!person?.root||!['saz','drum'].includes(person.role))return null;
 aspect=Number.isFinite(aspect)&&aspect>0?Math.max(.35,Math.min(3,aspect)):1;
 const origin=person.root.position,yaw=person.root.rotation?.y||0,side=origin.x<0?-1:1;
 // Nearby stage performers and VIP guests matter. Far floor rows cannot
 // obstruct a close diagonal from the side of the stage.
 const nearby=people.filter(p=>p!==person&&p.root&&!p.moneyHidden&&!p.giftHidden&&p.root.position.distanceToSquared(origin)<64);
 // root.visible belongs to the previous camera's culling result; never use
 // it to omit a foreground performer while choosing a new camera.
 const key=[aspect,origin.x,origin.y,origin.z,yaw,...nearby.flatMap(p=>[Math.round(p.root.position.x*4),Math.round(p.root.position.y*4),Math.round(p.root.position.z*4)])].join(',');
 let choice=choices.get(person);
 if(choice?.key!==key){
  const fov=aspect<.8?52:48;
  let best=null,bestCost=Infinity;
  // Stay in front and look diagonally across the stage from its inside
  // edge. The outside flank contains the speaker and VIP portal posts.
  for(const angle of [-side*1.04,-side*1.23,-side*.83,side*1.04,side*1.23,side*.83]){
   const plan=framed(origin,yaw,angle,aspect,fov);if(!plan)continue;
   const targets=[...subjectPoints(origin,yaw),origin.clone().add(turn(0,1.75,.12,yaw)),origin.clone().add(turn(0,.8,.25,yaw))];
   const cost=(obstruction(plan,origin,yaw,nearby)+fixtureCost(plan,targets))*100+Math.abs(angle+side*1.04)*.7;
   if(cost<bestCost){bestCost=cost;best={...plan,angle};}
  }
  if(!best)return null;
  choice={key,plan:best};choices.set(person,choice);
 }
 // Keep the musician composition stable; all animation comes from the
 // performer instead of orbiting back through the foreground dancers.
 return{...choice.plan,pos:choice.plan.pos.clone(),target:choice.plan.target.clone(),focus:person,label:'Çapraz · enstrüman'};
}
