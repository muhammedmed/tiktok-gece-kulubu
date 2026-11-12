import {dancePose,DANCE_BPM} from './dance-motion.js';

export const HYPE_SECONDS=18;
const TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
const rotateXZ=(p,a)=>[p[0]*Math.cos(a)+p[2]*Math.sin(a),p[1],-p[0]*Math.sin(a)+p[2]*Math.cos(a)];
const PHRASES=['Eller havaya · alkış','Omuz silk · topuk vur','Diz kır · kolları aç','Bir el belde · karşı kol yukarı','Karşılıklı adım · çeyrek dönüş','Hep birlikte · son alkış'];
const FIGURE_SECONDS=2.8;
const modulo=(n,length)=>((n%length)+length)%length;

export function hypeEnvelope(age){
 if(age<=0||age>=HYPE_SECONDS)return 0;
 return smooth(age/.85)*smooth((HYPE_SECONDS-age)/1.15);
}

function phraseWeights(age,pair,side,variant){
 // Each guest starts on their own figure. A full middle round visits all five,
 // so partners remain on different figures without random changes each frame.
 const offset=modulo(Math.trunc(variant)+2*Math.trunc(pair)+(side===1?3:0),5);
 const progress=(age-1.2)/FIGURE_SECONDS,index=Math.floor(progress);
 const change=smooth((progress-index-.68)/.32);
 const opening=1-smooth((age-.65)/.65),finale=smooth((age-15.2)/.9);
 const middle=(1-opening)*(1-finale),weights=Array(6).fill(0);
 weights[modulo(index+offset,5)]+=middle*(1-change);
 weights[modulo(index+offset+1,5)]+=middle*change;
 weights[0]+=opening*(1-finale);weights[5]=finale;
 return weights;
}

// travelWeight is the caller's smoothly changing formation-speed weight (0..1).
// Travel uses the same musical foot transfers; no walking animation is needed.
export function hypePose(time,age,pair=0,side=-1,variant=0,travelWeight=0){
 const base=dancePose(time,pair,side),envelope=hypeEnvelope(age);
 if(envelope===0)return base;
 const weights=phraseWeights(age,pair,side,variant),[applause,shimmy,knees,waist,steps,finale]=weights;
 const travel=smooth(Number.isFinite(travelWeight)?travelWeight:0)*envelope;
 const beat=time*DANCE_BPM/60,phase=beat*TAU;
 const personality=Math.sin(variant*2.399+pair*.73),variation=.16*personality;
 const personalPhase=phase+variation+side*.13;
 const pulse=(1-Math.cos(phase))/2,personalPulse=(1-Math.cos(personalPhase))/2;
 const call=(1+Math.sin(beat*Math.PI/2+pair*Math.PI/2))/2;
 const lead=side===-1?call:1-call;
 const hands={},elbows={},beltWeight={},snapWeight={};
 for(const [key,sign]of [['left',1],['right',-1]]){
  const isLead=sign===side?1:0;
  const atWaist=sign===-side?1:0;
  const targets=[
   [sign*(.052+.21*personalPulse),1.56+.04*personalPulse,.27],
   [sign*(.40+.025*Math.sin(personalPhase+sign*.5)),1.38+sign*.035*Math.sin(personalPhase),.25+.022*Math.sin(personalPhase+sign)],
   [sign*(.475+.015*personalPulse),1.30+.055*(1-personalPulse),.225],
   atWaist?[sign*.25,1.10,.085]:[sign*(.28+.035*personalPulse),1.59+.025*personalPulse,.24],
   [sign*(.36+.095*(1-lead)),1.32+isLead*.23*lead+.035*personalPulse,.255+.035*(1-lead)],
   // The final raised applause uses the shared clock, without personal offsets.
   [sign*(.052+.215*pulse),1.57+.035*pulse,.275],
  ];
  const target=targets[0].map((_,i)=>targets.reduce((sum,pose,j)=>sum+pose[i]*weights[j],0));
  const travellingHand=[sign*mix(Math.abs(target[0]),.35,.55),mix(target[1],1.33,.45),mix(target[2],.30,.6)];
  for(let i=0;i<3;i++)target[i]=mix(target[i],travellingHand[i],travel);
  hands[key]=base.hands[key].map((value,i)=>mix(value,target[i],envelope));
  const belt=base.beltWeight[key];
  const ordinaryElbow=[sign*(.62-.16*belt),1.10+.03*belt,.05-.10*belt];
  const energeticElbow=[sign*(.50+.065*knees-.04*waist*atWaist),1.16+.10*(applause+finale)+.025*isLead*steps*lead+.065*waist*(1-atWaist)-.03*waist*atWaist,.17-.12*waist*atWaist];
  for(let i=0;i<3;i++)energeticElbow[i]=mix(energeticElbow[i],[sign*.54,1.18,.17][i],travel);
  elbows[key]=ordinaryElbow.map((value,i)=>mix(value,energeticElbow[i],envelope));
  beltWeight[key]=mix(belt,waist*atWaist,envelope)*(1-travel);
  snapWeight[key]=mix(base.snapWeight[key],.55*shimmy+.75*steps+.6*waist*(1-atWaist),envelope)*(1-travel);
 }

 // Keep the original musical foot sequence, even when Coştur starts mid-step.
 // A flourish changes facing, so counter-rotate contacts to leave the support
 // foot at exactly its ordinary world-space position throughout the turn.
 const turnProgress=(age-1.2)/FIGURE_SECONDS;
 const extraTurn=side*Math.PI/2*Math.sin(Math.PI*turnProgress)**2*steps*envelope*(1-.92*travel);
 const feet={},heel=[];
 for(const [key,index]of [['left',0],['right',1]]){
  const lift=clamp(base.feet[key][1]/.06),foot=[...base.feet[key]];
  foot[1]+=lift*envelope*(.019*shimmy+.025*knees+.021*steps*lead);
  foot[2]+=lift*envelope*(.016*shimmy+.02*steps*lead);
  // The same foot remains grounded as travel fades in or out. The moving foot
  // becomes a higher, compact march while the formation supplies root motion.
  foot[0]=mix(foot[0],(key==='left'?1:-1)*.15+base.feet[key][0]*.12,travel);
  foot[1]+=lift*.045*travel;
  foot[2]=mix(foot[2],base.feet[key][2]*.45+.10*lift*Math.sin(phase*.5),travel);
  feet[key]=rotateXZ(foot,-extraTurn);
  heel[index]=mix(base.heel[index]+lift*envelope*(.17*shimmy+.095*knees+.09*steps),lift*.12,travel);
 }
 const horizontal=rotateXZ([base.body.x,0,base.body.z],-extraTurn);
 const energeticY=mix(-.045-.014*pulse-.018*applause*pulse-.033*shimmy*personalPulse-.077*knees*(.4+.6*pulse)-.023*waist*personalPulse-.032*steps*personalPulse-.025*finale*pulse,-.062-.018*pulse,travel);
 const body={...base.body,x:horizontal[0],y:mix(base.body.y,energeticY,envelope),z:horizontal[2],
  lean:mix(base.body.lean,.025*Math.sin(beat*Math.PI)+steps*side*.035*lead,envelope),
  twist:mix(base.body.twist,.045*Math.sin(beat*Math.PI)+shimmy*.035*Math.sin(personalPhase)+knees*side*.025,envelope)};
 const phrase=weights.indexOf(Math.max(...weights));
 return {...base,phrase:PHRASES[phrase],stepName:travel>.5?'Partnerine adımla':phrase===4?'Karşılıklı dönüş adımı':phrase===1?'Belirgin topuk vuruşu':'Ritme bas',
  body,hands,elbows,feet,heel,beltWeight,snapWeight,turn:base.turn+extraTurn,
  clap:mix(base.clap,applause+finale,envelope)*(1-travel),snapBeat:beat,
  shoulder:mix(base.shoulder,(.025+.057*shimmy)*Math.sin(personalPhase),envelope),
  wrist:mix(base.wrist,.055*Math.sin(personalPhase-.3)*(1-applause-finale),envelope),
  headYaw:mix(base.headYaw,-body.twist*.65+.045*steps*side*lead,envelope),
  headNod:mix(base.headNod,.012*Math.sin(beat*Math.PI)+knees*.018*pulse,envelope),
  solo:mix(base.solo,steps*lead,envelope)};
}
