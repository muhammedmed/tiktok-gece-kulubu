import test from 'node:test';import assert from 'node:assert/strict';
import {ClubSession} from '../src/session.js';import {DEFAULT_SETTINGS,validateSettings,giftRole} from '../public/club-contract.js';
import {eventDecoder} from '../src/live.js';
import {STAGE_DANCERS,MAX_STAGE_DANCERS} from '../public/club-layout.js';import {floorHeight} from '../public/spatial.js';
import {dancerPose,DANCER_FIGURES} from '../public/dancer-motion.js';
test('five paid dancers occupy distinct stage places; the next purchase rotates the oldest performer to the floor',()=>{
 let now=1000;const s=new ClubSession({...DEFAULT_SETTINGS,handle:'host'}, {},()=>now);s.mode='live';
 for(let i=0;i<5;i++)s.assign({id:String(i),name:'Dancer '+i,type:'gift'},'dancer');
 assert.equal(s.players.size,5);assert.equal(s.pending.size,0);assert.deepEqual([...s.players.values()].map(p=>p.slot),[0,1,2,3,4]);
 for(const p of s.players.values()){assert.equal(p.gender,'female');assert.equal(p.idleProtected,true);}
 now+=1000000;s.sweepInactive();assert.equal(s.players.size,5);
 s.select('0','male');assert.equal(s.players.get('0').gender,'female');
 s.assign({id:'5',name:'Dancer 5',type:'gift'},'dancer');assert.equal(s.players.get('5').slot,0);
 assert.equal(s.players.get('0').role,'dance');assert.equal(s.players.get('0').gender,'male');assert.equal(s.players.get('0').idleProtected,true);assert.equal(s.players.size,6);
});
test('dancer gift remains unassigned by default and streaks allocate exactly one character',()=>{
 assert.equal(DEFAULT_SETTINGS.assignments.dancer,undefined);const settings=validateSettings({...DEFAULT_SETTINGS,handle:'host',assignments:{dancer:{id:'999'}}}),s=new ClubSession(settings),decode=eventDecoder(e=>!!giftRole(settings,e));
 for(const repeatEnd of [0,0,1,1]){const e=decode({type:'WebcastGiftMessage',data:{user:{id:'a',nickname:'Ada'},giftId:'999',gift:{type:1},groupId:'series',repeatEnd}});if(e)s.accept(e);}
 assert.equal(s.players.size,1);assert.equal(s.events.filter(e=>e.type==='role').length,1);
});
test('five performers fit on the raised stage away from the musicians and each other',()=>{
 assert.equal(MAX_STAGE_DANCERS,5);for(const [x,y,z]of STAGE_DANCERS){assert.equal(floorHeight(x,z),y);for(const [mx,mz]of [[-3.9,-7],[3.9,-7],[0,-8.65]])assert.ok(Math.hypot(x-mx,z-mz)>1.9);}
 for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)assert.ok(Math.hypot(STAGE_DANCERS[i][0]-STAGE_DANCERS[j][0],STAGE_DANCERS[i][2]-STAGE_DANCERS[j][2])>1.9);
});
test('oriental choreography cycles through ten figures with grounded and finite targets',()=>{
 assert.equal(DANCER_FIGURES.length,10);
 const figures=new Set();for(let t=0;t<50;t+=.025){const p=dancerPose(t,0);figures.add(p.phrase);for(const a of Object.values(p.hands))assert.ok(a.every(Number.isFinite));assert.ok(p.feet.left[1]>=0&&p.feet.right[1]>=0);assert.ok(Math.abs(p.body.x)<.06);}
 assert.equal(figures.size,DANCER_FIGURES.length);
});

test('figure transitions keep hands and elbows continuous rather than snapping to new poses',()=>{for(let beat=8;beat<=64;beat+=8){const a=dancerPose((beat-1e-5)*60/112),b=dancerPose((beat+1e-5)*60/112);for(const key of ['left','right'])for(const part of ['hands','elbows'])assert.ok(Math.hypot(...a[part][key].map((n,i)=>n-b[part][key][i]))<.001);assert.ok(Math.abs(Math.atan2(Math.sin(a.turn-b.turn),Math.cos(a.turn-b.turn)))<.001);}});

test('every stage style settles both feet before changing figures, with no transition jumps',()=>{
 for(let style=0;style<5;style++){
  for(let beat=8;beat<=160;beat+=8){
   const t=(beat-style*1.31)*60/112,a=dancerPose(t-1e-6,style),b=dancerPose(t+1e-6,style);
   for(const side of ['left','right']){
    assert.ok(Math.hypot(...a.feet[side].map((n,i)=>n-b.feet[side][i]))<.00001,'feet must not slide or teleport at a figure boundary');
    assert.ok(a.feet[side][1]<.00001&&b.feet[side][1]<.00001);
   }
  }
  for(let t=0;t<50;t+=.017){const p=dancerPose(t,style);assert.ok(Math.min(p.feet.left[1],p.feet.right[1])<1e-6,'at least one support foot must stay planted');}
 }
});
