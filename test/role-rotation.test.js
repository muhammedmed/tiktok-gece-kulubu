import test from 'node:test';
import assert from 'node:assert/strict';
import {ClubSession} from '../src/session.js';
import {DEFAULT_SETTINGS} from '../public/club-contract.js';
import {MAX_DANCERS,MAX_STAGE_DANCERS,MAX_GUESTS,MAX_WAITING,DANCE_IDLE_MS} from '../public/club-layout.js';

function fixture(defaultGender='male'){
 let now=1000;const s=new ClubSession({...DEFAULT_SETTINGS,handle:'host',defaultGender,chatJoin:true},{},()=>now);s.mode='live';
 return{s,advance:ms=>now+=ms,gift(id,role){s.assign({id,name:id,type:'giftCue',avatar:'https://example.com/'+id+'.png'},role);}};
}
function stage(gift){for(let i=0;i<MAX_STAGE_DANCERS;i++)gift('dancer-'+i,'dancer');}

test('last purchased role is authoritative and previous role slots are freed',()=>{
 const {s,gift}=fixture();
 for(const role of ['saz','vip','saz','dancer','drum','waiter']){
  gift('same',role);assert.equal(s.players.size,1);assert.equal(s.players.get('same').role,role);
 }
 const snapshots=s.events.filter(e=>e.type==='role').map(e=>e.player);
 assert.deepEqual(snapshots.map(p=>p.role),['saz','vip','saz','dancer','drum','waiter']);
 assert.equal(s.slot('vip'),0);assert.equal(s.slot('dancer'),0);
 assert.equal([...s.players.values()].filter(p=>['saz','drum'].includes(p.role)).length,0);
 gift('replacement','saz');assert.equal(s.players.get('same').role,'waiter');
 gift('same','dancer');assert.equal(s.players.get('same').role,'dancer');
 assert.equal(snapshots[0].role,'saz');assert.equal(snapshots[1].role,'vip');
});

test('dancer replacement uses tenure, not chat activity or repeated purchases',()=>{
 const {s,gift,advance}=fixture();stage(gift);
 const oldest=s.players.get('dancer-0'),order=oldest.roleOrder,since=oldest.roleSince;
 advance(30000);s.accept({type:'chat',id:'dancer-0',name:'Changed',text:'buradayım'});gift('dancer-0','dancer');
 assert.equal(s.players.get('dancer-0').roleOrder,order);assert.equal(s.players.get('dancer-0').roleSince,since);
 const firstSnapshot=s.events.find(e=>e.type==='role'&&e.id==='dancer-0').player;
 gift('new','dancer');assert.equal(s.players.get('dancer-0').role,'dance');assert.equal(s.players.get('new').slot,0);
 assert.equal(firstSnapshot.role,'dancer');assert.equal(firstSnapshot.slot,0);
 const dancers=[...s.players.values()].filter(p=>p.role==='dancer');assert.equal(dancers.length,MAX_STAGE_DANCERS);assert.equal(new Set(dancers.map(p=>p.slot)).size,MAX_STAGE_DANCERS);
 gift('newer','dancer');assert.equal(s.players.get('dancer-1').role,'dance');assert.equal(s.players.get('newer').slot,1);
 advance(DANCE_IDLE_MS+1);s.sweepInactive();assert.ok(s.players.has('dancer-0'));assert.ok(s.players.has('dancer-1'));
});

test('an incoming floor guest frees their own floor slot for the displaced performer',()=>{
 const {s,gift}=fixture();for(let i=0;i<MAX_DANCERS;i++)gift('floor-'+i,'dance');stage(gift);
 const formerSlot=s.players.get('floor-17').slot;
 gift('floor-17','dancer');assert.equal(s.players.get('floor-17').role,'dancer');assert.equal(s.players.get('floor-17').slot,0);
 assert.equal(s.players.get('dancer-0').role,'dance');assert.equal(s.players.get('dancer-0').slot,formerSlot);assert.equal(s.waitlist.size,0);
 const floor=[...s.players.values()].filter(p=>p.role==='dance');assert.equal(floor.length,MAX_DANCERS);assert.equal(new Set(floor.map(p=>p.slot)).size,MAX_DANCERS);
});

test('full floor keeps displaced dancer in protected waitlist and restores their identity without a new gift',()=>{
 const {s,gift,advance}=fixture('ask');
 for(let i=0;i<MAX_DANCERS;i++){s.select('floor-'+i,'male');gift('floor-'+i,'dance');}stage(gift);
 const original={...s.players.get('dancer-0')};gift('new','dancer');
 assert.equal(s.players.has('dancer-0'),false);assert.equal(s.players.get('new').role,'dancer');assert.equal(s.waitlist.get('dancer-0').idleProtected,true);
 advance(DANCE_IDLE_MS+1);s.sweepInactive();assert.ok(s.waitlist.has('dancer-0'));
 s.players.delete('floor-0');s.sweepInactive();const returned=s.players.get('dancer-0');
 assert.equal(returned.role,'dance');assert.equal(returned.slot,0);assert.equal(returned.variant,original.variant);assert.equal(returned.gender,'female');assert.equal(returned.avatar,original.avatar);assert.equal(returned.idleProtected,true);assert.equal(s.pending.size,0);assert.equal(s.waitlist.has('dancer-0'),false);
 assert.equal(s.events.findLast(e=>e.type==='role'&&e.id==='dancer-0').automatic,true);
});

test('stage replacement remains possible at total capacity without exceeding it',()=>{
 const {s,gift}=fixture();stage(gift);
 // Exercise the hard guest cap independently of the current room's role mix.
 for(let i=s.players.size;i<MAX_GUESTS;i++)s.players.set('background-'+i,{id:'background-'+i,role:'table',slot:i});
 gift('new','dancer');assert.equal(s.players.size,MAX_GUESTS);assert.equal(s.players.get('new').role,'dancer');assert.equal(s.players.has('dancer-0'),false);assert.ok(s.waitlist.has('dancer-0'));
});

test('paid stage returns are retained even when the ordinary entrance waitlist is full',()=>{
 const {s,gift}=fixture();for(let i=0;i<MAX_DANCERS;i++)gift('floor-'+i,'dance');stage(gift);
 for(let i=0;i<MAX_WAITING;i++)s.assign({id:'waiting-'+i,name:'Waiting'},'dance');assert.equal(s.waitlist.size,MAX_WAITING);
 gift('new','dancer');assert.equal(s.waitlist.size,MAX_WAITING+1);assert.equal(s.waitlist.get('dancer-0').idleProtected,true);assert.equal(s.players.get('new').role,'dancer');
});
