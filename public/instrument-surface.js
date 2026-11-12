// Conservative interior tests in the instrument's unscaled local coordinates.
// Contact with the surface is allowed; sinking into the body of the instrument is not.
export function insideInstrument(p,role,margin=.006){
 if(role==='saz'){
  if(p.y>.32&&p.y<1.11&&Math.abs(p.x)<.029-margin&&p.z>-.017+margin&&p.z<.035-margin)return true;
  if(p.y<-.28||p.y>.31||p.z>0-margin||p.z<-.135+margin)return false;
  const radius=p.y>.08?.18-(p.y-.08)*.64:.185*Math.sqrt(Math.max(0,1-((p.y+.02)/.28)**2));
  return Math.abs(p.x)<radius-margin&&p.z>-.135*Math.sqrt(Math.max(0,1-(p.x/Math.max(.02,radius))**2-((p.y-.01)/.33)**2))+margin;
 }
 const profile=[[.16,0],[.19,.04],[.14,.12],[.12,.25],[.18,.43],[.25,.51],[.25,.587]];
 if(p.y<margin||p.y>.587-margin)return false;
 const i=profile.findIndex((r,i)=>i>0&&p.y<=r[1]);if(i<1)return false;
 const a=profile[i-1],b=profile[i],r=a[0]+(b[0]-a[0])*(p.y-a[1])/(b[1]-a[1]);
 return Math.hypot(p.x,p.z)<r-margin;
}
