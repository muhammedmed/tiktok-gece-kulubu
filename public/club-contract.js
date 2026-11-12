export const ROLE_LABELS={dance:'Piste çık',vip:'VIP ol',dancer:'Dansöz ol',saz:'Sazcı ol',drum:'Darbukacı ol',dj:'DJ ol',waiter:'Garson ol',solo:'Sahne Şovu',money:'Para saç',confetti:'Konfeti patlat',hype:'Coştur',endnight:'Geceyi sonlandır'};
export const DEFAULT_SETTINGS={handle:'',autoConnect:false,defaultGender:'ask',chatJoin:true,showGuide:true,cameraMode:'off',cameraSize:26,videoVersion:0,musicVersion:0,musicPlaying:false,musicVolume:.6,assignments:{money:{id:'5655',name:'Gül / Rose'}}};
export function validateSettings(value,previous=DEFAULT_SETTINGS){
 const s={...previous,...value};s.handle=String(s.handle||'').trim().replace(/^@/,'');if(s.handle&&!/^[\w.]{1,24}$/.test(s.handle))throw Error('Geçerli TikTok kullanıcı adı gir.');
 for(const key of ['autoConnect','chatJoin','showGuide','musicPlaying'])if(typeof s[key]!=='boolean')throw Error('Geçersiz ayar.');
 if(!['ask','female','male'].includes(s.defaultGender))throw Error('Geçersiz karakter tercihi.');if(!['off','video','webcam'].includes(s.cameraMode))throw Error('Geçersiz kamera modu.');
 s.cameraSize=Math.max(18,Math.min(38,Number(s.cameraSize)||26));s.musicVolume=Math.max(0,Math.min(1,Number(s.musicVolume)||0));
 const ids=new Set(),assignments={};for(const [role,gift]of Object.entries(s.assignments||{})){if(!Object.hasOwn(ROLE_LABELS,role))throw Error('Geçersiz rol.');if(!gift?.id)continue;const id=String(gift.id);if(!/^\d{1,20}$/.test(id))throw Error('Hediye kimliği sayı olmalı.');if(ids.has(id))throw Error('Bir hediye yalnızca bir eyleme bağlanabilir.');ids.add(id);assignments[role]={id,name:String(gift.name||id).slice(0,80)};}
 return {handle:s.handle,autoConnect:s.autoConnect,defaultGender:s.defaultGender,chatJoin:s.chatJoin,showGuide:s.showGuide,cameraMode:s.cameraMode,cameraSize:s.cameraSize,videoVersion:previous.videoVersion||0,musicVersion:previous.musicVersion||0,musicPlaying:s.musicPlaying,musicVolume:s.musicVolume,assignments};
}
export function giftRole(settings,event){return Object.entries(settings.assignments).find(([,g])=>g.id===String(event.giftId))?.[0]||null;}
