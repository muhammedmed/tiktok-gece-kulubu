// Gift shots finish before the next gift begins. Only incidental chat/entrance
// shots may be coalesced or trimmed when the waiting list is busy.
export class ShotQueue {
 constructor(){this.items=[];this.current=null;this.until=0;this.returnUntil=0;this.completedGiftKeys=new Set();}
 start(event,now){this.current=event;this.started=now;this.until=now+event.duration;this.arrivedAt=null;event.onStart?.(now);}
 release(event){event?.onRelease?.();}
 remember(event){
  if(!event.protected)return;
  this.completedGiftKeys.add(event.key);
  // Reconnect/reconciliation duplicates are ignored without retaining an
  // unbounded history. Waiting gifts themselves are never discarded.
  if(this.completedGiftKeys.size>4096)this.completedGiftKeys.delete(this.completedGiftKeys.values().next().value);
 }
 sort(){this.items.sort((a,b)=>Number(Boolean(b.protected))-Number(Boolean(a.protected))||(b.priority??0)-(a.priority??0));}
 push(event,now){
  if(event.protected&&this.completedGiftKeys.has(event.key))return false;
  if(this.current&&event.key===this.current.key){
   if(!this.current.protected&&!event.protected&&!this.current.fixedDuration&&!event.immediate&&!this.current.followArrival)this.until=Math.max(this.until,Math.min(this.until+1,now+12));
   return false;
  }
  const exact=this.items.find(x=>x.key===event.key);
  if(exact&&(exact.protected||event.protected))return false;
  const interruptible=!this.current?.locked&&!this.current?.protected;
  if(event.protected){
   this.items.push(event);this.sort();
   // A gift can replace an incidental close-up, but never another gift.
   // Take the sorted head so a new arrival cannot jump older queued gifts.
   if(this.current&&interruptible){const previous=this.current;this.current=null;this.release(previous);this.start(this.items.shift(),now);}
   else if(!this.current&&now>=this.returnUntil)this.start(this.items.shift(),now);
   return true;
  }
  const prior=exact||this.items.find(x=>event.person&&x.person===event.person&&!x.locked&&!x.protected&&!event.locked);
  const giftWaiting=this.items.some(x=>x.protected);
  if(interruptible&&!giftWaiting&&event.person&&this.current?.person===event.person&&event.key!==this.current.key){this.release(this.current);this.start(event,now);return true;}
  if(interruptible&&!giftWaiting&&(event.immediate&&(!this.current||event.priority>=this.current.priority)||this.current&&!this.current.followArrival&&event.priority>this.current.priority)){
   if(prior)this.items.splice(this.items.indexOf(prior),1);this.release(this.current);this.start(event,now);return true;
  }
  if(prior){Object.assign(prior,event);this.sort();return true;}
  this.items.push(event);this.sort();
  // The incidental budget is independent of the protected gift backlog.
  if(this.items.filter(x=>!x.protected).length>12){const index=this.items.findLastIndex(x=>!x.protected);this.release(this.items.splice(index,1)[0]);}
  return true;
 }
 tick(now){
  if(this.current?.followArrival&&!this.current.person?.walking&&this.arrivedAt===null){this.arrivedAt=now;this.until=now+(this.current.arrivalHold??5);this.current.onArrival?.(now);}
  if(this.current&&now>=this.until){
   const finished=this.current;this.current=null;this.remember(finished);
   this.returnUntil=now+(finished.returnDuration??3);this.returnView=finished.returnView??'wide';this.release(finished);
  }
  if(!this.current&&now>=this.returnUntil&&this.items.length)this.start(this.items.shift(),now);
  return this.current;
 }
 removePerson(person,{force=false}={}){
  this.items=this.items.filter(e=>{if(e.person!==person||e.protected&&!force)return true;this.release(e);return false;});
  if(this.current?.person===person&&(!this.current.protected||force)){const previous=this.current;this.current=null;this.returnUntil=0;this.release(previous);}
 }
 clear(){const previous=this.current,waiting=this.items;this.items=[];this.current=null;this.returnUntil=0;this.completedGiftKeys.clear();this.release(previous);waiting.forEach(e=>this.release(e));}
}
export const DANCE_SHOT_SECONDS=5;
// Most automatic airtime belongs to floor viewers. Other destinations are
// short interludes and are skipped immediately when nobody occupies them.
export const TOUR_STOPS=[['wide',3],['dance',24],['waiter',5],['dance',24],['stageDancers',7],['dance',24],['saz',6],['dance',24],['vipLeft',6],['dance',24],['drum',6],['dance',24],['vipRight',6],['dance',24],['stageDancers',6],['dance',24],['vipOuterLeft',6],['dance',24],['dj',5],['dance',24],['vipOuterRight',6]];
export class AutoTour {
 constructor(){this.index=0;this.elapsed=0;this.lastTime=null;this.cycle=0;this.danceIndex=0;}
 resumeDance(){if(TOUR_STOPS[this.index][0]==='dance')this.danceIndex+=Math.floor(this.elapsed/DANCE_SHOT_SECONDS)+1;this.index=(this.index+1)%TOUR_STOPS.length;while(TOUR_STOPS[this.index][0]!=='dance')this.index=(this.index+1)%TOUR_STOPS.length;this.elapsed=0;this.cycle++;}
 tick(now,paused=false,available=()=>true){const dt=this.lastTime===null?0:Math.max(0,now-this.lastTime);this.lastTime=now;
  if(!paused){this.elapsed+=dt;while(this.elapsed>=TOUR_STOPS[this.index][1]){if(TOUR_STOPS[this.index][0]==='dance')this.danceIndex+=Math.ceil(TOUR_STOPS[this.index][1]/DANCE_SHOT_SECONDS);this.elapsed-=TOUR_STOPS[this.index][1];this.index=(this.index+1)%TOUR_STOPS.length;this.cycle++;}}
  if(!paused)for(let n=0;n<TOUR_STOPS.length&&!available(TOUR_STOPS[this.index][0]);n++){this.index=(this.index+1)%TOUR_STOPS.length;this.elapsed=0;this.cycle++;}
  return{view:TOUR_STOPS[this.index][0],elapsed:this.elapsed,id:this.cycle,danceIndex:this.danceIndex+(TOUR_STOPS[this.index][0]==='dance'?Math.floor(this.elapsed/DANCE_SHOT_SECONDS):0),danceElapsed:this.elapsed%DANCE_SHOT_SECONDS};
 }
}
