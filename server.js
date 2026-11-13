import http from 'node:http';
import {readFile,stat,mkdir,writeFile,rename,chmod,unlink,open} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {openLive,loadGiftCatalog} from './src/live.js';
import {ClubSession} from './src/session.js';
import {openPlaylist} from './src/playlist.js';
import {DEFAULT_SETTINGS,validateSettings,giftRole} from './public/club-contract.js';
const root=path.dirname(fileURLToPath(import.meta.url)),pub=path.join(root,'public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.woff2':'font/woff2'};
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export async function createClubServer({dataDir=path.join(root,'private'),connectLive=openLive,catalogLoader=loadGiftCatalog}={}){
 await mkdir(dataDir,{recursive:true,mode:0o700});await chmod(dataDir,0o700);
 const configFile=path.join(dataDir,'settings.json'),prefFile=path.join(dataDir,'preferences.json');
 async function load(file,fallback){try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw Error('Yerel ayar dosyası okunamadı: '+path.basename(file));}}
 async function save(file,data){const tmp=file+'.'+randomUUID()+'.tmp';await writeFile(tmp,JSON.stringify(data,null,2),{mode:0o600});await rename(tmp,file);}
 const stored=await load(configFile,{});let settings=validateSettings(stored.settings||DEFAULT_SETTINGS),key=stored.key||process.env.EULER_API_KEY||'';
 settings.videoVersion=stored.settings?.videoVersion||0;settings.musicVersion=stored.settings?.musicVersion||0;settings.handle||=process.env.TIKTOK_LIVE_HANDLE||'';
 const playlist=await openPlaylist(dataDir);
 const preferences=await load(prefFile,{}),session=new ClubSession(settings,preferences);let link={status:'idle',detail:'Bağlantı bekleniyor.'},stopLive,catalog=new Map(),catalogAt=0,catalogPending,updateTimer,prefTimer,mutation=Promise.resolve();
 const clients=new Set();let three=path.join(root,'node_modules/three');try{await stat(three);}catch{three=path.join(root,'../node_modules/three');}
 await stat(path.join(three,'build/three.module.js'));
 const snapshot=()=>({...session.snapshot(),settings,playlist:playlist.snapshot(),link:{...link,handle:settings.handle},configured:!!key});
 function broadcast(){if(updateTimer)return;updateTimer=setTimeout(()=>{updateTimer=null;const msg='data: '+JSON.stringify(snapshot())+'\n\n';for(const res of clients){if(res.writableLength>512000){res.destroy();clients.delete(res);}else res.write(msg);}},35);}
 function savePrefs(){clearTimeout(prefTimer);prefTimer=setTimeout(()=>save(prefFile,preferences).catch(()=>{session.note('Karakter tercihleri diske yazılamadı.');broadcast();}),250);}
 async function gifts(){if(catalogPending)return catalogPending;if(catalog.size&&Date.now()-catalogAt<60000)return catalog;if(!key)fail('Önce Euler anahtarını kaydet.');catalogPending=catalogLoader(key).then(g=>{catalog=g;catalogAt=Date.now();return catalog;}).finally(()=>catalogPending=null);return catalogPending;}
 function disconnect(){session.pauseActivity();stopLive?.();stopLive=null;link={status:'idle',detail:'Bağlantı kapalı.'};}
 function connect(){if(!settings.handle||!key)fail('Kullanıcı adı ve Euler API anahtarı gerekli.');disconnect();if(session.mode!=='live')session.reset();session.mode='live';stopLive=connectLive({handle:settings.handle,key,waitForLive:true,catalog:gifts,canCue:e=>!!giftRole(settings,e),onStatus(status,detail){link={status,detail};if(status==='live')session.resumeActivity();else session.pauseActivity();broadcast();},onEvent(e){if(e.giftId&&e.gift)catalog.set(e.giftId,{name:e.gift,coins:e.coins});session.accept(e);if(e.type==='chat')savePrefs();broadcast();}});broadcast();}
 async function playbackChanged(){settings.musicVersion=Math.max(Date.now(),settings.musicVersion+1);if(!playlist.snapshot().currentId)settings.musicPlaying=false;await save(configFile,{settings,key});session.sequence++;}
 async function control(body){switch(body.action){
  case 'musicPlay':await playlist.select(String(body.id||''));settings.musicPlaying=true;await playbackChanged();break;
  case 'musicNext':case 'musicPrevious':if(await playlist.step(body.action==='musicNext'?1:-1))await playbackChanged();break;
  case 'musicEnded':if(settings.musicPlaying&&body.version===settings.musicVersion&&body.id===playlist.snapshot().currentId){if(await playlist.step(1))await playbackChanged();}break;
  case 'musicRemove':if(await playlist.remove(String(body.id||'')))await playbackChanged();else session.sequence++;break;
  case 'musicMove':await playlist.move(String(body.id||''),body.direction);session.sequence++;break;
  case 'settings':{const next=validateSettings(body.settings,settings);const newKey=body.clearKey?'':body.key?String(body.key).trim():key;if(newKey.length>2048)fail('Anahtar çok uzun.');const accountChange=next.handle!==settings.handle||newKey!==key;if(accountChange){disconnect();catalog.clear();catalogAt=0;session.reset();}await save(configFile,{settings:next,key:newKey});if(next.likeJoinCount!==settings.likeJoinCount){session.likeProgress.clear();session.sequence++;}settings=next;key=newKey;session.settings=settings;break;}
  case 'connect':connect();break;
  case 'disconnect':disconnect();break;
  case 'preview':if(!['idle','error'].includes(link.status))fail('Önce TikTok bağlantısını kes.');session.reset();break;
  case 'clear':session.reset();session.mode=stopLive?'live':'preview';break;
  case 'character':session.select(String(body.id||''),body.gender);savePrefs();break;
  case 'remove':session.players.delete(String(body.id));session.pending.delete(String(body.id));session.waitlist.delete(String(body.id));session.emit('remove',{id:String(body.id)});session.sweepInactive();break;
  case 'test':{if(!['idle','error'].includes(link.status))fail('Bağlı yayında test kapalı.');session.mode='test';const id='test:'+String(body.name||'Deniz').trim().slice(0,32);if(body.gender)session.select(id,body.gender);session.assign({id,name:String(body.name||'Deniz').slice(0,32)},body.role);break;}
  case 'testChat':{if(!['idle','error'].includes(link.status))fail('Bağlı yayında test kapalı.');const id='test:'+String(body.name||'Deniz').trim().slice(0,32);session.accept({type:'chat',id,name:body.name||'Deniz',text:String(body.text||'')});savePrefs();break;}
  default:fail('Geçersiz işlem.');}broadcast();return snapshot();}
 async function bodyJSON(req){let text='';for await(const part of req){text+=part;if(text.length>65536)fail('İstek çok büyük.',413);}try{return JSON.parse(text);}catch{fail('Geçersiz JSON.');}}
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const uploading=new Set();
 async function upload(req,res,kind){
  if(uploading.has(kind))fail('Yükleme sürüyor.',409);
  const type=String(req.headers['content-type']||'').split(';')[0];
  const allowed=kind==='video'?['video/mp4','video/webm']:['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg'];
  if(!allowed.includes(type))fail('Desteklenmeyen medya türü.');
  const limit=kind==='video'?300*1024*1024:100*1024*1024;
  if(Number(req.headers['content-length'])>limit)fail('Dosya çok büyük.',413);
  let title='Yeni şarkı';try{if(req.headers['x-file-name'])title=decodeURIComponent(req.headers['x-file-name']);}catch{fail('Geçersiz dosya adı.');}
  uploading.add(kind);const tmp=path.join(dataDir,kind+'.upload');let file;
  try{
   file=await open(tmp,'w',0o600);let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>limit)fail('Dosya çok büyük.',413);await file.write(chunk);}
   if(!size)fail('Boş dosya.');await file.close();file=null;
   const task=mutation.then(async()=>{
    if(kind==='music'){
     const first=await playlist.append(tmp,{title,type});
     if(first){settings.musicPlaying=true;await playbackChanged();}else session.sequence++;
    }else{
     await rename(tmp,path.join(dataDir,'video.bin'));await save(path.join(dataDir,'video.json'),{type});
     settings.videoVersion=Math.max(Date.now(),settings.videoVersion+1);settings.cameraMode='video';await save(configFile,{settings,key});
    }
   });
   mutation=task.catch(()=>{});await task;broadcast();json(res,200,{ok:true,...(kind==='music'?{playlist:playlist.snapshot()}:{})});
  }finally{await file?.close();await unlink(tmp).catch(()=>{});uploading.delete(kind);}
 }
 async function media(req,res,kind,id){const source=kind==='music'?playlist.media(id):{file:path.join(dataDir,'video.bin'),...(await load(path.join(dataDir,'video.json'),{}))};const {file}=source,info=await stat(file),meta=source;let start=0,end=info.size-1,status=200;const range=req.headers.range;if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2]))fail('Geçersiz aralık.',416);if(!match[1])start=Math.max(0,info.size-Number(match[2]));else {start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}if(start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});return res.end();}status=206;}res.writeHead(status,{'Content-Type':meta.type||'application/octet-stream','Accept-Ranges':'bytes','Content-Length':end-start+1,'Cache-Control':'no-cache',...(status===206?{'Content-Range':`bytes ${start}-${end}/${info.size}`}:{})});if(req.method==='HEAD')res.end();else createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);}
 const server=http.createServer(async(req,res)=>{try{
  const port=server.address().port,hosts=new Set(['127.0.0.1:'+port,'localhost:'+port]);if(!hosts.has(req.headers.host))fail('Geçersiz sunucu adresi.',403);
  if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin))fail('Başka siteden erişim engellendi.',403);
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','SAMEORIGIN');
  const url=new URL(req.url,'http://localhost'),route=decodeURIComponent(url.pathname);
  if(req.method==='POST'&&route==='/api/control'){if(!String(req.headers['content-type']).startsWith('application/json'))fail('JSON gerekli.',415);const body=await bodyJSON(req);const task=mutation.then(()=>control(body)).catch(e=>{if(!e.status&&!e.code)e.status=400;throw e;});mutation=task.catch(()=>{});return json(res,200,await task);}
  if(req.method==='POST'&&['/api/upload/video','/api/upload/music'].includes(route))return await upload(req,res,route.split('/').at(-1));
  if(!['GET','HEAD'].includes(req.method))fail('Yöntem desteklenmiyor.',405);
  if(route==='/api/state')return json(res,200,snapshot());
  if(route==='/api/gifts'){const list=await gifts();return json(res,200,{gifts:[...list].map(([id,g])=>({id,...g}))});}
  if(route==='/api/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write('data: '+JSON.stringify(snapshot())+'\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;}
  if(route==='/media/video'||route==='/media/music')return await media(req,res,route.slice(7));
  if(route.startsWith('/media/music/'))return await media(req,res,'music',route.slice(13));
  let base=route.startsWith('/vendor/')?three:pub,relative=route.startsWith('/vendor/')?route.slice(7):route;if(relative==='/'||relative==='/overlay')relative='/index.html';
  const file=path.resolve(base,'.'+relative);if(!file.startsWith(base+path.sep))fail('Bulunamadı.',404);const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){if(res.headersSent)return res.destroy();json(res,e.status|| (e.code==='ENOENT'?404:500),{error:e.status?e.message:e.code==='ENOENT'?'Dosya bulunamadı.':'İşlem tamamlanamadı. Ayarları ve bağlantıyı kontrol et.'});}});
 const activitySweep=setInterval(()=>{if(link.status==='live'&&session.sweepInactive())broadcast();},5000);activitySweep.unref();
 const ping=setInterval(()=>clients.forEach(r=>r.write(': ping\n\n')),15000);ping.unref();server.on('close',()=>{disconnect();clearInterval(activitySweep);clearInterval(ping);clearTimeout(updateTimer);clearTimeout(prefTimer);});
 return {server,snapshot,session,control,connect,close:async()=>{disconnect();clearTimeout(prefTimer);await save(prefFile,preferences);clients.forEach(r=>r.end());await new Promise(resolve=>server.close(resolve));},autoConnect:settings.autoConnect};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const app=await createClubServer();const port=Number(process.env.PORT)||4320;for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});app.server.listen(port,'127.0.0.1',()=>{console.log(`ÂLÂ Stüdyo: http://127.0.0.1:${port}`);if(app.autoConnect)try{app.connect();}catch(e){console.error(e.message);}});}
