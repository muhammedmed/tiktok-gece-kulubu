// Adult, twenties-inspired evening looks. Shared uniforms keep the 84-person
// floor on the same meshes, skin weights and texture budget.
export const CLUB_PALETTES=[
 {hair:'#241813',cloth:'#142c2a',bottom:'#11151c',lip:'#a74855',eye:'#6b5250',blush:'#c88980',makeup:.96},
 {hair:'#a67c45',cloth:'#b4a38d',bottom:'#191b25',lip:'#b25260',eye:'#8a6d59',blush:'#d59486',makeup:.92},
 {hair:'#40251d',cloth:'#692b43',bottom:'#15151d',lip:'#a63853',eye:'#77555f',blush:'#c5827a',makeup:1.02},
 {hair:'#84462b',cloth:'#24484c',bottom:'#17222f',lip:'#a84c48',eye:'#796245',blush:'#c78b72',makeup:.92},
 {hair:'#211a24',cloth:'#3d354d',bottom:'#11151c',lip:'#a84468',eye:'#685678',blush:'#c8879b',makeup:.98},
 {hair:'#73533b',cloth:'#69747d',bottom:'#1c1b24',lip:'#b04e5a',eye:'#796268',blush:'#d18a84',makeup:.94},
];

// Spread the first ten guests across the collection, rather than giving models
// whose numeric names differ by six the same outfit and hair colour.
export const CLUB_LOOK_OFFSETS={
 'female-party-01':3,'female-party-02':2,'female-adult-03':1,
 'female-adult-11':0,'female-adult-17':5,'female-adult-01':2,
 'female-adult-08':4,'female-adult-13':1,'female-adult-02':0,'female-adult-15':3,
};

// Atlas regions verified against the original body images. Never turn a sleeve
// into exposed skin: the fitted, skinned clothes retain their original coverage.
export function clubFabricRegions(name){
 const middle='step(.33,uv.x)*step(uv.x,.67)';
 const sides='(1.0-step(.32,uv.x)*step(uv.x,.68))';
 const noSkin='(1.0-smoothstep(.035,.105,base.r-base.g))';
 const footIslands='(step(.17,uv.x)*step(uv.x,.33)+step(.67,uv.x)*step(uv.x,.83))*step(uv.y,.29)';
 if(name==='female-party-01')return {
  top:`${middle}*step(uv.y,.83)*${noSkin}`,
  bottom:`${sides}*step(.54,uv.y)*step(uv.y,.675)`,
  shoes:`max(${sides}*step(.83,uv.y),${footIslands})*${noSkin}`,satin:.53,
 };
 if(name==='female-party-02')return {
  top:`${middle}*step(uv.y,.77)`,
  bottom:`${sides}*step(.53,uv.y)*step(uv.y,.655)`,shoes:'0.0',satin:.61,
 };
 if(name==='female-adult-11')return {
  top:`max(${middle},step(.29,uv.y)*step(uv.y,.61))*(1.0-step(.44,uv.x)*step(uv.x,.56)*step(.48,uv.y)*step(uv.y,.63)*(1.0-${noSkin}))`,
  bottom:'0.0',shoes:`max(${sides}*step(.865,uv.y),${footIslands})`,satin:.67,
 };
 if(name==='female-adult-03')return {
  top:'smoothstep(.018,.06,min(base.r,base.b)-base.g)',
  bottom:`${sides}*step(.55,uv.y)*${noSkin}`,shoes:'0.0',satin:.59,
 };
 if(name==='female-adult-01')return {
  top:`max(${middle},step(.25,uv.y)*step(uv.y,.54))*(1.0-smoothstep(.005,.025,base.g-base.b))`,
  bottom:`${sides}*step(.56,uv.y)`,shoes:'0.0',satin:.62,
 };
 if(name==='female-adult-02')return {
  top:`max(${middle}*step(uv.y,.86),step(.29,uv.y)*step(uv.y,.51))*${noSkin}`,
  bottom:`max(${sides}*step(.52,uv.y)*step(uv.y,.76),${middle}*step(.86,uv.y))`,shoes:'0.0',satin:.66,
 };
 if(name==='female-adult-15')return {
  top:`max(${middle},step(.28,uv.y)*step(uv.y,.50))*${noSkin}`,
  bottom:`${sides}*step(.50,uv.y)*step(uv.y,.72)`,shoes:'0.0',satin:.62,
 };
 return {
  top:`max(${middle}*step(uv.y,.87),step(.28,uv.y)*step(uv.y,.54))*${noSkin}`,
  bottom:`${sides}*step(.55,uv.y)*${noSkin}`,shoes:'0.0',satin:.65,
 };
}
