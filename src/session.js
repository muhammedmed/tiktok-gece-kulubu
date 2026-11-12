import {randomUUID} from 'node:crypto';
import {characterCommand} from '../public/viewer-preferences.js';
import {ROLE_LABELS,giftRole} from '../public/club-contract.js';
import {MAX_GUESTS,MAX_DANCERS,MAX_VIP,MAX_STAGE_DANCERS,DANCE_IDLE_MS,MAX_WAITING} from '../public/club-layout.js';
// A queued presentation must keep the role and appearance bought by this event,
// even if the same viewer buys another role before the camera reaches it.
function presentationPlayer(player){return player?Object.freeze({...player,...(player.chat?{chat:Object.freeze({...player.chat})}:{})}):undefined;}
export class ClubSession{
 constructor(settings,preferences={},now=Date.now){this.settings=settings;this.preferences=preferences;this.now=now;this.reset();}
 reset(){this.epoch=randomUUID();this.players=new Map();this.pending=new Map();this.profiles=new Map();this.waitlist=new Map();this.activityPausedAt=null;this.events=[];this.sequence=0;this.roleSequence=0;this.variant=0;this.mode='preview';this.notices=[];}
 touch(id){for(const records of [this.players,this.waitlist]){const p=records.get(String(id));if(p)p.lastActiveAt=this.now();}}
 pauseActivity(){this.activityPausedAt??=this.now();}
 resumeActivity(){if(this.activityPausedAt===null)return;const elapsed=Math.max(0,this.now()-this.activityPausedAt);for(const records of [this.players,this.waitlist])for(const p of records.values())p.lastActiveAt=Math.min(this.now(),(p.lastActiveAt??this.activityPausedAt)+elapsed);this.activityPausedAt=null;}
 queueDance(event){const id=String(event.id);if(!this.waitlist.has(id)&&this.waitlist.size>=MAX_WAITING&&!event.returningFromStage){this.note('Pist ve bekleme sırası dolu.');return;}const previous=this.waitlist.get(id);this.waitlist.set(id,{...previous,...event,id,queuedAt:previous?.queuedAt??this.now(),lastActiveAt:this.now()});this.emit('queued',{id,name:event.name,position:[...this.waitlist.keys()].indexOf(id)+1});this.note(event.name+' · Pist dolu; boşalan yere otomatik alınacak.');}
 sweepInactive(){
  if(this.mode==='preview'||this.activityPausedAt!==null)return false;
  let changed=false;const cutoff=this.now()-DANCE_IDLE_MS;
  for(const [id,p]of this.players)if(p.role==='dance'&&!p.idleProtected&&(p.lastActiveAt??this.now())<=cutoff){this.players.delete(id);this.emit('remove',{id,reason:'inactive'});this.note(p.name+' · 150 saniye etkileşim olmadığı için pistte yer açıldı.');changed=true;}
  for(const [id,p]of this.waitlist)if(!p.idleProtected&&p.lastActiveAt<=cutoff){this.waitlist.delete(id);changed=true;}
  for(const [id,p]of this.waitlist){if(this.slot('dance',id)===undefined||this.players.size>=MAX_GUESTS)break;this.waitlist.delete(id);this.assign(p,'dance');changed=true;}
  return changed;
 }
 note(text){this.notices.unshift({text,at:Date.now()});this.notices.length=Math.min(40,this.notices.length);}
 emit(type,fields={}){const e={seq:++this.sequence,at:Date.now(),type,...fields};this.events.push(e);if(this.events.length>100)this.events.shift();return e;}
 preferenceKey(id){return this.settings.handle.toLowerCase()+':'+id;}
 select(id,gender){if(!id||String(id).length>128)throw Error('Kullanıcı kimliği gerekli.');if(!['female','male'].includes(gender))throw Error('Karakter seçimi geçersiz.');const prefKey=this.preferenceKey(id);if(!Object.hasOwn(this.preferences,prefKey)&&Object.keys(this.preferences).length>=10000)delete this.preferences[Object.keys(this.preferences)[0]];this.preferences[prefKey]=gender;const pending=this.pending.get(id);this.pending.delete(id);const p=this.players.get(id);if(p){if(p.role!=='dancer')p.gender=gender;this.emit('appearance',{id});}if(pending)for(const request of pending.requests||[pending])this.assign(request,request.role);}
 slot(role,except){const size=role==='dance'?MAX_DANCERS:role==='vip'?MAX_VIP:role==='dancer'?MAX_STAGE_DANCERS:20,used=new Set([...this.players.values()].filter(p=>p.id!==except&&p.role===role).map(p=>p.slot));return Array.from({length:size},(_,i)=>i).find(i=>!used.has(i));}
 returnStageDancer(old,incoming){
  // An incoming floor guest gives their old place directly to the displaced
  // performer. Otherwise keep the existing floor and guest limits intact.
  const floorSlot=incoming?.role==='dance'?incoming.slot:this.slot('dance',old.id);
  const gender=this.preferences[this.preferenceKey(old.id)]||(['female','male'].includes(this.settings.defaultGender)?this.settings.defaultGender:old.gender);
  if(floorSlot!==undefined&&(incoming||this.players.size<MAX_GUESTS)){
   Object.assign(old,{role:'dance',slot:floorSlot,gender,roleSince:this.now(),roleOrder:++this.roleSequence,lastActiveAt:this.now(),revision:++this.sequence,idleProtected:true});
   this.note(old.name+' · Dansöz yeri yenilendi; piste döndü.');
  }else{
   this.players.delete(old.id);
   this.queueDance({...old,role:'dance',gender,idleProtected:true,returningFromStage:true,automatic:true});
   this.emit('remove',{id:old.id,reason:'stage-rotation'});
  }
 }
 assign(event,role){
  event={...this.profiles.get(String(event.id)),...event,avatar:event.avatar||this.profiles.get(String(event.id))?.avatar||''};
  const id=String(event.id);if(!Object.hasOwn(ROLE_LABELS,role))return;
  const paidRole=['vip','saz','drum','dj','waiter','dancer'].includes(role)||(['dance','solo'].includes(role)&&['gift','giftCue'].includes(event.type));
  if(paidRole)event.idleProtected=true;
  const paid=Boolean(event.idleProtected||['gift','giftCue'].includes(event.type));
  if(['money','confetti','hype','endnight'].includes(role)){this.emit('effect',{id,name:String(event.name||id).slice(0,32),role,paid,...(role==='money'?{avatar:event.avatar||this.players.get(id)?.avatar||'',gender:this.players.get(id)?.gender||this.preferences[this.preferenceKey(id)]||(['female','male'].includes(this.settings.defaultGender)?this.settings.defaultGender:'male')}:{})});this.note(event.name+' · '+ROLE_LABELS[role]);return;}
  const gender=role==='dancer'?'female':this.preferences[this.preferenceKey(id)]||(['female','male'].includes(this.settings.defaultGender)?this.settings.defaultGender:event.returningFromStage?event.gender:null);
  if(!gender){if(this.pending.size>=100&&!this.pending.has(id)){this.note('Karakter seçimi bekleyenler dolu.');return;}const previous=this.pending.get(id),request={...event,role};this.pending.set(id,{...request,requests:[...(previous?.requests||(previous?[previous]:[])),request]});this.emit('choose',{id,name:event.name});this.note(event.name+': hediye alındı; kadın veya erkek yazması bekleniyor.');return;}
  if(role==='solo'){if(!this.players.has(id))this.assign({...event,soloRequested:true},'dance');else {if(event.idleProtected)this.players.get(id).idleProtected=true;this.emit('effect',{id,name:this.players.get(id).name,role:'solo',paid,player:presentationPlayer(this.players.get(id))});}return;}
  let p=this.players.get(id),slot=this.slot(role,id);
  if(role==='dancer'&&slot===undefined){const old=[...this.players.values()].filter(x=>x.role==='dancer'&&x.id!==id).sort((a,b)=>(a.roleOrder??a.revision)-(b.roleOrder??b.revision))[0];if(old){slot=old.slot;this.returnStageDancer(old,p);}}
  if(!p&&this.players.size>=MAX_GUESTS){if(role==='dance')this.queueDance(event);else this.note(event.name+': salon kapasitesi dolu.');return;}
  if(slot===undefined){if(role==='dance')this.queueDance(event);else this.note(event.name+': '+ROLE_LABELS[role]+' alanı dolu.');return;}
  if(['saz','drum','dj'].includes(role)){const old=[...this.players.values()].find(x=>x.role===role&&x.id!==id);if(old){let next=this.slot('dance',old.id),nextRole='dance';if(next===undefined){next=this.slot('vip',old.id);nextRole='vip';}if(next===undefined){this.note('Önceki müzisyen için pist ve VIP dolu.');return;}old.role=nextRole;old.slot=next;old.roleSince=this.now();old.roleOrder=++this.roleSequence;old.lastActiveAt=this.now();old.revision=++this.sequence;}}
  const same=p?.role===role;p={...p,id,name:String(event.name||p?.name||id).slice(0,32),avatar:event.avatar||p?.avatar||'',gender,variant:p?.variant??event.variant??this.variant++,idleProtected:Boolean(p?.idleProtected||event.idleProtected),role,roleSince:same?p.roleSince:this.now(),roleOrder:same?p.roleOrder:++this.roleSequence,slot:same?p.slot:slot,revision:same?p.revision:++this.sequence,lastActiveAt:this.now()};this.waitlist.delete(id);this.players.set(id,p);this.emit('role',{id,role,same,paid,...(event.automatic?{automatic:true}:{}),player:presentationPlayer(p)});this.note(p.name+' · '+ROLE_LABELS[role]);if(event.soloRequested)this.emit('effect',{id,name:p.name,role:'solo',paid,player:presentationPlayer(p)});
 }
 accept(e){
  if(['chat','like','gift','giftCue'].includes(e.type)){this.touch(e.id);this.sweepInactive();}
  // TikTok can omit the portrait on a gift while including it on a comment.
  if(e.id&&['chat','gift','giftCue'].includes(e.type)){
   const id=String(e.id),old=this.profiles.get(id)||{},profile={name:String(e.name||old.name||id).slice(0,32),avatar:e.avatar||old.avatar||''};
   this.profiles.delete(id);this.profiles.set(id,profile);if(this.profiles.size>1000)this.profiles.delete(this.profiles.keys().next().value);
   for(const records of [this.players,this.pending]){const p=records.get(id);if(p){p.name=profile.name;if(profile.avatar)p.avatar=profile.avatar;}}
  }
  if(e.type==='chat'){
   const gender=characterCommand(e.text);if(gender){this.select(e.id,gender);this.note(e.name+' karakterini seçti: '+(gender==='female'?'kadın':'erkek'));if(this.settings.chatJoin&&!this.players.has(e.id))this.assign(e,'dance');}
   const join=String(e.text).trim().toLocaleLowerCase('tr-TR');if(this.settings.chatJoin&&['katıl','katil'].includes(join))this.assign(e,'dance');
   if(!gender&&this.players.has(e.id)){this.players.get(e.id).chat={text:String(e.text).slice(0,100),until:Date.now()+6000};this.emit('chat',{id:e.id});}
   return;
  }
  if(e.type==='giftCue'||e.type==='gift'){
   const role=giftRole(this.settings,e);if(!role)return;if(e.type==='gift'&&e.cued)return;this.assign(e,role);
  }
 }
 snapshot(){return {epoch:this.epoch,mode:this.mode,seq:this.sequence,players:[...this.players.values()],events:this.events,pending:[...this.pending.values()].map(({id,name})=>({id,name})),waiting:[...this.waitlist.values()].map(({id,name},index)=>({id,name,position:index+1})),capacity:{floor:MAX_DANCERS,vip:MAX_VIP,stageDancers:MAX_STAGE_DANCERS,total:MAX_GUESTS,idleSeconds:DANCE_IDLE_MS/1000},notices:this.notices};}
}
