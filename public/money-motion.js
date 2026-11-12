import {dancePose} from './dance-motion.js';
import {dancerPose} from './dancer-motion.js';
export const MONEY_SECONDS=6,MONEY_ENTRY=1.1,MONEY_PERIOD=.82,MONEY_RELEASE=.56;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function moneyEnvelope(age){return smooth(age/.6)*smooth((MONEY_SECONDS-MONEY_ENTRY-age)/.8);}
// Same release clock drives the arm, opening fingers and emitted notes.
export function moneyGesture(age){const t=Math.max(0,age),cycle=Math.floor(t/MONEY_PERIOD),phase=t/MONEY_PERIOD-cycle,side=cycle%2?'right':'left';return{cycle,phase,side,releaseIndex:age<MONEY_PERIOD*MONEY_RELEASE?-1:Math.floor((age-MONEY_PERIOD*MONEY_RELEASE)/MONEY_PERIOD),active:age>=0&&age<4.1};}
export function moneyPose(age,receiver=false,time=age,variant=0){
 const p=receiver?dancerPose(time,variant):dancePose(age,0,-1),w=moneyEnvelope(age),g=moneyGesture(age);
 p.clap=0;p.beltWeight={left:0,right:0};p.snapWeight={left:0,right:0};p.heel=[0,0];p.feet={left:[.16,0,0],right:[-.16,0,0]};p.hipTwist=receiver?.045*Math.sin(age*3)*w:0;p.hipTilt=receiver?.035*Math.sin(age*5)*w:0;
 const blend=(a,b)=>a+(b-a)*w;
 p.turn=Math.atan2(Math.sin(p.turn),Math.cos(p.turn))*(1-w);p.body={x:receiver?.015*Math.sin(age*3)*w:0,y:receiver?-.07*w:0,z:0,lean:0,twist:receiver?.04*Math.sin(age*3)*w:0,pitch:receiver?.26*w:0};
 p.headYaw=0;p.headNod=receiver?-.10*w:0;p.shoulder=.01*Math.sin(age*4);p.wrist=.03;p.phrase='Para saç';p.stepName='Karşılıklı gösteri';p.fingerCurl={left:.15,right:.15};p.handDirections={left:[.03,.04,.12],right:[-.03,.04,.12]};
 if(receiver){for(const [key,sign]of [['left',1],['right',-1]]){const target=[sign*.36,1.26+.045*Math.sin(age*3+sign),.32];p.hands[key]=p.hands[key].map((n,i)=>blend(n,target[i]));}return p;}
 p.turn=0;p.hands={left:[.18,1.03,.28],right:[-.18,1.03,.28]};
 if(g.active){const sign=g.side==='left'?1:-1,frames=[[0,[sign*.18,1.03,.28]],[.30,[sign*.24,1.32,.22]],[MONEY_RELEASE,[sign*.22,1.48,.54]],[.73,[sign*.24,1.48,.57]],[1,[sign*.18,1.03,.28]]];let k=0;while(k<frames.length-2&&g.phase>frames[k+1][0])k++;const u=smooth((g.phase-frames[k][0])/(frames[k+1][0]-frames[k][0]));p.hands[g.side]=frames[k][1].map((v,i)=>v+(frames[k+1][1][i]-v)*u);p.fingerCurl[g.side]=g.phase<MONEY_RELEASE?.48:.04;p.handDirections[g.side]=[sign*.02,.02,.14];p.body.twist=sign*.035*Math.sin(g.phase*Math.PI);}
 return p;
}
