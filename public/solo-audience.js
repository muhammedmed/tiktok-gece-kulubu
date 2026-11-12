import {dancePose,DANCE_BPM} from './dance-motion.js';
const mix=(a,b,w)=>a+(b-a)*w;
// Applaud the soloist, with small independent timing differences. Feet stay
// planted once the audience has finished opening the circle.
export function audiencePose(time,audience,pair=0,side=-1){
 const p=dancePose(time,pair,side),w=audience.weight||0,beat=(time-audience.startedAt)*DANCE_BPM/60+(audience.phase||0);
 const pulse=(1+Math.cos(beat*Math.PI*2))/2,close=pulse**2,travel=Math.min(1,audience.travel||0);
 p.phrase='Sahneye alkış';p.stepName='Ritme eşlik';p.turn*=1-w;p.clap=w;
 const body={x:.012*Math.sin(beat*Math.PI),y:-.035-.012*pulse,z:0,lean:.012*Math.sin(beat*Math.PI),twist:0,pitch:.02};
 for(const k of Object.keys(body))p.body[k]=mix(p.body[k]||0,body[k],w);
 p.elbows={left:[.36,1.04,.30],right:[-.36,1.04,.30]};
 p.palmNormals={left:[-1,0,0],right:[1,0,0]};
 p.handDirections={left:[0,.11,.012],right:[0,.11,.012]};
 p.fingerCurl={left:.045*w,right:.045*w};
 for(const [key,sign]of [['left',1],['right',-1]]){
  const clap=[sign*(.052+.16*(1-close)),1.31+.012*pulse,.42];
  p.hands[key]=p.hands[key].map((n,i)=>mix(n,clap[i],w));
  const step=Math.max(0,Math.sin(beat*Math.PI*2+(sign<0?Math.PI:0)));
  const feet=[sign*.17,.035*step*travel,.035*Math.sin(beat*Math.PI*2)*travel];
  p.feet[key]=p.feet[key].map((n,i)=>mix(n,feet[i],w));
  p.snapWeight[key]*=1-w;p.beltWeight[key]*=1-w;
 }
 p.heel=p.heel.map(h=>h*(1-w));p.wrist*=1-w;p.shoulder*=1-w;
 p.headYaw*=1-w;p.headNod=mix(p.headNod,.018*Math.sin(beat*Math.PI),w);
 return p;
}
