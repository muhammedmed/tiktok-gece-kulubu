import {dancePose,DANCE_BPM,pivotStep,countedStep} from './dance-motion.js';

export const DANCER_FIGURES=['Kalça sekizi','Tek kalça vurgusu','İpek kol dalgası','Gövde dalgası','Omuz titreşimi','Adımlı dönüş','Yana süzülüş','Parmak şıklat ve bakış','Taç ve kol açılışı','Topuk dokunuşu ve nazlı dönüş'];
export const DANCER_PHRASE_BEATS=8;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const mix=(a,b,w)=>a+(b-a)*w;
const mixAngle=(a,b,w)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*w;
const orders=[
 [0,7,2,1,8,3,6,4,9,5],
 [7,3,6,8,1,5,0,9,2,4],
 [2,1,9,4,7,0,5,3,8,6],
 [8,6,3,0,5,7,4,2,1,9],
 [1,9,8,5,2,4,7,6,0,3],
];
const sides=[['left',1],['right',-1]];
function figureAt(section,style){const index=((section%10)+10)%10,round=Math.floor(section/10);return orders[style][((index+round*3)%10+10)%10];}

// Each phrase is evaluated on one continuous musical clock. Crossfading
// adjacent figures avoids repeatedly dropping both arms to a neutral pose.
function figurePose(figure,beat,within,style){
 const a=beat*Math.PI,slow=a*.5,sway=Math.sin(a),side=style%2?-1:1;
 const p={body:{x:0,y:-.042,z:0,lean:0,twist:0,pitch:0},hipTwist:0,hipTilt:0,hipPitch:0,chestRoll:0,chestPitch:0,
  shoulder:.011*Math.sin(a),shoulderSwing:0,wrist:.025*Math.sin(slow),headYaw:0,headNod:0,headTilt:0,turn:0,clap:0,
  hands:{left:[.45,1.34,.24],right:[-.45,1.34,.24]},elbows:{left:[.51,1.20,.15],right:[-.51,1.20,.15]},
  feet:{left:[.15,0,0],right:[-.15,0,0]},heel:[0,0],beltWeight:{left:0,right:0},snapWeight:{left:0,right:0},
  fingerCurl:{left:.11,right:.11},wristFlourish:{left:[.035*Math.sin(slow),.07*Math.cos(slow)],right:[-.035*Math.sin(slow),-.07*Math.cos(slow)]}};
 if(figure===0){
  p.body.x=.048*sway;p.body.z=.018*Math.sin(a*2);p.hipTwist=.27*sway;p.hipTilt=.115*Math.sin(a*2);
  p.hands.left=[.50,1.34+.10*Math.sin(slow),.23];p.hands.right=[-.50,1.34-.10*Math.sin(slow),.23];
  p.headYaw=.09*Math.sin(slow-.4);p.headNod=.018*Math.cos(slow);
 }
 if(figure===1){
  const drop=.5-.5*Math.cos(a*2);p.hipTilt=side*(.045+.14*drop);p.hipTwist=.13*sway;p.body.x=side*.038;p.body.y-=.028*drop;
  p.hands.left=[.30,1.74,.22];p.hands.right=[-.31,1.10,.22];p.heel=side>0?[.13*drop,0]:[0,.13*drop];
  if(side<0){p.hands.left=[.31,1.10,.22];p.hands.right=[-.30,1.74,.22];}
  p.headYaw=side*.12*(.55+.45*Math.sin(slow));p.headNod=.015*Math.sin(a-.3);p.headTilt=side*.035;
 }
 if(figure===2){
  p.hipTilt=.075*Math.sin(a*2);p.body.twist=.06*sway;p.shoulder=.025*Math.sin(slow);
  for(const [key,sign]of sides){const wave=slow+(sign<0?Math.PI:0);
   p.hands[key]=[sign*(.42+.075*Math.cos(wave)),1.43+.23*Math.sin(wave-.45),.25+.045*Math.cos(wave)];
   p.elbows[key]=[sign*.51,1.27+.13*Math.sin(wave),.15];p.fingerCurl[key]=.09+.04*Math.sin(wave-.8);
   p.wristFlourish[key]=[.06*Math.sin(wave-1),sign*.12*Math.sin(wave-.7)];
  }
  p.headYaw=.10*Math.sin(slow-.7);p.headTilt=.035*Math.sin(slow);
 }
 if(figure===3){
  p.chestRoll=.075*sway;p.chestPitch=.085*Math.cos(a);p.hipPitch=-.065*Math.cos(a-.7);p.hipTwist=-.095*sway;
  p.body.twist=.055*sway;p.body.y-=.015*(1+Math.sin(a-.65));
  const open=.5+.5*Math.sin(slow);p.hands.left=[.34+.13*open,1.27+.13*open,.30];p.hands.right=[-.34-.13*open,1.27+.13*open,.30];
  p.headNod=-.032*Math.cos(a-.3);p.headYaw=-p.body.twist*.5;
 }
 if(figure===4){
  // Small alternating accents read as a shimmy without high-frequency shaking.
  const ripple=Math.sin(a*2);p.hipTilt=.042*ripple+.06*sway;p.shoulder+=.03*ripple;p.shoulderSwing=.04*ripple;
  p.body.y-=.012*(.5-.5*Math.cos(a*2));p.hands.left=[.33,1.70,.20];p.hands.right=[-.47,1.32,.27];
  p.headYaw=.11*Math.sin(slow);p.wristFlourish.left=[.05*Math.sin(a),.11*Math.cos(slow)];
 }
 if(figure===5){
  const step=pivotStep(Math.max(0,Math.min(8,within)),side);p.turn=step.turn;p.feet=step.feet;
  p.feet.left[1]*=.7;p.feet.right[1]*=.7;
  const open=Math.sin(Math.PI*Math.max(0,within)/8)**2;
  p.hands.left=[.30+.17*open,1.70-.25*open,.22];p.hands.right=[-.30-.17*open,1.70-.25*open,.22];
  p.hipTilt=.045*Math.sin(a*2);p.headYaw=-side*.10*Math.sin(Math.PI*Math.max(0,within)/8);
 }
 if(figure===6||figure===9){
  const step=countedStep(beat,figure===6?0:2);p.feet=step.feet;
  for(const key of ['left','right']){p.feet[key][0]*=.78;p.feet[key][1]*=.66;p.feet[key][2]*=.65;}
  // Follow a fraction of the feet's midpoint; keep the torso inside its
  // reserved stage space while the alternating feet take the wider steps.
  p.body.x=(p.feet.left[0]+p.feet.right[0])*.15;p.body.z=(p.feet.left[2]+p.feet.right[2])*.22;
  p.hipTwist=(figure===6?.20:.12)*Math.cos(a);p.hipTilt=.10*sway;p.heel=step.moving==='left'?[step.lift*.12,0]:[0,step.lift*.12];
  if(figure===6){p.hands.left=[.47,1.37+.10*Math.sin(slow),.24];p.hands.right=[-.47,1.37-.10*Math.sin(slow),.24];p.headYaw=.11*Math.sin(slow-.3);}
  else{p.hands.left=[.33,1.55+.055*Math.sin(slow),.29];p.hands.right=[-.32,1.12,.22];p.snapWeight.left=.78;
   p.body.twist=.075*Math.sin(slow);p.headYaw=.15*Math.sin(slow-.35);p.headNod=.025*Math.cos(slow-.2);p.headTilt=.04*Math.sin(slow-.4);
   p.wristFlourish.left=[.045*Math.sin(a),.11*Math.sin(slow-.4)];}
 }
 if(figure===7){
  const reply=.5+.5*Math.sin(slow);p.hipTilt=.09*Math.sin(a*2);p.hipTwist=.13*sway;p.body.twist=.07*Math.sin(slow);
  p.hands.left=[.37,1.42+.15*reply,.29];p.hands.right=[-.37,1.57-.15*reply,.29];
  p.snapWeight.left=.18+.77*smooth(reply);p.snapWeight.right=.18+.77*smooth(1-reply);
  p.headYaw=.16*Math.sin(slow-.3);p.headNod=.022*Math.cos(slow);p.headTilt=.045*Math.sin(slow-.35);
  p.wristFlourish.left=[.04*Math.sin(a),.09*Math.cos(slow)];p.wristFlourish.right=[-.04*Math.sin(a),-.09*Math.cos(slow)];
 }
 if(figure===8){
  const open=.5-.5*Math.cos(slow);p.hipTilt=.095*sway;p.hipTwist=.15*Math.sin(a-.5);p.chestRoll=.025*Math.cos(slow);
  p.hands.left=[.28+.20*open,1.76-.35*open,.22];p.hands.right=[-.28-.20*open,1.76-.35*open,.22];
  p.headYaw=.11*Math.sin(slow-.3);p.headNod=-.024*(1-open);p.headTilt=.025*Math.sin(slow);
  p.wristFlourish.left=[.06*Math.sin(slow-.7),.11*Math.sin(slow)];p.wristFlourish.right=[-.06*Math.sin(slow-.7),-.11*Math.sin(slow)];
 }
 return p;
}
function blendPose(a,b,w){
 const p={};for(const key of Object.keys(a)){
  if(key==='turn'){p.turn=mixAngle(a.turn,b.turn,w);continue;}
  if(typeof a[key]==='number'){p[key]=mix(a[key],b[key],w);continue;}
  if(Array.isArray(a[key])){p[key]=a[key].map((n,i)=>mix(n,b[key][i],w));continue;}
  p[key]={};for(const field of Object.keys(a[key]))p[key][field]=Array.isArray(a[key][field])?a[key][field].map((n,i)=>mix(n,b[key][field][i],w)):mix(a[key][field],b[key][field],w);
 }
 return p;
}
export function dancerPose(t,variant=0){
 const style=((Math.floor(variant)%orders.length)+orders.length)%orders.length;
 const beat=Math.max(0,t)*DANCE_BPM/60+style*1.31,section=Math.floor(beat/DANCER_PHRASE_BEATS),within=beat%DANCER_PHRASE_BEATS;
 const figure=figureAt(section,style),next=figureAt(section+1,style),blend=smooth((within-6.4)/1.6);
 const current=figurePose(figure,beat,within,style),following=figurePose(next,beat,Math.max(0,within-8),style);
 const p={...dancePose(t,0,-1),...blendPose(current,following,blend)};
 p.phrase=DANCER_FIGURES[blend>.5?next:figure];p.stepName='Zarif sahne figürü';p.snapBeat=beat*.5;p.hipIsolation=.72;
 return p;
}
