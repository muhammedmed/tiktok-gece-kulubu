import test from 'node:test';import assert from 'node:assert/strict';
import {ClubSession} from '../src/session.js';
import {DEFAULT_SETTINGS} from '../public/club-contract.js';
import {MAX_DANCERS,MAX_VIP,DANCE_IDLE_MS,MAX_WAITING} from '../public/club-layout.js';
function fixture(){let now=1000000;const session=new ClubSession({...DEFAULT_SETTINGS,handle:'host',chatJoin:true}, {},()=>now);session.mode='live';return {s:session,advance:ms=>now+=ms,join(id){session.accept({type:'chat',id:String(id),name:'Viewer '+id,text:'erkek'});}};}
test('84 people fit; overflow waits FIFO, duplicates retain their position, new activity preserves its person',()=>{
 const {s,advance,join}=fixture();for(let i=0;i<MAX_DANCERS;i++)join(i);
 advance(DANCE_IDLE_MS-60000);join('next');join('last');join('next');assert.equal(s.waitlist.size,2);assert.equal(s.players.size,MAX_DANCERS);
 advance(60000);s.accept({type:'chat',id:'0',name:'Viewer 0',text:'buradayım'});
 assert.ok(s.players.has('0'));assert.ok(s.players.has('next'));assert.ok(s.players.has('last'));assert.equal(s.players.get('next').slot,1);assert.equal(s.players.get('last').slot,2);assert.equal(s.waitlist.size,0);
 assert.equal(new Set([...s.players.values()].map(p=>p.slot)).size,s.players.size);
});
test('idle removal uses the 150 second threshold and admits a returning gender command with its profile',()=>{
 const {s,advance}=fixture();s.accept({type:'chat',id:'a',name:'Ada',avatar:'https://example.com/a.jpg',text:'kadın'});
 advance(DANCE_IDLE_MS-1);assert.equal(s.sweepInactive(),false);advance(1);assert.equal(s.sweepInactive(),true);assert.equal(s.players.size,0);
 s.accept({type:'chat',id:'a',name:'Ada',text:'kadın'});assert.equal(s.players.get('a').avatar,'https://example.com/a.jpg');assert.equal(s.players.get('a').gender,'female');
});
test('chat, likes and gifts renew presence; paid roles survive long quiet periods',()=>{
 const {s,advance,join}=fixture();for(const id of ['chat','like','gift','vip','saz','drum','dj','waiter'])join(id);
 for(const role of ['vip','saz','drum','dj','waiter'])s.assign({id:role,name:role},role);
 advance(DANCE_IDLE_MS-10000);for(const type of ['chat','like','gift'])s.accept({type,id:type,name:type,text:'merhaba',giftId:'unmapped'});
 advance(DANCE_IDLE_MS-10000);s.sweepInactive();assert.equal(s.players.size,8);
 advance(11000);s.sweepInactive();assert.equal(s.players.size,5);for(const role of ['vip','saz','drum','dj','waiter'])assert.equal(s.players.get(role).role,role);
});
test('offline time is excluded; preview characters never expire',()=>{
 const {s,advance,join}=fixture();join('a');advance(120000);s.pauseActivity();advance(600000);assert.equal(s.sweepInactive(),false);s.resumeActivity();advance(DANCE_IDLE_MS-120001);assert.equal(s.sweepInactive(),false);advance(1);assert.equal(s.sweepInactive(),true);
 join('b');s.mode='preview';advance(600000);assert.equal(s.sweepInactive(),false);
});
test('queue is bounded and inactive waiters expire rather than join later as ghosts',()=>{
 const {s,advance,join}=fixture();for(let i=0;i<MAX_DANCERS+MAX_WAITING+3;i++)join(i);assert.equal(s.waitlist.size,MAX_WAITING);
 advance(DANCE_IDLE_MS+1);s.sweepInactive();assert.equal(s.players.size,0);assert.equal(s.waitlist.size,0);
});
test('changing a waiting viewer to a paid role removes their floor reservation',()=>{
 const {s,join}=fixture();for(let i=0;i<MAX_DANCERS;i++)join(i);join('later');s.assign({id:'later',name:'Later'},'vip');assert.equal(s.waitlist.has('later'),false);s.players.delete('0');s.sweepInactive();assert.equal(s.players.get('later').role,'vip');
});

test('paid roles stay protected after displacement to the floor; temporary non-role effects do not grant permanence',()=>{
 const {s,join,advance}=fixture();join('first');join('second');join('free');
 s.assign({type:'gift',id:'first',name:'First'},'saz');s.assign({type:'gift',id:'second',name:'Second'},'saz');
 assert.equal(s.players.get('first').role,'dance');assert.equal(s.players.get('first').idleProtected,true);
 s.assign({type:'gift',id:'free',name:'Free'},'money');advance(DANCE_IDLE_MS+1);s.sweepInactive();
 assert.ok(s.players.has('first'));assert.ok(s.players.has('second'));assert.equal(s.players.has('free'),false);
});
test('four VIP lounges reserve twelve distinct seats and reject a thirteenth without overlap',()=>{
 const {s,join,advance}=fixture();assert.equal(MAX_VIP,12);assert.equal(DANCE_IDLE_MS,150000);
 for(let i=0;i<13;i++){join(i);s.assign({type:'gift',id:String(i),name:'VIP '+i},'vip');}
 const vip=[...s.players.values()].filter(p=>p.role==='vip');assert.equal(vip.length,12);assert.equal(new Set(vip.map(p=>p.slot)).size,12);
 advance(1000000);s.sweepInactive();assert.equal(s.players.size,12);assert.equal(s.snapshot().capacity.idleSeconds,150);
});
