import {giftShot,roleEventPlayer} from './gift-shots.js';
import {RoleShow} from './role-show.js';
import {musicianCamera} from './musician-camera.js';
import {HypePartners} from './hype-partners.js';
import {HypeShow,hypeCamera} from './hype-show.js';
import {VIP_LOUNGES,vipPoint,nearestLounge,STAGE_DANCERS} from './club-layout.js';
import {setupStudio} from './studio.js';
import {SoloShow} from './solo-show.js';
import {ChatCamera} from './chat-camera.js';
import {MoneyShow} from './money-show.js';
import {createMoneyEffect} from './money-effect.js';
import {chooseModel} from './wardrobe.js';
import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {buildClub,chair} from './environment.js';
import {loadPeople,Person} from './actors.js';
import {MAX_GUESTS,MAX_DANCERS,FrameClock,AdaptiveQuality,crowdBudget,animationInterval,freeDanceSlot,freeSeat} from './crowd.js';
import {ENTRY_SECONDS,ROLE_CELEBRATIONS,DIRECT_ROLES,entranceApproach} from './role-transitions.js';
import {floorSpot} from './dance-motion.js';
import {duetCloseUp,frameDuet} from './camera-choreography.js';
import {constrainCamera} from './spatial.js';
import {ShotQueue,AutoTour,TOUR_STOPS} from './director.js';
const $=id=>document.getElementById(id),isBroadcast=location.pathname==='/overlay';document.body.classList.toggle('broadcast',isBroadcast);document.title=isBroadcast?'ÂLÂ · Yayın çıkışı':'ÂLÂ · Yayın stüdyosu';
const scene=new T.Scene();scene.background=new T.Color('#06040c');scene.fog=new T.FogExp2('#160c17',.012);
let renderer;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){$('error').hidden=false;$('error').textContent='3D sahne başlatılamadı. Tarayıcıda grafik hızlandırmayı açıp tekrar deneyin. '+e.message;$('loading').hidden=true;throw e;}
renderer.info.autoReset=false;renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.82;$('stage').append(renderer.domElement);
const pmrem=new T.PMREMGenerator(renderer),roomEnv=new RoomEnvironment();scene.environment=pmrem.fromScene(roomEnv,.04).texture;roomEnv.dispose();pmrem.dispose();scene.environmentIntensity=.5;
scene.add(new T.HemisphereLight('#e7dfef','#28162d',.27));const fill=new T.DirectionalLight('#f1d2bb',.56);fill.position.set(4,9,10);fill.castShadow=true;fill.shadow.mapSize.set(2048,2048);Object.assign(fill.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:.5,far:55});fill.shadow.normalBias=.025;fill.shadow.bias=-.00015;scene.add(fill);const rim=new T.DirectionalLight('#8d75df',.55);rim.position.set(-4,4,-8);scene.add(rim);
const camera=new T.PerspectiveCamera(52,1,.1,90);camera.position.set(0,3.2,9.8);const look=new T.Vector3(0,1,-2);camera.lookAt(look);
// A broad, low-power camera fill preserves facial features under the colored club lights.
const faceFill=new T.DirectionalLight('#fff2e5',.52);scene.add(faceFill,faceFill.target);
// Render directly with ACES tone mapping: the HDR bloom chain could black out close-ups.
const adaptiveQuality=new AdaptiveQuality();
const club=buildClub(scene),people=[],queue=new ShotQueue(),tourDirector=new AutoTour(),roles={};const featured=new Set();let crowdBusy=false,qualityCount=-1,measuredFPS=0;let assets,time=0,lastTitle='',serial=0,lastDemo=0,frameCount=0,labelAccumulator=0,pairShotKey='',pairViewAngle=0,cameraCut=false,announcementUntil=0,endNightUntil=0;
const roleShow=new RoleShow({getPeople:()=>people,spawn,remove:removeGuest,destinationFor,decorate:updateProfile});
const soloShow=new SoloShow(scene,()=>people),hypeShow=new HypeShow(),hypePartners=new HypePartners(()=>people);let hypeShotId='';
const captions={portrait:['YAKIN PLAN','Yüz ve figür','Ankara oyun havası'],wide:['GECEYE HOŞ GELDİN','Gece daha yeni başlıyor.','Canlı müzik · Dans · Lounge'],dance:['DANS PİSTİ','Ritmi birlikte yakala.','Gecenin bütün renkleri burada.'],stage:['CANLI SAHNE','Bir saz, bin hikâye.','Saz & darbuka · Bu gece canlı'],vip:['VIP LOUNGE','Gecenin en güzel masası.','Kadife localar · Özel servis']};
function title(key,name,detail){const signature=key+name+detail;if(signature===lastTitle)return;lastTitle=signature;$('shotType').textContent=key;$('shotName').textContent=name;$('shotDetail').textContent=detail;}
$('panelToggle').onclick=()=>$('panel').hidden=!$('panel').hidden;$('closePanel').onclick=()=>$('panel').hidden=true;
function availableDanceSlot(except){return freeDanceSlot(people,except);}
function applyQuality(){const budget=crowdBudget(people.length);const ratio=budget.pixelRatio*adaptiveQuality.scale;if(qualityCount===ratio)return;qualityCount=ratio;renderer.setPixelRatio(Math.min(devicePixelRatio,ratio));for(const [i,b]of club.beams.entries())b.spot.castShadow=i===1&&people.length<50;resize();}
function spawn(options){const p=new Person(assets,options,scene,$('labels'));p.demo=Boolean(options.demo);people.push(p);$('guestCount').textContent=people.length;applyQuality();return p;}
function removeGuest(p){hypePartners.release(p);if(moneyShow.active&&(moneyShow.active.source===p||moneyShow.active.receiver===p))moneyShow.stop();for(const role of Object.keys(roles))if(roles[role]===p)delete roles[role];p.dispose();people.splice(people.indexOf(p),1);$('guestCount').textContent=people.length;applyQuality();}
function reconcileStageDancers(){
 for(let slot=0;slot<STAGE_DANCERS.length;slot++){
  const owner=people.find(p=>p.viewerId&&p.costumed&&p.stageSlot===slot),standin=people.find(p=>p.sceneryDancer&&p.stageSlot===slot);
  if(owner&&standin&&standin!==moneyShow.active?.receiver)removeGuest(standin);
  else if(!owner&&!standin){const [x,y,z]=STAGE_DANCERS[slot],p=spawn({name:'Sahne sanatçısı '+(slot+1),gender:'female',variant:slot,role:'dancer',npc:true,x,y,z});p.stageSlot=slot;p.sceneryDancer=true;}
 }
}
const crowdNames=['Zeynep','Kaan','Buse','Aras','Nehir','Berk','Yağmur','Umut','Melis','Eren','Gizem','Oğuz','Elif','Burak','Ceren','Tolga','Seda','Onur','Naz','Alp'];
async function setCrowd(target){
 if(!assets||crowdBusy||networkState&&networkState.mode!=='preview')return;crowdBusy=true;$('crowdApply').disabled=true;target=Math.max(30,Math.min(MAX_GUESTS,Number(target)||50));queue.clear();
 while(people.length>target){const p=[...people].reverse().find(p=>p.demo);if(!p)break;removeGuest(p);}
 while(people.length<target){
  const n=serial++,gender=n%2?'male':'female',slot=availableDanceSlot(),seat=freeSeat(club.seats,people,null,false),name=crowdNames[n%crowdNames.length]+' '+(Math.floor(n/crowdNames.length)+1);
  if(slot!==null){const spot=floorSpot(slot);spawn({name,gender,variant:Math.floor(n/2),demo:true,role:'dance',danceSlot:slot,x:spot.x,z:spot.z,yaw:spot.yaw});}
  else if(seat)spawn({name,gender,variant:Math.floor(n/2),demo:true,npc:true,role:'table',x:seat.x,y:seat.y,z:seat.z,yaw:seat.yaw});else break;
  await new Promise(requestAnimationFrame);
 }
 crowdBusy=false;$('crowdApply').disabled=false;pairShotKey='';
}
$('crowdApply').onclick=()=>setCrowd($('crowdSize').value);
function celebrate(p,kind,arrived=true){
 $('announcementName').textContent=p.name;$('announcementRole').textContent=arrived?ROLE_CELEBRATIONS[kind]:kind==='vip'?'VIP’ye geliyor!':'Piste geliyor!';
 $('roleAnnouncement').hidden=false;announcementUntil=time+4;
 $('roleAnnouncement').animate([{opacity:0,transform:'translate(-50%, -12px) scale(.9)'},{opacity:1,transform:'translate(-50%, 0) scale(1.04)'},{opacity:1,transform:'translate(-50%, 0) scale(1)'}],{duration:450,easing:'ease-out'});
}
function focus(p,kind){
 const walking=p.walking,immediate=DIRECT_ROLES.has(kind),priority=immediate?4:kind==='vip'?2:1;
 queue.push({key:p.name+kind,person:p,title:ROLE_CELEBRATIONS[kind],priority,duration:walking?ENTRY_SECONDS+6:5,followArrival:walking,arrivalHold:4,immediate,
  returnView:'dance',returnDuration:1.5,
  onStart:()=>{p.entryPending=false;p.entryReleaseAt=null;if(p.walking)p.play('walk');cameraCut=true;celebrate(p,kind,!p.walking);},
  onArrival:()=>celebrate(p,kind),
  onRelease:()=>{p.entryPending=false;p.entryReleaseAt=null;if(p.walking)p.play('walk');tourDirector.resumeDance();}},time);
}
function syncAfterGift(){cameraCut=true;tourDirector.resumeDance();queueMicrotask(()=>{if(networkState)applyNetwork(networkState);});}
function enqueueRole(e,data){
 const shot=giftShot(e,{
  title:ROLE_CELEBRATIONS[data.role],
  onStart:()=>{hypePartners.stop();shot.person=roleShow.start(data,{entrance:!e.same});shot.arrivalAnnounced=!shot.person.walking;cameraCut=true;celebrate(shot.person,data.role,!shot.person.walking);},
  onRelease:()=>{if(!shot.person||roleShow.active?.person!==shot.person)return;roleShow.stop();syncAfterGift();}
 });queue.push(shot,time);
}
function enqueueSolo(e){
 const data=e.player||networkState?.players.find(p=>p.id===e.id);if(!data)return;
 const variant=0;
 let began=false;
 const shot=giftShot({...e,role:'solo'},{title:'Sahne senin!',
  onStart:()=>{began=true;hypePartners.stop();const p=roleShow.start(data,{entrance:false,hideDestination:false});shot.person=p;soloShow.start(p,time,variant);cameraCut=true;$('soloName').textContent=p.name;$('soloNotice').hidden=false;},
  onRelease:()=>{if(!began)return;soloShow.stop();roleShow.stop();$('soloNotice').hidden=true;syncAfterGift();}
 });queue.push(shot,time);
}
function enqueueConfetti(e){queue.push(giftShot({...e,role:'confetti'},{title:(e.name||'')+' · Konfeti!',view:'dance',onStart:()=>{burst();cameraCut=true;},onRelease:()=>{particleLife=0;particles.visible=false;syncAfterGift();}}),time);}
function action(kind){
 if(!assets||crowdBusy||!['hype','confetti',...Object.keys(ROLE_CELEBRATIONS)].includes(kind))return;
 if(kind==='hype'){enqueueHype({id:'preview',name:$('guestName').value.trim()||'Misafir'});return;}
 if(kind==='confetti'){enqueueConfetti({name:'Misafir'});return;}
 const name=$('guestName').value.trim()||'Misafir '+(++serial),gender=$('gender').value;
 let p=people.find(p=>!p.npc&&p.name===name);const existing=Boolean(p);
 if(!p){if(people.length>=MAX_GUESTS){title('SALON DOLU','Bu gece '+MAX_GUESTS+' misafir.','Mevcut bir misafirin adını yazarak rolünü değiştirebilirsin.');return;}p=spawn({name,gender,variant:serial++,x:0,z:23,role:kind});}
 p.demo=false;
 if(existing&&(p.walking?p.destinationRole===kind:p.role===kind)){focus(p,kind);return;}
 const reject=detail=>{if(!existing)removeGuest(p);title('YER KALMADI',detail,'Başka bir rol seçebilir veya örnek kalabalığı azaltabilirsin.');};
 let dest,yaw=0;
 if(kind==='dance'){const slot=availableDanceSlot(p);if(slot===null){reject('Pistteki çift alanları dolu.');return;}p.danceSlot=slot;const spot=floorSpot(slot);dest=[spot.x,0,spot.z];yaw=spot.yaw;}
 if(kind==='vip'){const seat=freeSeat(club.seats,people,p,true);if(!seat){reject('VIP localarında boş yer yok.');return;}dest=[seat.x,seat.y,seat.z];yaw=seat.yaw;}
 if(['saz','drum','dj'].includes(kind)){
  const old=roles[kind];
  if(old&&old!==p){const slot=availableDanceSlot(old);let target,role,oldYaw;
   if(slot!==null){const spot=floorSpot(slot);old.danceSlot=slot;target=[spot.x,0,spot.z];role='dance';oldYaw=spot.yaw;}
   else{const seat=freeSeat(club.seats,people,old,true);if(!seat){reject('Önceki müzisyen için pist veya VIP yeri gerekiyor.');return;}target=[seat.x,seat.y,seat.z];role='vip';oldYaw=seat.yaw;}
   queue.removePerson(old);old.placeAt(target,role,oldYaw);
  }
  dest=kind==='saz'?[-3.9,.64,-7]:kind==='drum'?[3.9,.64,-7]:[0,.64,-8.65];roles[kind]=p;
 }
 if(kind==='waiter'){const n=people.filter(x=>x!==p&&(x.role==='waiter'||x.walking&&x.destinationRole==='waiter')).length,side=n%2?1:-1;dest=[side*6.4,0,Math.min(17,5+Math.floor(n/2)*4)];}
 for(const key of Object.keys(roles))if(roles[key]===p&&key!==kind)delete roles[key];
 if(DIRECT_ROLES.has(kind))p.placeAt(dest,kind,yaw);
 else{const approach=entranceApproach(dest,kind);p.root.position.set(...approach.start);p.walkTo(approach.path,kind,yaw,ENTRY_SECONDS);p.entryPending=true;p.play('idle');}
 focus(p,kind);
}

const particleCount=170,positions=new Float32Array(particleCount*3),velocities=[];const colors=new Float32Array(particleCount*3),geo=new T.BufferGeometry();for(let i=0;i<particleCount;i++){const c=new T.Color(['#f7d58b','#df80bb','#b3a0ff'][i%3]);c.toArray(colors,i*3);}geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('color',new T.BufferAttribute(colors,3));const particles=new T.Points(geo,new T.PointsMaterial({size:.065,vertexColors:true,transparent:true,opacity:.9,depthWrite:false}));particles.visible=false;scene.add(particles);let particleLife=0;
function burst(){for(let i=0;i<particleCount;i++){positions[i*3]=(Math.random()-.5)*9;positions[i*3+1]=3+Math.random()*3;positions[i*3+2]=(Math.random()-.5)*7;velocities[i]=[(Math.random()-.5)*.8,-.5-Math.random(),(Math.random()-.5)*.8];}particleLife=8;particles.visible=true;}
const moneyEffect=createMoneyEffect(scene);
const moneyShow=new MoneyShow({getPeople:()=>people,spawn,remove:removeGuest,effect:moneyEffect});
function enqueueMoney(e){let started=false;
 queue.push(giftShot({...e,role:'money'},{returnView:'wide',
 onStart:()=>{hypePartners.stop();started=moneyShow.start(e,time);cameraCut=true;},
 onRelease:()=>{if(!started)return;moneyShow.stop();syncAfterGift();}}),time);
}
function enqueueHype(e){
 queue.push(giftShot({...e,role:'hype'},{returnView:'wide',
  onStart:()=>{hypeShow.start(e,time);hypePartners.start(time);hypeShotId='';$('hypeName').textContent=e.name+' pisti coşturdu!';cameraCut=true;},
  onRelease:()=>{hypePartners.stop();hypeShow.clear();syncAfterGift();}}),time);
}
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
const chatCamera=new ChatCamera();
function plannedCamera(){featured.clear();const shot=queue.tick(time),tourShot=tourDirector.tick(time,Boolean(shot)||time<queue.returnUntil);let target=new T.Vector3(),pos=new T.Vector3(),fov=52;const portrait=camera.aspect<.8;
 if(moneyShow.active){const {proxy,receiver}=moneyShow.active;featured.add(proxy);featured.add(receiver);target.copy(proxy.root.position).lerp(receiver.root.position,.5).add(new T.Vector3(0,.95,0));pos.copy(target).add(new T.Vector3(-2.6,1.25,portrait?4.1:3.1));$('cameraName').textContent=time-moneyShow.active.startedAt<1.8?'Para saç · giriş':'Para saç · dansözle gösteri';title('PARA SAÇ',proxy.name,'');return{pos:constrainCamera(pos),target,fov:portrait?52:56,focus:proxy};}
 if(soloShow.active){
  const active=soloShow.active,{person:p,startedAt}=active,origin=p.root.position,age=time-startedAt;
  // Start with the applauding circle, ease in for the spoons and footwork,
  // then open back out. Keep the whole body visible throughout the show.
  const close=T.MathUtils.smoothstep(age,3,5)*(1-T.MathUtils.smoothstep(age,9,11.5));
  if(active.cameraAngle===undefined){
   let best=Infinity;active.cameraAngle=0;
   for(const a of [-.65,-.32,0,.32,.65]){
    let cost=Math.abs(a)*.12;
    for(const r of active.neighbors.values())for(const d of [4.1,5.3,6.5]){
     const distance=Math.hypot(r.target.x-origin.x-Math.sin(a)*d,r.target.z-origin.z-Math.cos(a)*d);
     cost+=Math.max(0,1.15-distance)**2;
    }
    if(cost<best){best=cost;active.cameraAngle=a;}
   }
  }
  const angle=active.cameraAngle+.14*Math.sin(age*.37),distance=T.MathUtils.lerp(portrait?6.2:6.5,portrait?4.6:4.1,close),height=T.MathUtils.lerp(4.3,3.15,close);
  featured.add(p);target.copy(origin).add(new T.Vector3(0,.92,0));pos.set(origin.x+Math.sin(angle)*distance,origin.y+height,origin.z+Math.cos(angle)*distance);
  $('cameraName').textContent='Sahne senin! · Kaşık oyunu';
  return{pos:constrainCamera(pos),target,fov:portrait?50:48,focus:p};
 }
 if(hypeShow.active&&(shot?.kind==='hype'||!shot&&time>=queue.returnUntil)){
  const plan=hypeCamera(people,time-hypeShow.active.startedAt,camera.aspect);
  if(plan){if(hypeShotId!==plan.shotId){hypeShotId=plan.shotId;if(plan.cut)cameraCut=true;}plan.people.forEach(p=>featured.add(p));$('cameraName').textContent='Coştur · '+(plan.label||(plan.wide?'tüm pist':'tam boy çift'));title('COŞTUR!',hypeShow.active.name,'');return{...plan,focus:null,danceTour:true};}
 }
 if(shot?.kind==='chat'){
  const p=shot.person,origin=p.root.position,angle=(shot.cameraAngle??=(p.danceFacing??p.root.rotation.y))+.10*Math.sin((time-queue.started)*.5),distance=portrait?3.8:3;
  featured.add(p);target.copy(origin).add(new T.Vector3(0,1.35,0));
  pos.set(origin.x+Math.sin(angle)*distance,origin.y+2.05,origin.z+Math.cos(angle)*distance);
  $('cameraName').textContent='Sohbet · yakın plan';
  return{pos:constrainCamera(pos),target,fov:48,focus:p};
 }
 if(shot?.person&&!shot.person.walking&&['saz','drum'].includes(shot.person.role)){
  const plan=musicianCamera(shot.person,people,camera.aspect,time);
  if(plan){featured.add(shot.person);title(shot.title.toLocaleUpperCase('tr'),shot.person.name,'');$('cameraName').textContent='Hediye · '+shot.title+' · çapraz';return plan;}
 }
 if(shot?.protected&&shot.person&&!shot.arrivalAnnounced&&!shot.person.walking){shot.arrivalAnnounced=true;celebrate(shot.person,shot.person.role);}
 const eventPair=!shot?.person?.giftActor&&shot?.person?.role==='dance'&&!shot.person.walking&&shot.person.dancePartner?shot.person:null;
 if(shot?.person&&!eventPair){featured.add(shot.person);const p=shot.person,origin=p.root.position,angle=(shot.cameraAngle??=(p.danceFacing??p.root.rotation.y)+.25)+Math.sin(time*.18)*.12;target.copy(origin).add(new T.Vector3(0,1.15,0));const d=portrait?4.5:3.6;pos.set(origin.x+Math.sin(angle)*d,origin.y+2.3,origin.z+Math.cos(angle)*d);if(!p.walking&&Math.abs(origin.x)>7){if(origin.z<-6){pos.x=Math.sign(origin.x)*8.7;pos.z=origin.z+4.3;}else pos.x=origin.x-Math.sign(origin.x)*2;}if(!p.walking&&['saz','drum'].includes(p.role)){target.copy(origin).add(new T.Vector3(0,.85,0));pos.set(origin.x+.55,origin.y+1.9,origin.z+3.7);}if(!p.walking&&p.role==='vip'){const lounge=nearestLounge(origin);pos.set(...vipPoint(lounge,0,2.33,6.1));target.set(...vipPoint(lounge,0,1.78,-.4));}if(p.walking){const end=p.path.at(-1)||origin;target.copy(origin).lerp(end,.5).add(new T.Vector3(0,1,0));pos.set(target.x,origin.y+2.65,target.z+5.3);}constrainCamera(pos);fov=p.walking?58:p.role==='vip'?68:48;title(shot.title.toLocaleUpperCase('tr'),p.name,p.walking?'Kamera misafirimizi takip ediyor.':'Bu gece sahne senin.');$('cameraName').textContent=p.walking?'Giriş takibi':shot.protected?'Hediye · '+shot.title:'Yakın plan';return{pos,target,fov,focus:p};}
 const selected=(eventPair?'dance':shot?.view)||(time<queue.returnUntil?(queue.returnView||'wide'):tourShot.view),a=time*.075;
 if(selected==='wide'){const busy=people.length>=50;pos.set(Math.sin(a)*3,busy?6.1:4.1,busy?29:13.8);target.set(0,1.2,busy?10:0);fov=portrait?68:62;}
 if(selected==='dance'){
  const pairs=people.filter(p=>p.role==='dance'&&!p.walking&&p.dancePartner&&p.danceSlot%2===0).sort((a,b)=>{const aa=floorSpot(a.danceSlot),bb=floorSpot(b.danceSlot);return aa.z-bb.z||aa.x-bb.x;});
  const first=eventPair||pairs[tourShot.danceIndex%Math.max(1,pairs.length)];
  if(first){featured.add(first);featured.add(first.dancePartner);
   // Short accents only; footwork and full turns always get the complete pair.
   const closeIndex=duetCloseUp(time,Math.floor(first.danceSlot/2)),closePerson=eventPair||tourShot.danceElapsed<2||tourShot.danceElapsed>3.3?null:closeIndex===0?first:closeIndex===1?first.dancePartner:null;
   if(closePerson){const p=closePerson,face=p.facePosition(),angle=(p.danceFacing??p.root.rotation.y)+.85+Math.sin(time*.12)*.06,d=portrait?3.2:3.6;
    target.copy(face).add(new T.Vector3(0,-.38,0));pos.set(face.x+Math.sin(angle)*d,face.y+.25,face.z+Math.cos(angle)*d);fov=portrait?48:44;
    title('ANKARA OYUN HAVASI',p.name,p.dancePhrase);$('cameraName').textContent='Yüz & figür';return{pos,target,fov,focus:p};
   }
   const second=first.dancePartner,center=first.root.position.clone().lerp(second.root.position,.5),d=portrait?5.7:4.2,key=first.name+tourShot.id+tourShot.danceIndex+portrait,heightBoost=!eventPair&&tourShot.danceIndex%4===3?.9:0;
   if(key!==pairShotKey){pairShotKey=key;let best=Infinity;
    for(const angle of [.15,.8,-.8,1.35,-1.35,2.3,-2.3,Math.PI]){
     const candidate=frameDuet(first.root.position,second.root.position,angle,camera.aspect,portrait?60:54,heightBoost),cx=candidate.pos.x,cz=candidate.pos.z;
     let score=Math.abs(angle-([.8,-.8,0][tourShot.danceIndex%3]))*.8;
     const bounded=constrainCamera(candidate.pos.clone());score+=bounded.distanceTo(candidate.pos)*1000;
     for(const other of people){if(other===first||other===second||other.role!=='dance')continue;
      const ox=other.root.position.x-cx,oz=other.root.position.z-cz,vx=center.x-cx,vz=center.z-cz,u=(ox*vx+oz*vz)/(vx*vx+vz*vz);
      if(u>0&&u<.9&&Math.hypot(ox-u*vx,oz-u*vz)<.65)score+=10;
     }
     if(score<best){best=score;pairViewAngle=angle;}
    }
   }
   const orbit=pairViewAngle+Math.sin(time*.24)*.17,framed=frameDuet(first.root.position,second.root.position,orbit,camera.aspect,portrait?60:54,heightBoost);
   pos.copy(framed.pos);target.copy(framed.target);fov=framed.fov;
   title('ANKARA OYUN HAVASI',first.name+' & '+second.name,first.dancePhrase||'Karşılıklı adımlar');$('cameraName').textContent='Tam boy · çift takibi';return{pos,target,fov,focus:null,danceTour:true};}

  pos.set(Math.sin(a)*5,3,8.5);target.set(0,1.1,0);fov=portrait?63:55;
 }

 if(['saz','drum','dj'].includes(selected)){
  const musician=people.find(p=>p===roles[selected]&&p.role===selected&&!p.giftHidden&&!p.moneyHidden);
  if(musician&&!musician.walking&&['saz','drum'].includes(selected)){
   const plan=musicianCamera(musician,people,camera.aspect,time);
   if(plan){featured.add(musician);title('CANLI SAHNE',musician.name,'');$('cameraName').textContent='Çapraz · enstrüman';return plan;}
  }
  if(musician&&!musician.walking){featured.add(musician);const origin=musician.root.position;target.copy(origin).add(new T.Vector3(0,.85,0));pos.set(origin.x+Math.sin(tourShot.elapsed*.14)*.9,origin.y+1.9,origin.z+3.4);fov=58;
   title('CANLI SAHNE',musician.name,musician.role==='saz'?'Tezene ve perde takibi':musician.role==='drum'?'Düm–tek · karşılıklı el vuruşları':'Gecenin ritmi');$('cameraName').textContent='Enstrüman & oturuş';return{pos,target,fov,focus:musician};
  }
  pos.set(Math.sin(a)*1.5,3,-.7);target.set(0,1.8,-7.5);fov=58;
 }
 if(selected==='stageDancers'){
  for(const p of people)if(p.role==='dancer')featured.add(p);
  pos.set(Math.sin(time*.12)*.6,portrait?4.2:3.3,portrait?8:1.5);target.set(0,1.65,-5.1);fov=portrait?68:60;
  title('CANLI SAHNE','Sahne gösterisi','');$('cameraName').textContent='Sahne · tam boy gösteri';return{pos,target,fov,focus:null};
 }
 const lounge=VIP_LOUNGES.find(l=>l.id===selected);
 if(lounge){pos.set(...vipPoint(lounge,Math.sin(tourShot.elapsed*.13)*.45,2.33,6.1));target.set(...vipPoint(lounge,0,1.88,-.4));fov=68;
  people.filter(p=>p.role==='vip'&&nearestLounge(p.root.position).id===lounge.id).forEach(p=>featured.add(p));
  title('VIP LOUNGE',lounge.name,'Gecenin sohbet molası');
 }else if(selected==='waiter'){
  const waiters=people.filter(p=>p.role==='waiter'&&!p.walking),p=waiters[Math.floor(tourShot.id/TOUR_STOPS.length)%Math.max(1,waiters.length)];
  if(p){featured.add(p);const origin=p.root.position,side=Math.sign(origin.x)||-1;target.copy(origin).add(new T.Vector3(0,1,0));pos.set(origin.x-side*2.5,2.3,origin.z+3.4);fov=portrait?58:50;title('GECE DEVAM EDİYOR',p.name,'Salonun ritmine eşlik et.');$('cameraName').textContent='Otomatik · servis takibi';return{pos,target,fov,focus:p};}
  pos.set(0,3.6,14);target.set(0,1.2,3);title(...captions.wide);
 }else title(...(captions[selected]||captions.stage));
 $('cameraName').textContent='Otomatik · salon turu';return{pos,target,fov,focus:null};}
async function init(){try{assets=await loadPeople(n=>{$('loadBar').style.width=(n*100)+'%';$('loadText').textContent='Karakterler ve hareketler hazırlanıyor · %'+Math.round(n*100);},Math.min(8,renderer.capabilities.getMaxAnisotropy()));
 const names=['Ece','Mert','Selin','Emre','Derya','Can','İpek','Kerem','Aslı','Ozan'];for(let i=0;i<10;i++){const spot=floorSpot(i);spawn({name:names[i],gender:i%2?'male':'female',variant:Math.floor(i/2),demo:true,x:spot.x,z:spot.z,role:'dance',yaw:spot.yaw,danceSlot:i});}
 // Ordinary tables are anonymous background NPCs, never viewer roles or camera targets.
 for(const [i,index] of [0,3,8,11,16,19,24,27,32,35,40,43].entries()){const s=club.seats[index];spawn({name:'Salon konuğu '+(i+1),gender:i%2?'male':'female',variant:i,demo:true,npc:true,x:s.x,y:s.y,z:s.z,yaw:s.yaw,role:'table'});}
 roles.saz=spawn({name:'Hakan',gender:'male',variant:1,role:'saz',x:-3.9,y:.64,z:-7});chair(scene,-3.9,-7,0,.64);
 roles.drum=spawn({name:'Ali',gender:'male',variant:0,role:'drum',x:3.9,y:.64,z:-7});chair(scene,3.9,-7,0,.64);
 roles.dj=spawn({name:'DJ · Defne',gender:'female',variant:2,role:'dj',x:0,y:.64,z:-8.65});spawn({name:'Efe',gender:'male',variant:2,role:'waiter',x:-6.4,z:5});
 for(const [i,s] of club.seats.filter(s=>s.vip).entries()){if(i%3===2)continue;spawn({name:['İdil','Ege','Defne','Alper','Lara','Okan','Aslı','Bora','Selen','Doruk','İrem','Arda'][i],gender:i%2?'male':'female',variant:i,demo:true,x:s.x,y:s.y,z:s.z,yaw:s.yaw,role:'vip'});}
 reconcileStageDancers();serial=20;if(!networkState||networkState.mode==='preview')await setCrowd(50);readyForNetwork=true;if(networkState)applyNetwork(networkState);
 $('loading').style.opacity='0';setTimeout(()=>$('loading').hidden=true,850);document.body.dataset.ready='true';
 }catch(e){console.error(e);$('loadText').textContent='Model yüklenemedi. Sayfayı yenileyerek tekrar dene.';$('error').hidden=false;$('error').textContent=e.message;}}
const visibilityFrustum=new T.Frustum(),viewMatrix=new T.Matrix4(),personSphere=new T.Sphere(new T.Vector3(),1.55);
const frameClock=new FrameClock(performance.now());let statsTime=0,statsFrames=0,lastShadowTime=-1;
function animate(now){requestAnimationFrame(animate);const budget=crowdBudget(people.length),dt=frameClock.tick(now,budget.fps,document.hidden);if(dt===null)return;
 for(const p of people)if(p.chatUntil&&p.chatUntil<Date.now()){p.tag.querySelector('.chat-bubble')?.remove();p.chatUntil=0;}
 time+=dt;frameCount++;statsTime+=dt;statsFrames++;hypeShow.update(time);if(hypeShow.active)hypePartners.update(time);else hypePartners.stop();club.update(time);const energy=hypeShow.energy(time);for(const beam of club.beams)beam.spot.intensity=12+energy*(2+2*Math.sin(time*3));moneyEffect.update(dt,time);soloShow.update(time);moneyShow.update(time);roleShow.update();
 const dancers=people.filter(p=>p.role==='dance'&&!p.walking&&!p.moneyGuest&&!p.moneyHidden&&!p.giftActor&&!p.giftHidden),bySlot=new Map(dancers.map(p=>[p.danceSlot,p]));
 for(const p of dancers){p.dancePartner=dancers.includes(p.hypePartner)?p.hypePartner:bySlot.get(p.danceSlot^1)||null;p.hypeStartedAt=hypeShow.active?.startedAt??null;}
 camera.updateMatrixWorld();visibilityFrustum.setFromProjectionMatrix(viewMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 for(const p of people){
  if(p.moneyHidden||p.giftHidden){p.root.visible=false;p.tag.hidden=true;continue;}
  if(p.entryPending&&p.entryReleaseAt!=null&&time>=p.entryReleaseAt){p.entryPending=false;p.entryReleaseAt=null;p.play('walk');}
  personSphere.center.copy(p.root.position).y+=.9;const distance=personSphere.center.distanceTo(camera.position),visible=visibilityFrustum.intersectsSphere(personSphere),important=featured.has(p)||Boolean(p.solo||p.soloAudience||p.moneyInteraction||p.moneyGuest||p.giftActor);
  p.root.visible=visible;const interval=p.hypeMoving?0:visible&&p.role==='dance'&&p.hypeStartedAt!=null?(distance<10?0:1/15):visible&&p.role==='dancer'?0:p.npc&&p.role==='table'&&!important?(visible?1/8:1):animationInterval(distance,visible,important,p.walking);
  if(p.lastPoseTime<0||time-p.lastPoseTime>=interval)p.update(Math.min(.5,p.lastPoseTime<0?dt:time-p.lastPoseTime),time);
  p.setDetail(!important&&distance>(p.distant?8:10));
  const cast=visible&&(important||distance<7);for(const mesh of p.meshes)mesh.castShadow=cast;
 }
 moneyShow.emit(time);
 const plan=plannedCamera(),focused=plan.focus,cutThisFrame=cameraCut,blend=cutThisFrame?1:1-Math.exp(-dt*(queue.current?.person?.walking?8:plan.danceTour?1.9:1.25));cameraCut=false;$('hypeNotice').hidden=!hypeShow.active||time-hypeShow.active.startedAt>4||Boolean(soloShow.active||moneyShow.active);if(time>=announcementUntil)$('roleAnnouncement').hidden=true;if(time>=endNightUntil)$('endNightNotice').hidden=true;camera.position.lerp(constrainCamera(plan.pos),blend);look.lerp(plan.target,blend);camera.fov=T.MathUtils.lerp(camera.fov,plan.fov,blend);camera.updateProjectionMatrix();camera.lookAt(look);camera.updateMatrixWorld(true);
 // A camera cut must project labels and visibility from the new camera now.
 if(cutThisFrame){visibilityFrustum.setFromProjectionMatrix(viewMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));for(const p of people){personSphere.center.copy(p.root.position).y+=.9;p.root.visible=!p.moneyHidden&&!p.giftHidden&&visibilityFrustum.intersectsSphere(personSphere);}labelAccumulator=.13;}
 labelAccumulator+=dt;if(labelAccumulator>.12){const nearest=people.filter(p=>!p.npc&&p.root.visible).sort((a,b)=>a.root.position.distanceToSquared(camera.position)-b.root.position.distanceToSquared(camera.position));const labeled=new Set([...featured,...nearest.slice(0,people.length>=50?16:24)]);people.forEach(p=>{if(labeled.has(p))p.label(camera,innerWidth,innerHeight,p===focused||featured.has(p));else p.tag.hidden=true;});labelAccumulator=0;}
 if(particleLife>0){particleLife-=dt;for(let i=0;i<particleCount;i++){positions[i*3]+=velocities[i][0]*dt;positions[i*3+1]+=velocities[i][1]*dt;positions[i*3+2]+=velocities[i][2]*dt;}geo.attributes.position.needsUpdate=true;particles.material.opacity=Math.min(.9,particleLife*.4);if(particleLife<=0)particles.visible=false;}
 if(assets&&networkState?.mode==='preview'&&$('autoEvents').checked&&time-lastDemo>22){lastDemo=time;const a=['saz','dance','vip','drum','dj','waiter'][Math.floor(time/22)%6];$('guestName').value=['Deniz','Yağmur','Barış'][Math.floor(time/22)%3];action(a);}
 faceFill.position.copy(camera.position).add(new T.Vector3(-2,2,0));faceFill.target.position.copy(look);
 if(statsTime>=1){measuredFPS=statsFrames/statsTime;if(adaptiveQuality.sample(measuredFPS))applyQuality();$('performanceStatus').textContent=people.length+' kişi · '+dancers.length+' pistte · '+Math.round(measuredFPS)+' FPS · '+renderer.info.render.calls+' çizim';statsTime=0;statsFrames=0;}
 if(time-lastShadowTime>.1){renderer.shadowMap.needsUpdate=true;lastShadowTime=time;}
 $('clock').textContent=new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});renderer.info.reset();renderer.render(scene,camera);}
let networkState=null,networkEpoch=null,networkMode=null,lastSequence=0,readyForNetwork=false;
function destinationFor(p){
 if(p.role==='dance'){const s=floorSpot(p.slot);return {position:[s.x,0,s.z],yaw:s.yaw};}
 if(p.role==='dancer')return {position:STAGE_DANCERS[p.slot],yaw:0};
 if(p.role==='vip'){const s=club.seats.filter(s=>s.vip)[p.slot];return {position:[s.x,s.y,s.z],yaw:s.yaw};}
 if(p.role==='saz')return {position:[-3.9,.64,-7],yaw:0};
 if(p.role==='drum')return {position:[3.9,.64,-7],yaw:0};
 if(p.role==='dj')return {position:[0,.64,-8.65],yaw:0};
 return {position:[p.slot%2?11:-11,0,Math.min(17,3+Math.floor(p.slot/2)*3)],yaw:0};
}
function background(){
 for(const [key,p] of Object.entries(roles))delete roles[key];
 for(const [i,index]of [0,3,8,11,16,19,24,27,32,35,40,43].entries()){const s=club.seats[index];spawn({name:'Salon konuğu',gender:i%2?'male':'female',variant:i,npc:true,role:'table',x:s.x,y:s.y,z:s.z,yaw:s.yaw});}
 for(const [role,name,gender,variant] of [['saz','Sazcı','male',1],['drum','Darbukacı','male',0],['dj','DJ','female',2]]){const d=destinationFor({role});const p=spawn({name,gender,variant,npc:true,role,x:d.position[0],y:d.position[1],z:d.position[2]});p.scenery=true;roles[role]=p;}
 reconcileStageDancers();
}
function updateProfile(p,data){
 p.name=data.name;p.tag.querySelector('span').textContent=data.name;
 if(data.avatar&&p.avatar!==data.avatar){p.avatar=data.avatar;const img=document.createElement('img');img.src=data.avatar;img.alt='';img.referrerPolicy='no-referrer';img.onerror=()=>img.remove();p.tag.querySelector('em').replaceChildren(img);}
 let bubble=p.tag.querySelector('.chat-bubble');if(data.chat?.until>Date.now()){if(!bubble){bubble=document.createElement('div');bubble.className='chat-bubble';p.tag.append(bubble);}bubble.textContent=data.chat.text;p.chatUntil=data.chat.until;}else bubble?.remove();
}
function applyNetwork(s){
 networkState=s;if(!readyForNetwork||!assets)return;
 const initial=networkEpoch===null,reset=networkEpoch!==s.epoch||networkMode!==s.mode,wasPreview=networkMode==='preview'||networkMode===null;
 if(reset){queue.clear();hypePartners.stop();hypeShow.clear();hypeShotId='';$('hypeNotice').hidden=true;chatCamera.clear();endNightUntil=0;$('endNightNotice').hidden=true;announcementUntil=0;$('roleAnnouncement').hidden=true;$('selectionNotice').hidden=true;lastSequence=initial?s.seq:0;networkEpoch=s.epoch;networkMode=s.mode;
  if(s.mode!=='preview'||!wasPreview){for(const p of [...people])removeGuest(p);background();}
  if(s.mode==='preview'&&!wasPreview){setCrowd(50);return;}
 }
 if(s.mode==='preview')return;
 const fresh=initial?[]:s.events.filter(e=>e.seq>lastSequence),roleEvents=new Map(fresh.filter(e=>e.type==='role'&&!e.automatic&&e.role==='dance'&&!e.paid).map(e=>[e.id,e]));
 lastSequence=s.seq;
 const ids=new Set(s.players.map(p=>p.id));for(const p of [...people])if(p.viewerId&&!ids.has(p.viewerId)&&!p.giftHidden&&!p.moneyHidden&&!p.moneyInteraction&&!p.solo&&p!==moneyShow.active?.receiver){queue.removePerson(p);removeGuest(p);}
 for(const data of s.players){let p=people.find(p=>p.viewerId===data.id),changed=!p||p.serverRevision!==data.revision,pose;
  if((p?.solo||p?.moneyHidden||p?.moneyInteraction||p&&p===moneyShow.active?.receiver)&&(changed||p.gender!==data.gender)){continue;}
  if(p&&(p.gender!==data.gender||p.costumed!==(data.role==='dancer'))){pose={position:p.root.position.toArray(),yaw:p.root.rotation.y};queue.removePerson(p);for(const k of Object.keys(roles))if(roles[k]===p)delete roles[k];removeGuest(p);p=null;changed=true;}
  const dest=destinationFor(data),event=roleEvents.get(data.id);
  if(!p){p=spawn({name:data.name,gender:data.gender,variant:data.variant,modelName:chooseModel(data.gender,data.variant,data.role==='dancer'?'dancer':'dance'),role:data.role,x:dest.position[0],y:dest.position[1],z:dest.position[2],yaw:dest.yaw,danceSlot:data.role==='dance'?data.slot:null});p.viewerId=data.id;}
  p.stageSlot=data.role==='dancer'?data.slot:null;
  updateProfile(p,data);
  if(changed){hypePartners.release(p);queue.removePerson(p);for(const k of Object.keys(roles))if(roles[k]===p)delete roles[k];p.danceSlot=data.role==='dance'?data.slot:null;
   if(['saz','drum','dj'].includes(data.role)){if(roles[data.role]?.scenery)removeGuest(roles[data.role]);roles[data.role]=p;}
   if(event&&!event.same&&!DIRECT_ROLES.has(data.role)){p.setRole(data.role);const approach=entranceApproach(dest.position,data.role);p.root.position.set(...approach.start);p.walkTo(approach.path,data.role,dest.yaw,ENTRY_SECONDS);p.entryPending=true;p.play('idle');}else p.placeAt(dest.position,data.role,dest.yaw);
   p.serverRevision=data.revision;
  }
  if(event&&!p.solo)focus(p,data.role);
 }
 reconcileStageDancers();
 for(const e of fresh){if(e.type==='role'&&!e.automatic&&(e.paid||e.role!=='dance')){const data=roleEventPlayer(e,s.players);if(data)enqueueRole(e,data);continue;}if(e.type==='queued')studio.queueNotice(e.name,e.position);if(e.type==='choose')studio.notice(e.name);if(e.type==='effect'){if(e.role==='solo'){enqueueSolo(e);continue;}if(e.role==='money'){enqueueMoney(e);continue;}if(e.role==='hype'){enqueueHype(e);continue;}if(e.role==='endnight'){$('endNightName').textContent=e.name;$('endNightNotice').hidden=false;endNightUntil=time+15;continue;}if(e.role==='confetti')enqueueConfetti(e);}}
 // Process chat after all role/effect shots so gifts retain camera priority.
 for(const e of fresh)if(e.type==='chat')chatCamera.focus(people.find(p=>p.viewerId===e.id),queue,time,()=>{cameraCut=true;});
 lastSequence=s.seq;
}
const studio=setupStudio(applyNetwork);
requestAnimationFrame(animate);init();
