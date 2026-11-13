import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,stat} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {NightStars} from '../src/night-stars.js';
import {eventDecoder} from '../src/live.js';
import {createClubServer} from '../server.js';

const gift=(id,coins,amount=1,giftEventId=id)=>({type:'gift',id,name:id,coins,amount,giftEventId});
test('all finalized gifts rank by total coins, not gift count, role or floor membership',()=>{
 const stars=new NightStars();stars.record('host',gift('A',1,20));stars.record('host',gift('B',30));
 assert.equal(stars.snapshot('host').leader.id,'B');assert.equal(stars.snapshot('host').leader.coins,30);
 stars.record('host',gift('A',15,1,'A2'));assert.equal(stars.snapshot('host').leader.id,'A');
 stars.record('host',{...gift('C',99),type:'giftCue'});stars.record('host',gift('D',undefined));
 assert.equal(stars.snapshot('host').leader.coins,35);
});
test('rose streak starts the role immediately but scores its final total only once, including after restart',()=>{
 const stars=new NightStars(),decode=eventDecoder(),user={id:'a',nickname:'Ada'};
 const packet=repeatEnd=>({type:'WebcastGiftMessage',data:{user,giftId:5655,gift:{type:1,diamondCount:1},repeatCount:8,repeatEnd,groupId:'series-1',common:{msgId:'same'}}});
 const cue=decode(packet(false));assert.equal(cue.type,'giftCue');stars.record('host',cue);assert.equal(stars.snapshot('host').leader,null);
 const completed=decode(packet(true));assert.equal(completed.cued,true);stars.record('host',completed);
 assert.equal(stars.snapshot('host').leader.coins,8);assert.equal(decode(packet(true)),undefined);
 const restored=new NightStars(JSON.parse(JSON.stringify(stars.serialize())));
 restored.record('host',eventDecoder()(packet(true)));assert.equal(restored.snapshot('host').leader.coins,8);
});
test('same nicknames keep separate totals, later chat supplies a photo and ties are stable',()=>{
 const stars=new NightStars();stars.record('host',{...gift('a',10),name:'Same'});stars.record('host',{...gift('b',10),name:'Same'});
 assert.equal(stars.snapshot('host').leader.id,'a');
 stars.record('host',{type:'chat',id:'a',name:'Ada',avatar:'https://example.com/a.jpg'});
 assert.equal(stars.snapshot('host').leader.avatar,'https://example.com/a.jpg');
 stars.record('host',{type:'chat',id:'a',name:'Ada',avatar:'javascript:bad'});assert.equal(stars.snapshot('host').leader.avatar,'https://example.com/a.jpg');
});
test('Türkiye midnight resets the day and different broadcasting accounts never share totals',()=>{
 let now=Date.parse('2026-11-13T20:59:59Z');const stars=new NightStars([],()=>now);
 stars.record('Host',gift('A',40));assert.equal(stars.snapshot('host').day,'2026-11-13');assert.equal(stars.snapshot('other').leader,null);
 now+=1000;assert.equal(stars.snapshot('host').day,'2026-11-14');assert.equal(stars.snapshot('host').leader,null);
 stars.record('host',gift('B',1));assert.equal(stars.snapshot('host').leader.coins,1);
});
test('server exposes and persists the actual gift total without requiring a mapped role',async t=>{
 const dataDir=await mkdtemp(path.join(os.tmpdir(),'ala-stars-'));let feed;
 const options={dataDir,connectLive:opts=>{feed=opts.onEvent;opts.onStatus('live','test');return()=>{};}};
 let app=await createClubServer(options);await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await app.close();await rm(dataDir,{recursive:true,force:true});});
 await app.control({action:'settings',settings:{handle:'testhost'},key:'test-key'});await app.control({action:'connect'});
 feed({...gift('supporter',20,3),giftId:'unmapped',avatar:'https://example.com/portrait.jpg'});
 assert.equal(app.snapshot().players.length,0);assert.equal(app.snapshot().nightStar.leader.coins,60);
 await app.close();app=await createClubServer(options);await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 assert.equal(app.snapshot().nightStar.leader.avatar,'https://example.com/portrait.jpg');
 assert.equal((await stat(path.join(dataDir,'night-stars.json'))).mode&0o777,0o600);
 assert.ok(!(await readFile(path.join(dataDir,'night-stars.json'),'utf8')).includes('test-key'));
});
