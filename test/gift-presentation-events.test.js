import test from 'node:test';
import assert from 'node:assert/strict';
import {ClubSession} from '../src/session.js';
import {DEFAULT_SETTINGS} from '../public/club-contract.js';

const createSession=()=>new ClubSession({...DEFAULT_SETTINGS,handle:'host',defaultGender:'male',chatJoin:true});

test('rapid role purchases retain independent role and appearance snapshots',()=>{
 const s=createSession();
 s.assign({type:'giftCue',id:'a',name:'Ali',avatar:'https://example.com/first.png'},'saz');
 s.accept({type:'chat',id:'a',name:'Ali',text:'Merhaba'});
 s.assign({type:'gift',id:'a',name:'Ali',avatar:'https://example.com/second.png'},'drum');
 s.assign({type:'gift',id:'a',name:'Ali'},'dancer');
 const events=s.events.filter(e=>e.type==='role');
 assert.deepEqual(events.map(e=>[e.role,e.player.role,e.player.gender,e.paid]),[
  ['saz','saz','male',true],['drum','drum','male',true],['dancer','dancer','female',true],
 ]);
 assert.equal(new Set(events.map(e=>e.seq)).size,3);
 assert.equal(events[0].player.avatar,'https://example.com/first.png');
 assert.equal(events[1].player.avatar,'https://example.com/second.png');
 s.accept({type:'chat',id:'a',name:'Yeni ad',avatar:'https://example.com/latest.png',text:'Yeni mesaj'});
 s.players.get('a').chat.text='Daha sonra';
 s.select('a','male');
 assert.equal(events[0].player.name,'Ali');
 assert.equal(events[1].player.chat.text,'Merhaba');
 assert.equal(events[2].player.gender,'female');
 assert.equal(events[2].player.chat.text,'Merhaba');
 assert.ok(Object.isFrozen(events[2].player));
 assert.ok(Object.isFrozen(events[2].player.chat));
});

test('exclusive role replacement and repeated gifts do not rewrite earlier presentations',()=>{
 const s=createSession();
 s.assign({type:'giftCue',id:'a',name:'Ali'},'saz');
 const first=s.events.at(-1);
 s.assign({type:'giftCue',id:'a',name:'Ali'},'saz');
 const repeated=s.events.at(-1);
 s.assign({type:'giftCue',id:'b',name:'Bora'},'saz');
 assert.equal(s.players.get('a').role,'dance');
 assert.equal(first.player.role,'saz');
 assert.equal(repeated.player.role,'saz');
 assert.equal(repeated.same,true);
 assert.notEqual(first.seq,repeated.seq);
 assert.notEqual(first.player,repeated.player);
});

test('free chat joins remain distinguishable from paid entrances',()=>{
 const s=createSession();
 s.accept({type:'chat',id:'free',name:'Free',text:'erkek'});
 assert.equal(s.events.find(e=>e.type==='role').paid,false);
 s.assign({type:'giftCue',id:'paid',name:'Paid'},'dance');
 assert.equal(s.events.at(-1).paid,true);
 s.assign({id:'panel',name:'Panel'},'waiter');
 assert.equal(s.events.at(-1).paid,true);
});

test('solo presentations retain the participant snapshot for existing and newly joined viewers',()=>{
 for(const existing of [false,true]){
  const s=createSession();
  if(existing)s.assign({id:'a',name:'Ali'},'vip');
  s.assign({type:'giftCue',id:'a',name:'Ali'},'solo');
  const solo=s.events.at(-1);
  assert.equal(solo.type,'effect');assert.equal(solo.role,'solo');assert.equal(solo.paid,true);
  assert.equal(solo.player.role,existing?'vip':'dance');
  assert.equal(solo.player.id,'a');
  s.assign({type:'gift',id:'a',name:'Changed'},'dancer');
  assert.equal(solo.player.name,'Ali');assert.equal(solo.player.gender,'male');
 }
});

test('all role gifts before character selection survive the single pending-choice row',()=>{
 const s=new ClubSession({...DEFAULT_SETTINGS,handle:'host',chatJoin:true});
 for(const role of ['saz','solo','drum','vip','waiter','saz'])s.assign({type:'giftCue',id:'a',name:'Ali'},role);
 assert.equal(s.players.size,0);assert.equal(s.pending.size,1);
 assert.deepEqual(s.snapshot().pending,[{id:'a',name:'Ali'}]);
 s.accept({type:'chat',id:'a',name:'Ali',text:'erkek'});
 const presentations=s.events.filter(e=>e.type==='role'||e.type==='effect');
 assert.deepEqual(presentations.map(e=>e.role),['saz','solo','drum','vip','waiter','saz']);
 assert.ok(presentations.every(e=>e.paid&&e.player.gender==='male'));
 assert.deepEqual(presentations.map(e=>e.player.role),['saz','saz','drum','vip','waiter','saz']);
 assert.equal(s.pending.size,0);assert.equal(s.players.get('a').role,'saz');
});

test('one hundred pre-selection role requests retain their order and individual snapshots',()=>{
 const s=new ClubSession({...DEFAULT_SETTINGS,handle:'host'}),roles=['saz','drum','dj','waiter','vip'];
 for(let i=0;i<100;i++)s.assign({type:'giftCue',id:'a',name:'Ali '+i},roles[i%roles.length]);
 assert.equal(s.pending.get('a').requests.length,100);
 s.select('a','female');
 const presentations=s.events.filter(e=>e.type==='role');
 assert.equal(presentations.length,100);
 assert.deepEqual(presentations.map(e=>e.role),Array.from({length:100},(_,i)=>roles[i%roles.length]));
 assert.deepEqual(presentations.map(e=>e.player.name),Array.from({length:100},(_,i)=>'Ali '+i));
 assert.equal(new Set(presentations.map(e=>e.seq)).size,100);
});
