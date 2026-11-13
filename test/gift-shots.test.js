import test from 'node:test';
import assert from 'node:assert/strict';
import {GIFT_SHOTS,giftShot,roleEventPlayer} from '../public/gift-shots.js';
import {ShotQueue} from '../public/director.js';

const durations={waiter:6,saz:8,drum:8,vip:8,dj:8,dancer:15,hype:18,money:6,solo:12,confetti:6,dance:6};
test('every gift gets its requested fixed protected presentation duration',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(GIFT_SHOTS).map(([role,p])=>[role,p.duration])),durations);
 for(const [role,duration] of Object.entries(durations)){
  const event=giftShot({seq:role,role});assert.equal(event.duration,duration);assert.equal(event.kind,role);assert.equal(event.protected,true);assert.equal(event.locked,true);assert.equal(event.fixedDuration,true);assert.equal(event.immediate,true);
 }
 assert.throws(()=>giftShot({role:'missing'}),/Unknown gift role/);
});
test('distinct gifts from the same viewer retain individual keys and run consecutively for their complete durations',()=>{
 const q=new ShotQueue(),started=[],ended=[];
 for(let i=0;i<3;i++)q.push(giftShot({seq:i,id:'same-viewer',role:'money'},{onStart:t=>started.push([i,t]),onRelease:()=>ended.push(i)}),i);
 assert.equal(q.current.key,'gift:0');assert.deepEqual(q.items.map(e=>e.key),['gift:1','gift:2']);
 assert.equal(q.tick(5.99).key,'gift:0');q.tick(6);q.tick(6.75);assert.equal(q.until,12.75);q.tick(12.75);q.tick(13.5);assert.equal(q.until,19.5);q.tick(19.5);
 assert.deepEqual(started,[[0,0],[1,6.75],[2,13.5]]);assert.deepEqual(ended,[0,1,2]);assert.equal(q.current,null);assert.equal(q.items.length,0);
 const a=giftShot({role:'saz',id:'same-viewer'}),b=giftShot({role:'saz',id:'same-viewer'});assert.notEqual(a.key,b.key);
});
test('role snapshots preserve all intermediate roles when one viewer changes role several times in a packet',()=>{
 const player={id:'ada',name:'Ada',role:'dj',revision:3,slot:0,chat:{text:'son'}};
 const first={seq:1,id:'ada',role:'vip',player:{...player,role:'vip',revision:1,slot:5,chat:{text:'önce'}}};
 const second={seq:2,id:'ada',role:'dancer',player:{...player,role:'dancer',revision:2,slot:2}};
 const snapshots=[first,second].map(e=>roleEventPlayer(e,[player]));
 assert.deepEqual(snapshots.map(p=>[p.role,p.revision,p.slot]),[['vip',1,5],['dancer',2,2]]);
 snapshots[0].chat.text='local';assert.equal(first.player.chat.text,'önce');assert.equal(player.chat.text,'son');assert.equal(player.role,'dj');
 assert.equal(roleEventPlayer({id:'missing',role:'saz'},[player]),null);
 assert.equal(roleEventPlayer({id:'ada',role:'saz'},[player]).role,'saz');
});
test('dancer presentation holds for all 15 seconds despite chat and higher-priority gifts',()=>{
 const q=new ShotQueue(),person={name:'Ada'},dancer=giftShot({role:'dancer',seq:50},{person});
 q.push(dancer,100);q.push({key:'chat',person,kind:'chat',priority:99,duration:4,immediate:true},105);
 q.push(giftShot({role:'hype',seq:51}),108);
 for(const t of [105,110,114.999])assert.equal(q.tick(t),dancer);
 assert.equal(q.tick(115),null);assert.equal(q.tick(115.75).kind,'hype');
});
