import {MAX_DANCERS} from '../public/club-layout.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {ClubSession} from '../src/session.js';import {eventDecoder} from '../src/live.js';import {validateSettings,DEFAULT_SETTINGS,giftRole} from '../public/club-contract.js';
const settings=()=>validateSettings({...DEFAULT_SETTINGS,handle:'host',chatJoin:false,assignments:{dance:{id:'5655',name:'Rose'},saz:{id:'900',name:'Example'},vip:{id:'901',name:'Example VIP'}}});
test('fresh install remembers a chosen character and requires a Rose to enter the floor',()=>{
 const s=new ClubSession(DEFAULT_SETTINGS);assert.equal(s.settings.handle,'');assert.equal(s.settings.autoConnect,false);assert.equal(s.settings.chatJoin,false);assert.equal(giftRole(s.settings,{giftId:'5655'}),'dance');
 s.accept({type:'chat',id:'new',name:'New viewer',text:'kadın'});assert.equal(s.players.size,0);
 s.accept({type:'chat',id:'new',name:'New viewer',text:'katıl'});assert.equal(s.players.size,0);
 s.accept({type:'gift',id:'new',name:'New viewer',giftId:'5655'});assert.equal(s.players.get('new').role,'dance');assert.equal(s.players.get('new').gender,'female');
 s.accept({type:'gift',id:'giver',name:'Giver',giftId:'5655'});assert.equal(s.players.has('giver'),false);assert.equal(s.pending.has('giver'),true);
 s.accept({type:'chat',id:'giver',name:'Giver',text:'erkek'});assert.equal(s.pending.size,0);assert.equal(s.players.get('giver').gender,'male');assert.equal(s.players.get('giver').role,'dance');
 assert.equal(s.events.some(e=>e.role==='money'),false);
});
test('free gender commands enter the floor once and preserve existing paid roles',()=>{
 const s=new ClubSession({...settings(),chatJoin:true});
 for(const [id,text]of [['a','kadın'],['b','ERKEK']])s.accept({type:'chat',id,name:id,text});
 assert.equal(s.players.get('a').gender,'female');assert.equal(s.players.get('b').gender,'male');assert.equal(s.players.size,2);
 const slot=s.players.get('a').slot,revision=s.players.get('a').revision;
 s.accept({type:'chat',id:'a',name:'a',text:'kadın'});assert.equal(s.players.get('a').slot,slot);assert.equal(s.players.get('a').revision,revision);
 s.assign({id:'a',name:'a'},'vip');s.accept({type:'chat',id:'a',name:'a',text:'erkek'});assert.equal(s.players.get('a').role,'vip');
 s.assign({id:'pending',name:'pending'},'saz');s.accept({type:'chat',id:'pending',name:'pending',text:'erkek'});assert.equal(s.players.get('pending').role,'saz');
});
test('rose money effect needs no character, creates no dancer and deduplicates a gift streak',()=>{
 const s=new ClubSession(validateSettings({...settings(),chatJoin:true,assignments:{money:{id:'5655',name:'Gül'}}})),decode=eventDecoder(e=>!!giftRole(s.settings,e));
 const packet={type:'WebcastGiftMessage',data:{user:{id:'rose-sender',nickname:'Ada'},giftId:'5655',gift:{type:1},groupId:'rose-series'}};
 for(const repeatEnd of [0,0,1,1]){const e=decode({...packet,data:{...packet.data,repeatEnd}});if(e)s.accept(e);}
 assert.equal(s.players.size,0);assert.equal(s.pending.size,0);assert.equal(s.events.filter(e=>e.type==='effect'&&e.role==='money').length,1);
});
test('portraits from chat survive gifts without photos and update the correct viewer speech bubble',()=>{
 const s=new ClubSession(settings()),decode=eventDecoder();
 const chat=(id,text,avatar)=>s.accept(decode({type:'WebcastChatMessage',data:{user:{id,nickname:'Same name',...(avatar?{avatarThumb:{urlList:[avatar]}}:{})},content:text}}));
 chat('a','kadın','https://example.com/a.jpg');
 s.accept({type:'gift',id:'a',name:'Same name',giftId:'5655'});
 assert.equal(s.players.get('a').avatar,'https://example.com/a.jpg');
 s.accept({type:'gift',id:'b',name:'Same name',giftId:'5655'});chat('b','erkek','https://example.com/b.jpg');
 assert.equal(s.players.get('b').avatar,'https://example.com/b.jpg');
 const now=Date.now();chat('a','Merhaba <b>herkese</b>','https://example.com/a-new.jpg');
 assert.equal(s.players.get('a').avatar,'https://example.com/a-new.jpg');assert.equal(s.players.get('a').chat.text,'Merhaba <b>herkese</b>');
 assert.ok(s.players.get('a').chat.until>=now+6000);assert.equal(s.players.get('b').chat,undefined);
 chat('a','İyi eğlenceler');assert.equal(s.players.get('a').avatar,'https://example.com/a-new.jpg');assert.equal(s.players.get('a').chat.text,'İyi eğlenceler');
});
test('gift before character selection is held then assigned to the correct stable viewer ID',()=>{const s=new ClubSession(settings());s.accept({type:'gift',id:'1',name:'Same',giftId:'5655'});assert.equal(s.players.size,0);assert.equal(s.pending.size,1);s.accept({type:'chat',id:'2',name:'Same',text:'erkek'});assert.equal(s.players.size,0);s.accept({type:'chat',id:'1',name:'Same',text:'KADIN'});assert.equal(s.players.get('1').gender,'female');assert.equal(s.players.get('1').role,'dance');assert.equal(s.pending.size,0);s.accept({type:'chat',id:'1',name:'Same',text:'erkek'});assert.equal(s.players.get('1').gender,'male');assert.equal(s.players.size,1);});
test('streak preview activates immediately once, completion and reconnect duplicate do not replay',()=>{const s=new ClubSession({...settings(),defaultGender:'female'}),decode=eventDecoder(e=>!!giftRole(s.settings,e));const packet={type:'WebcastGiftMessage',data:{user:{id:'a',nickname:'Ada'},giftId:'900',gift:{type:1},groupId:'88',repeatCount:1,repeatEnd:0}};for(const end of [0,0,1,1,0]){const e=decode({...packet,data:{...packet.data,repeatEnd:end}});if(e)s.accept(e);}assert.equal(s.players.get('a').role,'saz');assert.equal(s.events.filter(e=>e.type==='role').length,1);});
test('exclusive musician role displaces previous viewer without losing identity or creating duplicates',()=>{const s=new ClubSession({...settings(),defaultGender:'male'});for(const id of ['a','b'])s.assign({id,name:id},'saz');assert.equal(s.players.get('a').role,'dance');assert.equal(s.players.get('b').role,'saz');const old=s.players.get('b').revision;s.assign({id:'b',name:'Bee'},'saz');assert.equal(s.players.get('b').revision,old);assert.equal(s.players.size,2);});
test('gift mapping rejects duplicate IDs and never matches just coin price',()=>{assert.equal(giftRole(settings(),{giftId:'different',coins:1}),null);assert.throws(()=>validateSettings({...settings(),assignments:{dance:{id:'1'},vip:{id:'1'}}}));assert.throws(()=>validateSettings({...settings(),assignments:{dance:{id:'https://bad'}}}));});
test('character choices are account-scoped and free chat join is opt-in',()=>{const prefs={},s=new ClubSession(settings(),prefs);s.accept({type:'chat',id:'1',name:'Ada',text:'kadın'});s.accept({type:'chat',id:'1',name:'Ada',text:'katıl'});assert.equal(s.players.size,0);const other=new ClubSession({...settings(),handle:'another'},prefs);other.assign({id:'1',name:'Ada'},'dance');assert.equal(other.players.size,0);s.settings.chatJoin=true;s.accept({type:'chat',id:'1',name:'Ada',text:'katıl'});assert.equal(s.players.size,1);});
test('every floor reservation is distinct; overflow is reported rather than overlapping',()=>{const s=new ClubSession({...settings(),defaultGender:'male'});for(let i=0;i<MAX_DANCERS+1;i++)s.assign({id:String(i),name:'Guest '+i},'dance');assert.equal(s.players.size,MAX_DANCERS);assert.equal(new Set([...s.players.values()].map(p=>p.slot)).size,MAX_DANCERS);assert.match(s.notices[0].text,/dolu/);assert.equal(s.waitlist.size,1);});
test('end-night gift announces once without removing viewers or requiring character selection',()=>{
 const s=new ClubSession(validateSettings({...settings(),assignments:{...settings().assignments,endnight:{id:'7168',name:'Money Gun'}}}));s.mode='live';s.select('dancer','female');s.assign({id:'dancer',name:'Ada'},'dance');
 const before=JSON.stringify([...s.players]),decode=eventDecoder(e=>!!giftRole(s.settings,e));
 const packet={type:'WebcastGiftMessage',data:{msgId:'ending',user:{id:'sender',nickname:'Deniz'},giftId:'7168',gift:{type:1},groupId:'end-series'}};
 for(const repeatEnd of [0,0,1,1]){const e=decode({...packet,data:{...packet.data,repeatEnd}});if(e)s.accept(e);}
 assert.deepEqual(s.events.filter(e=>e.role==='endnight').map(({type,name})=>({type,name})),[{type:'effect',name:'Deniz'}]);
 assert.equal(JSON.stringify([...s.players]),before);assert.equal(s.pending.size,0);assert.equal(s.mode,'live');
});
