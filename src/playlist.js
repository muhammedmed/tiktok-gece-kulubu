import {readFile,writeFile,mkdir,rename,copyFile,unlink,stat} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export const MAX_TRACKS=100;
const fail=message=>{throw Object.assign(Error(message),{status:400});};
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(id);
export async function openPlaylist(dataDir){
 const directory=path.join(dataDir,'music'),manifest=path.join(dataDir,'playlist.json');
 await mkdir(directory,{recursive:true,mode:0o700});
 let state={tracks:[],currentId:null};
 const file=id=>{if(!validId(id))fail('Geçersiz şarkı.');return path.join(directory,id+'.bin');};
 async function commit(next){
  const tmp=manifest+'.'+randomUUID()+'.tmp';
  try{await writeFile(tmp,JSON.stringify(next,null,2),{mode:0o600});await rename(tmp,manifest);state=next;}
  finally{await unlink(tmp).catch(()=>{});}
 }
 try{
  state=JSON.parse(await readFile(manifest,'utf8'));
  if(!Array.isArray(state.tracks)||state.tracks.length>MAX_TRACKS||state.tracks.some(t=>!validId(t.id)||typeof t.title!=='string'||typeof t.type!=='string')||new Set(state.tracks.map(t=>t.id)).size!==state.tracks.length)throw Error('Geçersiz çalma listesi.');
  if(!state.tracks.some(t=>t.id===state.currentId))state.currentId=state.tracks[0]?.id||null;
 }catch(e){
  if(e.code!=='ENOENT')throw e;
  // Preserve the existing song and media file when upgrading older installations.
  const legacy=path.join(dataDir,'music.bin');
  try{
   await stat(legacy);let type='audio/mpeg';try{type=JSON.parse(await readFile(path.join(dataDir,'music.json'),'utf8')).type||type;}catch{}
   const id=randomUUID();await copyFile(legacy,file(id));
   await commit({tracks:[{id,title:'Önceden yüklenen müzik',type}],currentId:id});
  }catch(error){if(error.code!=='ENOENT')throw error;}
 }
 return {
  snapshot:()=>({tracks:state.tracks.map(t=>({...t})),currentId:state.currentId}),
  media(id=state.currentId){const track=state.tracks.find(t=>t.id===id);if(!track)throw Object.assign(Error('Şarkı bulunamadı.'),{status:404});return{file:file(id),type:track.type};},
  async append(tmp,{title,type}){
   if(state.tracks.length>=MAX_TRACKS)fail('Çalma listesi en fazla '+MAX_TRACKS+' şarkı alır.');
   const id=randomUUID(),track={id,title:String(title||'Yeni şarkı').normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,160),type},first=!state.tracks.length;
   await rename(tmp,file(id));
   try{await commit({tracks:[...state.tracks,track],currentId:state.currentId||id});}catch(e){await unlink(file(id)).catch(()=>{});throw e;}
   return first;
  },
  async select(id){if(!state.tracks.some(t=>t.id===id))fail('Şarkı bulunamadı.');await commit({...state,currentId:id});return true;},
  async step(direction){if(!state.tracks.length)return false;const index=state.tracks.findIndex(t=>t.id===state.currentId);return this.select(state.tracks[(index+direction+state.tracks.length)%state.tracks.length].id);},
  async remove(id){
   const index=state.tracks.findIndex(t=>t.id===id);if(index<0)fail('Şarkı bulunamadı.');
   const tracks=state.tracks.filter(t=>t.id!==id),changed=state.currentId===id;
   await commit({tracks,currentId:changed?(tracks[index%tracks.length]?.id||null):state.currentId});
   await unlink(file(id)).catch(()=>{});return changed;
  },
  async move(id,direction){
   const index=state.tracks.findIndex(t=>t.id===id);if(index<0||![-1,1].includes(direction))fail('Geçersiz şarkı sırası.');
   const destination=index+direction;if(destination<0||destination>=state.tracks.length)return;
   const tracks=[...state.tracks];[tracks[index],tracks[destination]]=[tracks[destination],tracks[index]];await commit({...state,tracks});
  }
 };
}
