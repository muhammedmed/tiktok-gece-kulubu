export function resumePosition(saved,version,duration,now=Date.now()){
 if(!saved||saved.version!==version||!Number.isFinite(saved.position)||saved.position<0||!Number.isFinite(saved.savedAt)||now<saved.savedAt||now-saved.savedAt>1800000||!Number.isFinite(duration)||duration<=0)return 0;
 return saved.position%duration;
}
