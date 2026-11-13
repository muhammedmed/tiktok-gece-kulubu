// One capacity and layout definition shared by the server, dancers and stage.
export const MAX_GUESTS=128;
export const MAX_DANCERS=84;
export const DANCE_IDLE_MS=150*1000;
export const MAX_WAITING=100;
export const ROOM={x:0,z:9,r:24};
export const FLOOR={x:0,z:11,r:12.6};
export const PAIR_CENTERS=[3,5,6,7,7,6,5,3].flatMap((count,row)=>
 Array.from({length:count},(_,column)=>[(column-(count-1)/2)*3.3,.25+row*3.1])).slice(0,MAX_DANCERS/2);

export const VIP_LOUNGES=[
 {id:'vipLeft',name:'VIP 1 · Sahne solu',x:-8.7,z:-7.4,yaw:0},
 {id:'vipRight',name:'VIP 2 · Sahne sağı',x:8.7,z:-7.4,yaw:0},
 {id:'vipOuterLeft',name:'VIP 3 · Sol loca',x:-16,z:-2.5,yaw:.9},
 {id:'vipOuterRight',name:'VIP 4 · Sağ loca',x:16,z:-2.5,yaw:-.9},
];
export const MAX_VIP=VIP_LOUNGES.length*3;
export function vipPoint(lounge,x,y,z){return [lounge.x+x*Math.cos(lounge.yaw)+z*Math.sin(lounge.yaw),.32+y,lounge.z-x*Math.sin(lounge.yaw)+z*Math.cos(lounge.yaw)];}
export function nearestLounge(position){return VIP_LOUNGES.reduce((best,l)=>Math.hypot(position.x-l.x,position.z-l.z)<Math.hypot(position.x-best.x,position.z-best.z)?l:best);}

export const STAGE_DANCERS=[[-4.1,.64,-5],[-2.05,.64,-4.5],[0,.64,-4.2],[2.05,.64,-4.5],[4.1,.64,-5]];
export const MAX_STAGE_DANCERS=STAGE_DANCERS.length;
