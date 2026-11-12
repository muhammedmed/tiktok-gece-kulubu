import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createClubServer} from '../server.js';
import {ClubSession} from '../src/session.js';
import {eventDecoder} from '../src/live.js';
import {DEFAULT_SETTINGS,giftRole,validateSettings} from '../public/club-contract.js';

// Synthetic fixtures only: the broadcaster chooses the real gift in the studio.
const HYPE_GIFT_ID='99999999999999999999',PAID_GIFT_ID='99999999999999999998';
const hypeAssignment={id:HYPE_GIFT_ID,name:'Coştur test fixture'};
const giftPacket=(id,giftId,extra={})=>({type:'WebcastGiftMessage',data:{user:{id,nickname:id},giftId,gift:{type:0},...extra}});

test('server routes the configured Coştur gift immediately without character selection and deduplicates its streak',async t=>{
 const dataDir=await mkdtemp(path.join(os.tmpdir(),'ala-hype-'));let feed;
 const app=await createClubServer({dataDir,connectLive:options=>{
  const decode=eventDecoder(options.canCue);
  feed=packet=>{const event=decode(packet);if(event)options.onEvent(event);};
  options.onStatus('live','Test transport');return()=>{};
 }});
 t.after(async()=>{await app.close();await rm(dataDir,{recursive:true,force:true});});
 // Exercise server controls and its live callback without opening a network port.
 await app.control({action:'settings',key:'local-test-key',settings:{handle:'hype_test',defaultGender:'ask',assignments:{hype:hypeAssignment}}});
 await app.control({action:'connect'});
 const packet=giftPacket('new-viewer',HYPE_GIFT_ID,{gift:{type:1},groupId:'hype-series',repeatCount:1});
 feed({...packet,data:{...packet.data,repeatEnd:0}});
 assert.deepEqual(app.snapshot().events.filter(e=>e.type==='effect').map(({id,role})=>({id,role})),[{id:'new-viewer',role:'hype'}]);
 for(const repeatEnd of [0,1,1,0])feed({...packet,data:{...packet.data,repeatEnd}});
 const state=app.snapshot();
 assert.equal(state.events.filter(e=>e.type==='effect'&&e.role==='hype').length,1);
 assert.deepEqual(state.players,[]);assert.deepEqual(state.pending,[]);assert.deepEqual(state.waiting,[]);
 assert.equal(state.events.some(e=>e.type==='choose'||e.type==='role'),false);
 assert.equal(state.notices[0].text,'new-viewer · Coştur');
 assert.equal(state.mode,'live');
 feed(giftPacket('new-viewer',HYPE_GIFT_ID,{common:{msgId:'next-hype-gift'}}));
 assert.equal(app.snapshot().events.filter(e=>e.type==='effect'&&e.role==='hype').length,2);
});

test('a mapped Coştur gift preserves each existing paid role, slot and character',()=>{
 for(const role of ['dance','vip','dancer','saz','drum','dj','waiter']){
  const settings=validateSettings({...DEFAULT_SETTINGS,handle:'hype_test',defaultGender:'ask',assignments:{hype:hypeAssignment,[role]:{id:PAID_GIFT_ID,name:'Paid role test fixture'}}});
  const session=new ClubSession(settings,{},()=>1000000),decode=eventDecoder(e=>!!giftRole(session.settings,e));
  const feed=packet=>{const event=decode(packet);if(event)session.accept(event);};
  session.mode='live';
  feed({type:'WebcastChatMessage',data:{user:{id:'paid-viewer',nickname:'paid-viewer'},content:'erkek'}});
  feed(giftPacket('paid-viewer',PAID_GIFT_ID,{common:{msgId:'paid-role-gift'}}));
  const before=structuredClone(session.players.get('paid-viewer'));
  assert.equal(before.role,role);assert.equal(before.idleProtected,true);
  const previousRoleEvents=session.events.filter(e=>e.type==='role').length;
  feed(giftPacket('paid-viewer',HYPE_GIFT_ID,{common:{msgId:'hype-gift'}}));
  assert.deepEqual(session.players.get('paid-viewer'),before,role);
  assert.equal(session.players.size,1);assert.equal(session.pending.size,0);assert.equal(session.waitlist.size,0);
  assert.equal(session.events.filter(e=>e.type==='role').length,previousRoleEvents);
  assert.deepEqual(session.events.filter(e=>e.type==='effect').map(({id,role})=>({id,role})),[{id:'paid-viewer',role:'hype'}]);
 }
});
