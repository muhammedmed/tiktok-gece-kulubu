// Ankara oyun havasından esinlenen, kayıtlı performans olmayan prosedürel figürler.
// Shared musical clock; grounded toe taps and eased accents avoid speed-dependent jitter.
import {PAIR_CENTERS} from './club-layout.js';
export const DANCE_BPM=112;
const TAU=Math.PI*2;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
export const PHRASES=['Karşılıklı parmak şıklatma','Sağ kol yukarı · sol el belde','Çift el şıklatma','Topuk vur · geri bas','Sen oyna · ben alkışlayayım','Sıra sende · alkışla cevap','Adımlayarak tam dönüş','İki el belde · topuk vur'];
export function floorSpot(slot){
 const centers=PAIR_CENTERS;
 if(slot<0||slot>=centers.length*2)return null;
 const pair=Math.floor(slot/2),side=slot%2?1:-1,axis=pair%2?.33:-.33,[x,z]=centers[pair];
 return {x:x+side*.95*Math.cos(axis),z:z+side*.95*Math.sin(axis),yaw:Math.atan2(-side*Math.cos(axis),-side*Math.sin(axis)),pair,side};
}
// Eight counted transfers (R,L,L,R,L,R,R,L), with an unmoving support foot.
const STEP_FOOT=['right','left','left','right','left','right','right','left'];
const STEP_ENDS=[
 [[-.28,.015],[.02,0],[.15,0],[-.15,0],[.28,.015],[-.02,0],[-.15,0],[.15,0]],
 [[-.15,.11],[.15,.08],[.15,0],[-.15,0],[.15,-.08],[-.15,-.06],[-.15,0],[.15,0]],
 [[-.23,.06],[.08,.035],[.15,0],[-.15,0],[.23,.06],[-.08,.035],[-.15,0],[.15,0]],
];
const ORDERS=[[0,1,2,3,4,5,6,7],[3,2,5,1,6,4,7,0],[2,4,0,6,1,7,5,3]];
export const STEP_NAMES=['Yan adım','İleri–geri basış','Çapraz topuk dokunuşu'];
export function countedStep(beat,style=0){
 const STEP_END=STEP_ENDS[style%STEP_ENDS.length];
 const count=((beat%8)+8)%8,index=Math.floor(count),u=count-index;
 const feet={left:[.15,0,0],right:[-.15,0,0]};
 for(let i=0;i<index;i++){const [x,z]=STEP_END[i];feet[STEP_FOOT[i]]=[x,0,z];}
 const moving=STEP_FOOT[index],support=moving==='left'?'right':'left',from=feet[moving],to=STEP_END[index],s=smooth(u),lift=Math.sin(Math.PI*u)**2;
 feet[moving]=[mix(from[0],to[0],s),lift*.045,mix(from[2],to[1],s)+(index===2||index===6?lift*(style===1?.055:.11):0)];
 return{feet,moving,support,lift,index};
}
function rotateXZ(p,angle){return[p[0]*Math.cos(angle)+p[2]*Math.sin(angle),p[1],-p[0]*Math.sin(angle)+p[2]*Math.cos(angle)];}
export function pivotStep(within,direction){
 const index=Math.min(7,Math.floor(within)),u=within-index,angleAt=b=>direction*TAU*smooth(b/8),turn=angleAt(within);
 const feet={left:[.15,0,0],right:[-.15,0,0]},lift=Math.sin(Math.PI*u)**2;
 for(let i=0;i<index;i++){const key=i%2?'left':'right';feet[key]=rotateXZ([key==='left'?.15:-.15,0,0],angleAt(Math.min(8,i+2)));}
 const moving=index%2?'left':'right',support=moving==='left'?'right':'left',to=rotateXZ([moving==='left'?.15:-.15,0,0],angleAt(Math.min(8,index+2))),s=smooth(u);
 feet[moving]=feet[moving].map((n,i)=>mix(n,to[i],s));feet[moving][1]=lift*.055;
 for(const key of ['left','right'])feet[key]=rotateXZ(feet[key],-turn);
 return{feet,moving,support,lift,index,turn};
}
export function dancePose(time,pair=0,side=-1,hype=0){
 hype=Math.max(0,Math.min(1,hype));
 const beat=time*DANCE_BPM/60,local=beat+pair*8,round=Math.floor(local/64),cycle=((local%64)+64)%64,section=Math.floor(cycle/8),within=cycle%8;
 const order=ORDERS[((round%3)+3)%3],phrase=order[section];
 const accent=smooth(Math.min(within/1.4,(8-within)/1.4));
 const spinning=phrase===6&&((round+pair)%2===0?side===-1:side===1);
 const style=((phrase+round+pair)%3+3)%3;
 const pulse=(1-Math.cos(beat*TAU))/2,step=spinning?pivotStep(within,side):countedStep(beat,style),feet=step.feet;
 const listening=(phrase===4&&side===-1)||(phrase===5&&side===1)||(phrase===6&&!spinning),solo=(phrase===4&&side===1)||(phrase===5&&side===-1),lead=solo?accent:0;
 const clap=listening?accent:0,flourish=phrase===2?accent:0;
 const beltWeight={left:phrase===1||phrase===7?accent:0,right:phrase===7?accent:0};
 const mid=(feet.left[0]+feet.right[0])/2,rock=Math.sin(beat*Math.PI),sweep=Math.sin(beat*Math.PI/2),energy=accent*(1-clap);
 // Let the shoulder, rib cage and hands answer a planted step. Increasing
 // the gesture, rather than speeding up the clock, keeps excitement smooth.
 const bodyAccent=energy*(spinning?.35:1),dip=(phrase===3||phrase===7)?accent:0;
 const body={x:spinning?0:mix(mid,feet[step.support][0]*.55,step.lift)*.68,y:-.035-.018*pulse-.018*lead*pulse,
  z:spinning?0:(feet.left[2]+feet.right[2])*.43+.025*lead,lean:-(.025+.028*bodyAccent)*rock,twist:(.045+.065*bodyAccent)*rock};
 body.y-=.008*dip*pulse;
 const height=1.37+flourish*.09+lead*.06+hype*.025,bounce=.018*pulse;
 const hands={left:[.42,height+bounce,.27],right:[-.42,height+bounce,.27]};
 for(const [key,sign]of [['left',1],['right',-1]]){
  const wave=beat*Math.PI/2+sign*side*.75,reply=Math.sin(wave),open=Math.cos(wave);
  hands[key][0]+=sign*energy*(.025+.04*open);
  hands[key][1]+=energy*(.085*reply+.025*rock*sign);
  hands[key][2]+=energy*.045*Math.sin(wave-.65);
  // Alternating high/low snapping hands, then a clear arm flourish.
  if(phrase===2){hands[key][1]+=accent*(.10+.10*sign*sweep);hands[key][0]-=sign*.055*accent;}
  if(spinning){hands[key][0]+=sign*.035*accent;hands[key][1]+=.07*accent;}
  const belt=beltWeight[key];for(let i=0;i<3;i++)hands[key][i]=mix(hands[key][i],[sign*.25,1.10,.025][i],belt);
  if(phrase===1&&key==='right')hands[key][1]+=accent*.22;
  // Ease into the rig's comfortable overhead reach instead of snapping to a cap.
  if(hands[key][1]>1.55)hands[key][1]=1.55+.10*Math.tanh((hands[key][1]-1.55)/.10);
  const close=(1+Math.cos(beat*TAU))/2;
  const clapTarget=[sign*(.052+.17*(1-close)),1.28+.015*pulse,.41];
  for(let i=0;i<3;i++)hands[key][i]=mix(hands[key][i],clapTarget[i],clap);
 }
 const snapWeight={left:(1-beltWeight.left)*(1-clap),right:(1-beltWeight.right)*(1-clap)};
 feet[step.moving][1]+=step.lift*(lead*.015+hype*.012+dip*.012);
 if(phrase===3)feet[step.moving][2]+=step.lift*accent*.035;
 const turn=spinning?step.turn:0;
 return {phrase:PHRASES[phrase],stepName:spinning?'Dönüş adımı':STEP_NAMES[style],body,hands,clap,turn,feet,beltWeight,snapWeight,snapBeat:beat,
  heel:[step.moving==='left'?step.lift*.14:0,step.moving==='right'?step.lift*.14:0],
  shoulder:(.017+.025*bodyAccent)*Math.sin(beat*TAU),shoulderSwing:.035*bodyAccent*rock,
  chestRoll:.022*bodyAccent*rock,chestPitch:.018*bodyAccent*Math.sin(beat*Math.PI-.5),wrist:.065*Math.sin(beat*TAU-.3),
  headYaw:-body.twist*.65+.055*energy*sweep,headNod:(.007+.018*bodyAccent)*rock,solo:lead};
}
