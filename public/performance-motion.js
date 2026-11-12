const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
export function drumStroke(time,side){
 const beat=time*112/60,phase=((beat%4)+4)%4;
 const beats=side==='R'?[0,2]:[.5,1.5,2.75,3.5];
 let lift=.07,contact=0;
 for(const hit of beats){const since=((phase-hit+4)%4);
  if(since<.40){lift=Math.min(lift,.07*smooth(since/.40));contact=Math.max(contact,1-smooth(since/.08));}
  else if(since>3.84){const before=4-since;lift=Math.min(lift,.07*smooth(before/.16));contact=Math.max(contact,1-smooth(before/.08));}
 }
 return{lift,contact};
}
const MELODIES=[[.47,.50,.56,.53,.61,.56,.50,.47],[.54,.61,.58,.66,.60,.53,.50,.47],[.47,.55,.63,.58,.50,.60,.55,.47]];
export function sazGesture(time){
 const beat=Math.max(0,time*112/60),phrase=Math.floor(beat/16),kind=phrase%3,notes=MELODIES[kind],step=Math.floor(beat/2)%8,u=(beat/2)%1;
 // Fingerboard changes settle on a fret; the slide occupies only the start of each note.
 const fret=mix(notes[(step+7)%8],notes[step],smooth(u/.20));
 const stroke=kind===1?beat*2:beat,phase=stroke%1;
 const envelope=kind===2&&beat%4>3?.35:1,pluck=Math.sin(phase*Math.PI*2)*(.024+kind*.005)*envelope;
 return{fret,pluck,press:(1+Math.cos(beat*Math.PI*2))/2,kind,activeFinger:1+(Math.floor(beat)%3),lift:(1-Math.cos(phase*Math.PI*2))*.003,
  label:['Vurgulu tezene','Çift vuruş','Kısa süsleme'][kind]};
}
