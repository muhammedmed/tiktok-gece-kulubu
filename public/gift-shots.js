// Priorities order waiting gifts only. A running gift always finishes first.
export const GIFT_SHOTS=Object.freeze({
 waiter:{duration:6,priority:3},saz:{duration:8,priority:4},drum:{duration:8,priority:4},
 vip:{duration:8,priority:4},dj:{duration:8,priority:4},dancer:{duration:10,priority:5},
 solo:{duration:12,priority:5},hype:{duration:18,priority:6},money:{duration:6,priority:3},
 confetti:{duration:6,priority:3},dance:{duration:6,priority:2},
});
let localSequence=0;
export function giftShot(event,callbacks={}){
 const policy=GIFT_SHOTS[event.role];if(!policy)throw Error('Unknown gift role: '+event.role);
 return {...policy,key:'gift:'+(event.seq??'local-'+(++localSequence)),kind:event.role,
  protected:true,locked:true,fixedDuration:true,immediate:true,returnView:'dance',returnDuration:.75,...callbacks};
}

// Keep every role event, including multiple gifts from one viewer in one SSE packet.
export function roleEventPlayer(event,players){
 const player=event.player||players.find(p=>p.id===event.id);
 return player?{...player,role:event.role,chat:player.chat?{...player.chat}:undefined}:null;
}
