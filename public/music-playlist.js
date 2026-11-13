import {resumePosition} from './music-resume.js';

export function setupMusicPlaylist({control,save,broadcast}){
 const $=id=>document.getElementById(id),audio=new Audio();
 audio.id='playlistAudio';audio.hidden=true;audio.preload='auto';audio.loop=false;document.body.append(audio);
 const resumeKey='ala-music-resume';let state,sourceKey='',loadedKey='',lastSaved=0,monitor=false,listSignature='',endingKey='',retryTimer,failedKey='';
 function savePosition(){
  if(!broadcast||!sourceKey||loadedKey!==sourceKey||audio.readyState<1)return;
  try{sessionStorage.setItem(resumeKey,JSON.stringify({version:sourceKey,position:audio.currentTime,savedAt:Date.now()}));}catch{}
 }
 function apply(){
  if(!state)return;
  const id=state.playlist?.currentId,key=id?id+':'+state.settings.musicVersion:'';
  audio.volume=state.settings.musicVolume;
  if(key!==sourceKey){
   savePosition();clearTimeout(retryTimer);endingKey='';failedKey='';sourceKey=key;loadedKey='';audio.pause();
   if(id)audio.src='/media/music/'+encodeURIComponent(id);else audio.removeAttribute('src');
   audio.load();$('musicStatus').textContent='';
  }
  if(sourceKey&&failedKey!==sourceKey&&state.settings.musicPlaying&&(broadcast||monitor)&&audio.readyState>=1){
   if(audio.ended)finish();else if(audio.paused)audio.play().then(()=>{$('musicStatus').textContent='';}).catch(e=>{if(e.name!=='AbortError')$('musicStatus').textContent='Sesi başlatmak için bu pencereye bir kez tıkla.';});
  }else audio.pause();
 }
 async function finish(){
  if(!sourceKey||endingKey===sourceKey||!state.settings.musicPlaying||!(broadcast||monitor))return;
  const key=sourceKey;endingKey=key;
  const ok=await control({action:'musicEnded',id:state.playlist.currentId,version:state.settings.musicVersion});
  if(!ok&&sourceKey===key){endingKey='';retryTimer=setTimeout(finish,1500);}
 }
 audio.addEventListener('ended',finish);
 audio.addEventListener('loadedmetadata',()=>{
  loadedKey=sourceKey;let saved;try{saved=JSON.parse(sessionStorage.getItem(resumeKey));}catch{}
  if(broadcast)audio.currentTime=resumePosition(saved,sourceKey,audio.duration);apply();
 });
 audio.addEventListener('error',()=>{if(sourceKey){failedKey=sourceKey;$('musicStatus').textContent='Bu şarkı açılamadı. Dosyayı kontrol et veya Sonraki ile devam et.';}});
 audio.addEventListener('timeupdate',()=>{
  if(Date.now()-lastSaved<1000)return;lastSaved=Date.now();savePosition();
  const format=s=>Number.isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'—';
  $('musicTime').textContent=format(audio.currentTime)+' / '+format(audio.duration);
 });
 window.addEventListener('pagehide',savePosition);window.addEventListener('beforeunload',savePosition);
 document.addEventListener('pointerdown',()=>{apply();});
 $('musicToggle').onclick=()=>save({musicPlaying:!state.settings.musicPlaying});
 $('musicPrevious').onclick=()=>control({action:'musicPrevious'});
 $('musicNext').onclick=()=>control({action:'musicNext'});
 $('volume').onchange=()=>save({musicVolume:Number($('volume').value)});
 $('monitorMusic').onchange=()=>{monitor=$('monitorMusic').checked;apply();};
 $('musicFile').onchange=async()=>{
  const input=$('musicFile'),files=[...input.files];if(!files.length)return;input.disabled=true;let added=0;const failures=[];
  try{
   for(const [index,file]of files.entries()){
    $('musicUploadStatus').textContent=(index+1)+' / '+files.length+' yükleniyor · '+file.name;
    try{
     const type=file.type||(/\.wav$/i.test(file.name)?'audio/wav':/\.ogg$/i.test(file.name)?'audio/ogg':'audio/mpeg');
     const r=await fetch('/api/upload/music',{method:'POST',headers:{'Content-Type':type,'X-File-Name':encodeURIComponent(file.name)},body:file}),data=await r.json();
     if(!r.ok)throw Error(data.error);added++;
    }catch(e){failures.push(file.name+': '+e.message);}
   }
  }finally{input.value='';input.disabled=false;$('musicUploadStatus').textContent=added+' şarkı sıraya eklendi.'+(failures.length?' Yüklenemeyenler: '+failures.join(' · '):'');}
 };
 function render(){
  const tracks=state.playlist?.tracks||[],id=state.playlist?.currentId,playing=state.settings.musicPlaying;
  const signature=JSON.stringify([tracks,id,playing]);if(signature===listSignature)return;listSignature=signature;
  $('musicToggle').disabled=!tracks.length;$('musicPrevious').disabled=!tracks.length;$('musicNext').disabled=!tracks.length;
  $('musicToggle').textContent=tracks.length?(playing?'Duraklat':'Başlat'):'Önce şarkı ekle';
  const current=tracks.find(t=>t.id===id);
  $('musicNow').textContent=current?(playing?'Şimdi çalıyor: ':'Duraklatıldı: ')+current.title:'Çalma listesi boş';
  $('musicCount').textContent=tracks.length+' / 100 şarkı · Liste döngüsü açık';
  const list=$('musicPlaylist');list.replaceChildren();
  for(const [index,track]of tracks.entries()){
   const row=document.createElement('li');row.className='music-track'+(track.id===id?' current':'');
   if(track.id===id)row.setAttribute('aria-current','true');
   const title=document.createElement('span');title.className='music-track-title';title.textContent=(index+1)+'. '+track.title;row.append(title);
   const actions=document.createElement('div');actions.className='music-track-actions';
   const button=(text,label,fn,disabled=false)=>{const b=document.createElement('button');b.textContent=text;b.ariaLabel=track.title+' · '+label;b.disabled=disabled;b.onclick=fn;actions.append(b);};
   button('▶','Şimdi çal',()=>control({action:'musicPlay',id:track.id}));
   button('↑','Yukarı taşı',()=>control({action:'musicMove',id:track.id,direction:-1}),index===0);
   button('↓','Aşağı taşı',()=>control({action:'musicMove',id:track.id,direction:1}),index===tracks.length-1);
   button('Kaldır','Listeden kaldır',()=>control({action:'musicRemove',id:track.id}));
   row.append(actions);list.append(row);
  }
 }
 return {receive(next){state=next;render();apply();}};
}
