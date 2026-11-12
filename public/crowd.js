import {MAX_GUESTS,MAX_DANCERS} from './club-layout.js';
export {MAX_GUESTS,MAX_DANCERS};
export function crowdBudget(count){return count>=80?{fps:30,pixelRatio:1}:count>=50?{fps:30,pixelRatio:1.25}:{fps:30,pixelRatio:1.35};}
export function animationInterval(distance,visible,important,walking){
 if(walking||important)return 0;
 if(!visible)return .8;
 if(distance<6)return 0;
 return distance<11?1/24:1/12;
}
export function freeDanceSlot(people,except){const used=new Set(people.filter(p=>p!==except&&((p.role==='dance'&&!p.walking)||(p.walking&&p.destinationRole==='dance'))).map(p=>p.danceSlot));for(let slot=0;slot<MAX_DANCERS;slot++)if(!used.has(slot))return slot;return null;}
export function freeSeat(seats,people,except,vip=false){return seats.find(s=>Boolean(s.vip)===vip&&!people.some(p=>{if(p===except)return false;const at=p.walking?p.path.at(-1):p.root.position;return at&&Math.hypot(at.x-s.x,at.z-s.z)<.55;}));}
export class FrameClock{
 constructor(now=0){this.last=now;this.pending=0;this.elapsed=0;}
 tick(now,fps,hidden=false){const delta=Math.max(0,Math.min(.15,(now-this.last)/1000));this.last=now;
  if(hidden){this.pending=0;this.elapsed=0;return null;}
  this.pending+=delta;this.elapsed+=delta;const interval=1/fps;if(this.pending+1e-8<interval)return null;
  this.pending=Math.max(0,this.pending-interval*Math.floor((this.pending+1e-8)/interval));const dt=Math.min(.15,this.elapsed);this.elapsed=0;return dt;
 }
}

// Hysteresis avoids resolution pumping when LIVE Studio shares the GPU.
export class AdaptiveQuality{
 constructor(){this.scale=1;this.slow=0;this.healthy=0;}
 sample(fps){const before=this.scale;if(fps<25){this.slow++;this.healthy=0;}else if(fps>29){this.healthy++;this.slow=0;}else{this.slow=0;this.healthy=0;}
  if(this.slow>=3){this.scale=Math.max(.8,Math.round((this.scale-.1)*10)/10);this.slow=0;}
  if(this.healthy>=15){this.scale=Math.min(1,Math.round((this.scale+.1)*10)/10);this.healthy=0;}
  return before!==this.scale;
 }
}
