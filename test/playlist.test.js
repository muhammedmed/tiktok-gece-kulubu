import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile,stat} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createClubServer} from '../server.js';

async function fixture(t){
 const dataDir=await mkdtemp(path.join(os.tmpdir(),'ala-playlist-'));
 let app=await createClubServer({dataDir});
 const listen=async()=>{await new Promise(r=>app.server.listen(0,'127.0.0.1',r));};await listen();
 t.after(async()=>{await app.close();await rm(dataDir,{recursive:true,force:true});});
 const url=()=> 'http://127.0.0.1:'+app.server.address().port;
 const request=async body=>{const r=await fetch(url()+'/api/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 const upload=async(title,content='0123456789',type='audio/mpeg')=>{const r=await fetch(url()+'/api/upload/music',{method:'POST',headers:{'Content-Type':type,'X-File-Name':encodeURIComponent(title)},body:content});return {status:r.status,body:await r.json()};};
 return {dataDir,url,request,upload,state:()=>app.snapshot(),restart:async()=>{await app.close();app=await createClubServer({dataDir});await listen();}};
}

test('uploads append with original names without restarting or unpausing the current song; list survives restart',async t=>{
 const f=await fixture(t);assert.equal((await f.upload('Şarkı 1.mp3')).status,200);
 const first=f.state(),a=first.playlist.currentId;assert.equal(first.settings.musicPlaying,true);
 await f.request({action:'settings',settings:{musicPlaying:false}});
 await f.upload('Şarkı 2.mp3');await f.upload('Üçüncü 🎵.mp3');
 assert.deepEqual(f.state().playlist.tracks.map(t=>t.title),['Şarkı 1.mp3','Şarkı 2.mp3','Üçüncü 🎵.mp3']);
 assert.equal(f.state().playlist.currentId,a);assert.equal(f.state().settings.musicVersion,first.settings.musicVersion);assert.equal(f.state().settings.musicPlaying,false);
 const before=f.state().playlist;await f.restart();assert.deepEqual(f.state().playlist,before);assert.equal(f.state().settings.musicPlaying,false);
 assert.equal((await stat(path.join(f.dataDir,'playlist.json'))).mode&0o777,0o600);
 const range=await fetch(f.url()+'/media/music/'+a,{headers:{Range:'bytes=2-4'}});assert.equal(range.status,206);assert.equal(await range.text(),'234');
 assert.equal((await fetch(f.url()+'/private/playlist.json')).status,404);
});

test('finished songs advance exactly once across multiple playback windows, wrap, and do not advance while paused',async t=>{
 const f=await fixture(t);await f.upload('A.mp3');await f.upload('B.mp3');await f.upload('C.mp3');
 const initial=f.state(),[a,b,c]=initial.playlist.tracks;
 const ended={action:'musicEnded',id:a.id,version:initial.settings.musicVersion};
 await Promise.all([f.request(ended),f.request(ended)]);assert.equal(f.state().playlist.currentId,b.id);
 await f.request({action:'musicPlay',id:c.id});let current=f.state();
 await f.request({action:'musicEnded',id:c.id,version:current.settings.musicVersion});assert.equal(f.state().playlist.currentId,a.id);
 await f.request({action:'settings',settings:{musicPlaying:false}});current=f.state();
 await f.request({action:'musicEnded',id:a.id,version:current.settings.musicVersion});assert.equal(f.state().playlist.currentId,a.id);
 await f.request({action:'musicPrevious'});assert.equal(f.state().playlist.currentId,c.id);assert.equal(f.state().settings.musicPlaying,false);
 await f.request({action:'musicNext'});assert.equal(f.state().playlist.currentId,a.id);
});

test('reordering keeps current audio, removals choose its successor, and an empty list can be reused',async t=>{
 const f=await fixture(t);for(const name of ['A','B','C'])assert.equal((await f.upload(name)).status,200);
 const [a,b,c]=f.state().playlist.tracks,version=f.state().settings.musicVersion;
 await f.request({action:'musicMove',id:c.id,direction:-1});assert.deepEqual(f.state().playlist.tracks.map(t=>t.id),[a.id,c.id,b.id]);assert.equal(f.state().settings.musicVersion,version);
 assert.equal((await f.request({action:'musicMove',id:c.id,direction:2})).status,400);
 await f.request({action:'musicRemove',id:b.id});assert.equal(f.state().settings.musicVersion,version);
 assert.equal((await fetch(f.url()+'/media/music/'+b.id)).status,404);
 await f.request({action:'musicRemove',id:a.id});assert.equal(f.state().playlist.currentId,c.id);assert.ok(f.state().settings.musicVersion>version);
 const last=f.state().settings.musicVersion;await f.request({action:'musicEnded',id:c.id,version:last});assert.equal(f.state().playlist.currentId,c.id);assert.ok(f.state().settings.musicVersion>last);
 await f.request({action:'musicRemove',id:c.id});assert.equal(f.state().playlist.currentId,null);assert.equal(f.state().settings.musicPlaying,false);
 await f.upload('D');assert.equal(f.state().playlist.tracks.length,1);assert.equal(f.state().settings.musicPlaying,true);
 const stable=f.state().playlist;assert.equal((await f.upload('bad','abc','text/html')).status,400);assert.equal((await f.upload('empty','')).status,400);assert.deepEqual(f.state().playlist,stable);
});

test('rapid sequential uploads release their slot before reporting success',async t=>{
 const f=await fixture(t),names=Array.from({length:30},(_,i)=>'Batch '+i+'.mp3');
 for(const name of names){const result=await f.upload(name);assert.equal(result.status,200,JSON.stringify(result.body));}
 assert.deepEqual(f.state().playlist.tracks.map(t=>t.title),names);
});

test('partial settings updates preserve playback and have an ordered state revision',async t=>{
 const f=await fixture(t);await f.upload('A');await f.upload('B');
 const b=f.state().playlist.tracks[1];await f.request({action:'musicPlay',id:b.id});
 const playing=f.state();await f.request({action:'settings',settings:{musicPlaying:false}});
 const paused=f.state();assert.ok(paused.seq>playing.seq);
 await f.request({action:'settings',settings:{cameraSize:30}});
 assert.ok(f.state().seq>paused.seq);assert.equal(f.state().settings.musicPlaying,false);
 assert.equal(f.state().playlist.currentId,b.id);assert.equal(f.state().settings.musicVersion,paused.settings.musicVersion);
});

test('legacy music migrates once without deleting the original or changing unrelated settings',async t=>{
 const f=await fixture(t);
 await writeFile(path.join(f.dataDir,'music.bin'),'old song',{mode:0o600});await writeFile(path.join(f.dataDir,'music.json'),JSON.stringify({type:'audio/mpeg'}));
 await f.request({action:'settings',settings:{cameraMode:'off',musicVolume:.4}});await f.restart();
 assert.equal(f.state().playlist.tracks.length,1);assert.equal(f.state().playlist.tracks[0].title,'Önceden yüklenen müzik');assert.equal(f.state().settings.musicVolume,.4);
 const id=f.state().playlist.currentId;assert.equal(await (await fetch(f.url()+'/media/music/'+id)).text(),'old song');assert.equal(await readFile(path.join(f.dataDir,'music.bin'),'utf8'),'old song');
 await f.restart();assert.equal(f.state().playlist.currentId,id);assert.equal(f.state().playlist.tracks.length,1);
});
