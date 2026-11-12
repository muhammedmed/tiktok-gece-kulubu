import test from 'node:test';
import assert from 'node:assert/strict';
import {ClubSession} from '../src/session.js';
import {eventDecoder} from '../src/live.js';
import {DEFAULT_SETTINGS,validateSettings} from '../public/club-contract.js';
import {MAX_DANCERS,DANCE_IDLE_MS} from '../public/club-layout.js';
const chat=(s,id,text)=>s.accept({type:'chat',id,name:'Same name',text});
const likes=(s,id,amount)=>s.accept({type:'like',id,name:'Same name',amount});
const fresh=extra=>new ClubSession({...DEFAULT_SETTINGS,handle:'host',...extra});

test('200 received likes are counted per ID, even for identical names, and trigger only once',()=>{
 const s=fresh();chat(s,'a','kadın');chat(s,'b','erkek');
 likes(s,'a',100);likes(s,'b',100);likes(s,'a',99);
 assert.equal(s.players.size,0);assert.deepEqual(s.snapshot().likeProgress.map(p=>[p.id,p.count]),[['a',199],['b',100]]);
 likes(s,'a',1);assert.equal(s.players.get('a').gender,'female');assert.equal(s.players.get('a').idleProtected,false);assert.equal(s.players.has('b'),false);
 const revision=s.players.get('a').revision,events=s.events.length;likes(s,'a',500);assert.equal(s.players.get('a').revision,revision);assert.equal(s.events.length,events);
 likes(s,'b',100);assert.equal(s.players.get('b').gender,'male');assert.equal(s.likeProgress.size,0);
});

test('likes before character choice reserve one entry; another viewer cannot claim it',()=>{
 const s=fresh();s.accept({type:'like',id:'a',name:'Ada',amount:200,avatar:'https://example.com/ada.jpg'});likes(s,'a',200);
 assert.equal(s.players.size,0);assert.equal(s.pending.get('a').requests.length,1);assert.equal(s.events.at(-1).reason,'likes');
 chat(s,'b','erkek');assert.equal(s.players.size,0);chat(s,'a','kadın');
 assert.equal(s.players.get('a').avatar,'https://example.com/ada.jpg');assert.equal(s.players.get('a').gender,'female');assert.equal(s.pending.size,0);
});

test('decoder sums numeric like batches, ignores room totals and deduplicates message IDs',()=>{
 const s=fresh(),decode=eventDecoder();chat(s,'a','erkek');
 const packet=(msgId,fields)=>({type:'WebcastLikeMessage',data:{user:{id:'a',nickname:'Ada'},common:{msgId},total:999999,totalLikeCount:999999,...fields}});
 const feed=p=>{const e=decode(p);if(e)s.accept(e);};
 feed(packet('1',{count:'125'}));feed(packet('1',{count:'125'}));assert.equal(s.likeProgress.get('a').count,125);
 for(const [index,count]of [undefined,0,-1,1.5,'oops',true,[],Number.MAX_SAFE_INTEGER+1].entries())feed(packet('bad'+index,{count}));
 assert.equal(s.likeProgress.get('a').count,125);feed(packet('2',{likeCount:'75'}));assert.equal(s.players.get('a').role,'dance');
});

test('Rose still enters immediately and likes do not replace VIP or pending paid roles',()=>{
 const s=fresh({assignments:{...DEFAULT_SETTINGS.assignments,vip:{id:'99',name:'VIP'}}});
 chat(s,'rose','kadın');likes(s,'rose',50);s.accept({type:'gift',id:'rose',name:'Rose',giftId:'5655'});
 assert.equal(s.players.get('rose').idleProtected,true);assert.equal(s.likeProgress.has('rose'),false);
 chat(s,'vip','erkek');s.accept({type:'gift',id:'vip',name:'VIP',giftId:'99'});likes(s,'vip',200);assert.equal(s.players.get('vip').role,'vip');
 s.accept({type:'gift',id:'pending',name:'Pending',giftId:'99'});likes(s,'pending',200);chat(s,'pending','kadın');assert.equal(s.players.get('pending').role,'vip');
 assert.equal(s.events.filter(e=>e.type==='role'&&e.id==='vip').length,1);
});

test('a like entry waits for a free floor slot, stays unique and follows ordinary idle expiry',()=>{
 let now=1000000;const s=new ClubSession({...DEFAULT_SETTINGS,defaultGender:'female'}, {},()=>now);s.mode='live';
 for(let i=0;i<MAX_DANCERS;i++)s.assign({id:String(i),name:String(i),type:'gift'},'dance');
 likes(s,'late',200);likes(s,'late',200);assert.equal(s.waitlist.size,1);assert.equal(s.players.size,MAX_DANCERS);
 s.players.delete('0');s.sweepInactive();assert.equal(s.players.get('late').role,'dance');assert.equal(s.players.get('late').idleProtected,false);
 now+=DANCE_IDLE_MS;s.sweepInactive();assert.equal(s.players.has('late'),false);assert.equal(s.players.size,MAX_DANCERS-1);
 likes(s,'late',199);assert.equal(s.players.has('late'),false);likes(s,'late',1);assert.equal(s.players.get('late').role,'dance');
});

test('like target is configurable or disabled and a reset starts new progress',()=>{
 for(const value of [-1,1.5,'bad',10001])assert.throws(()=>validateSettings({likeJoinCount:value}));
 assert.equal(validateSettings({likeJoinCount:'200'}).likeJoinCount,200);assert.equal(validateSettings({likeJoinCount:0}).likeJoinCount,0);
 const s=fresh({likeJoinCount:0});chat(s,'a','erkek');likes(s,'a',200);assert.equal(s.likeProgress.size,0);assert.equal(s.players.size,0);
 s.settings.likeJoinCount=300;likes(s,'a',299);assert.equal(s.players.size,0);s.reset();likes(s,'a',1);assert.equal(s.players.size,0);assert.equal(s.likeProgress.get('a').count,1);
});
