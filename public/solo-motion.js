import {dancePose,DANCE_BPM} from './dance-motion.js';
import {FLOOR} from './club-layout.js';
export const SOLO_SECONDS=12;
export const SOLO_CAMERA_SECONDS=12;
export const SOLO_VARIANTS=['Kaşık oyunu'];
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function soloEnvelope(t){return smooth(t/1.2)*smooth((SOLO_SECONDS-t)/1.2);}
const mix=(a,b,w)=>a+(b-a)*w;
const window=(t,start,end,edge=.65)=>smooth((t-start)/edge)*(1-smooth((t-end)/edge));
const rotate=(p,yaw)=>[p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw),p[1],-p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw)];

// Both the finger grip and the two wooden bowls use this same musical pulse.
// A click closes gradually, holds briefly, then opens; no alternating frame flips.
export function spoonGesture(t,side='left'){
 const weight=soloEnvelope(t),beat=Math.max(0,t)*DANCE_BPM/60+(['R','right'].includes(side)?.5:0),phase=beat%1;
 const click=smooth((phase-.12)/.18)*(1-smooth((phase-.46)/.24))*weight;
 return {click,grip:.78+.09*click,beat,weight};
}

const STEP_SIDES=['right','left','right','right','left','right','left','left'];
const STEP_TARGETS=[[-.24,0,.06],[.19,0,.02],[-.17,0,.19],[-.17,0,0],[.24,0,.06],[-.19,0,.02],[.17,0,.19],[.17,0,0]];
// A small travelling turn belongs to the foot plants, not to a root spinning
// over stationary shoes. The supporting foot stays in world space each beat.
function heading(beat){return .72*window(beat,10,16,2);}
function spoonSteps(beat){
 const index=Math.floor(beat),u=beat-index,world={left:[.17,0,0],right:[-.17,0,0]};
 for(let i=0;i<index;i++)world[STEP_SIDES[i%8]]=rotate(STEP_TARGETS[i%8],heading(i+1));
 const moving=STEP_SIDES[index%8],support=moving==='left'?'right':'left',from=world[moving],target=rotate(STEP_TARGETS[index%8],heading(index+1)),lift=Math.sin(Math.PI*u)**2;
 world[moving]=from.map((v,i)=>mix(v,target[i],smooth(u)));world[moving][1]=.055*lift;
 const turn=heading(beat),feet={left:rotate(world.left,-turn),right:rotate(world.right,-turn)};
 return {feet,turn,moving,support,lift,index};
}

// One complete kaşık performance: open steps, heel taps and a modest knee dip,
// a stepped diagonal turn with alternating high hands, then a raised-arm finish.
// Legacy variant arguments are deliberately ignored: every solo keeps its spoons.
export function soloPose(t,variant=0){
 const time=Math.max(0,Math.min(SOLO_SECONDS,Number(t)||0)),p=dancePose(time,0,-1),weight=soloEnvelope(time),beat=time*DANCE_BPM/60,a=beat*Math.PI*2;
 const steps=spoonSteps(beat),kneeSection=window(time,2.6,5.2),turnSection=window(time,5.5,8.5),finish=window(time,9,11.1,.5);
 const dip=kneeSection*(.5-.5*Math.cos(beat*Math.PI*.5)),pulse=.5-.5*Math.cos(a),support=steps.feet[steps.support];
 const body={x:mix((steps.feet.left[0]+steps.feet.right[0])/2,support[0]*.44,steps.lift),
  y:-.045-.025*pulse-.12*dip,z:(steps.feet.left[2]+steps.feet.right[2])*.35,
  lean:-.025*Math.sin(a*.5),twist:.075*Math.sin(a*.5),pitch:.025+.045*dip};
 p.phrase='Kaşık oyunu';p.stepName=time<3?'Yan basış ve kaşık vuruşu':time<6?'Topuk dokunuşu ve diz kırma':time<9?'Adımlı çapraz dönüş':'Kollar açık kaşık finali';
 for(const key of ['x','y','z','lean','twist','pitch'])p.body[key]=mix(p.body[key]||0,body[key],weight);
 p.turn=steps.turn*weight;p.clap=0;p.beltWeight={left:0,right:0};p.snapWeight={left:0,right:0};p.spoonGrip={};p.spoonClick={};p.elbows={};p.handDirections={};
 for(const [key,sign,offset]of [['left',1,0],['right',-1,Math.PI]]){
  const wave=Math.sin(a*.5+offset),high=turnSection*(.5+.5*Math.sin(a*.25+offset));
  const hand=[sign*(.45+.035*Math.sin(a*.25)+.025*finish),1.36+.07*wave+.19*high+.17*finish-.13*dip,.28+.035*Math.cos(a*.5+offset)];
  p.hands[key]=p.hands[key].map((v,i)=>mix(v,hand[i],weight));
  p.elbows[key]=[sign*.54,1.10+.10*high+.08*finish,.10];
  p.handDirections[key]=[sign*.025,.11,.08];
  const gesture=spoonGesture(time,key);p.spoonGrip[key]=gesture.grip;p.spoonClick[key]=gesture.click;
  p.feet[key]=p.feet[key].map((v,i)=>mix(v,steps.feet[key][i],weight));
 }
 p.heel=p.heel.map((v,i)=>mix(v,steps.moving===(i===0?'left':'right')?steps.lift*(.13+.035*kneeSection):0,weight));
 p.shoulder=mix(p.shoulder,.025*Math.sin(a)+.015*Math.sin(a*.5),weight);
 p.shoulderSwing=.035*Math.sin(a*.5)*weight;p.wrist=.085*Math.sin(a-.15)*weight;
 p.headYaw=-p.body.twist*.5-.12*Math.sin(a*.25)*turnSection*weight;p.headNod=.013*Math.sin(a*.5)-.035*dip*weight;
 return p;
}
export function soloCenter(position){let x=position.x,z=position.z;const dx=x-FLOOR.x,dz=z-FLOOR.z,r=Math.hypot(dx,dz),limit=FLOOR.r-4;if(r>limit){x=FLOOR.x+dx/r*limit;z=FLOOR.z+dz/r*limit;}return{x,z};}
// Open a temporary circle while keeping every reserved slot unchanged on the server.
export function soloClearance(positions,center){
 const points=positions.map(p=>({...p}));
 for(let pass=0;pass<70;pass++){
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){const a=points[i],b=points[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d<1.45){const angle=(i+1)*2.399,ux=d>1e-6?dx/d:Math.cos(angle),uz=d>1e-6?dz/d:Math.sin(angle),shift=(1.45-d)/2;a.x-=ux*shift;a.z-=uz*shift;b.x+=ux*shift;b.z+=uz*shift;}}
  for(let i=0;i<points.length;i++){const p=points[i],dx=p.x-center.x,dz=p.z-center.z,d=Math.hypot(dx,dz);if(d<2.65){const angle=i*2.399,ux=d>1e-6?dx/d:Math.cos(angle),uz=d>1e-6?dz/d:Math.sin(angle);p.x=center.x+ux*2.65;p.z=center.z+uz*2.65;}const r=Math.hypot(p.x-FLOOR.x,p.z-FLOOR.z),limit=FLOOR.r-.5;if(r>limit){p.x=FLOOR.x+(p.x-FLOOR.x)*limit/r;p.z=FLOOR.z+(p.z-FLOOR.z)*limit/r;}}
 }
 return points;
}
