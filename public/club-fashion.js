// Adult, twenties-inspired evening looks. Shared uniforms keep the 84-person
// floor on the same meshes, skin weights and texture budget.
export const CLUB_PALETTES=[
 {label:'Bordo · Altın işleme',hair:'#241b1a',cloth:'#701d35',bottom:'#701d35',skin:'#c99c83',lip:'#86243e',eye:'#65434e',blush:'#b67376',makeup:1.18,pattern:0,roughness:.48},
 {label:'Siyah · Çiçekli dantel',hair:'#b28a50',cloth:'#211a23',bottom:'#211a23',skin:'#d0a18a',lip:'#a3455b',eye:'#51404b',blush:'#bd7e79',makeup:1.20,pattern:1,roughness:.55},
 {label:'Gece mavisi · Işıltı',hair:'#19191f',cloth:'#142347',bottom:'#142347',skin:'#bd907b',lip:'#91334e',eye:'#51405f',blush:'#b67380',makeup:1.18,pattern:2,roughness:.35},
 {label:'Şampanya · Brokar',hair:'#743d2c',cloth:'#ba9b76',bottom:'#ba9b76',skin:'#d5a68f',lip:'#994352',eye:'#755343',blush:'#c48278',makeup:1.14,pattern:3,roughness:.42},
 {label:'Mürdüm · Saten',hair:'#bca078',cloth:'#853b5b',bottom:'#853b5b',skin:'#d4a38c',lip:'#9e3659',eye:'#73516c',blush:'#c47f87',makeup:1.16,pattern:4,roughness:.43},
 {label:'Siyah · Zebra',hair:'#231b20',cloth:'#a99a88',bottom:'#a99a88',skin:'#c39a85',lip:'#923b51',eye:'#4f4053',blush:'#b7777d',makeup:1.15,pattern:5,roughness:.51},
];

// Spread the first ten guests across the collection, rather than giving models
// whose numeric names differ by six the same outfit and hair colour.
export const CLUB_LOOK_OFFSETS={
 'female-party-01':0,'female-party-02':1,'female-adult-03':2,
 'female-adult-11':3,'female-adult-17':4,'female-adult-01':5,
 'female-adult-08':1,'female-adult-13':3,'female-adult-02':0,'female-adult-15':2,
};

// Measured adult rigs keep their own faces and hairlines. Cuts are short enough
// for the Ankara steps; no ankle-length simulated cloth in an 84-person crowd.
export const CLUB_CUTS={
 'female-party-01':{hem:.67,hairStyle:'waves'},
 'female-party-02':{hem:.60,hairStyle:'curls'},
 'female-adult-03':{hem:.65,hairStyle:'straight'},
 'female-adult-11':{hem:.56,hairStyle:'updo'},
 'female-adult-17':{hem:.69,hairStyle:'pony'},
 'female-adult-01':{hem:.63,hairStyle:'waves'},
 'female-adult-08':{hem:.70,hairStyle:'waves'},
 'female-adult-13':{hem:.59,hairStyle:'updo'},
 'female-adult-02':{hem:.62,hairStyle:'straight'},
 'female-adult-15':{hem:.66,hairStyle:'waves'},
};
export function clubLook(modelName,variant=0){
 const index=((Math.floor(variant/10)+(CLUB_LOOK_OFFSETS[modelName]||0))%CLUB_PALETTES.length+CLUB_PALETTES.length)%CLUB_PALETTES.length;
 return {...CLUB_PALETTES[index],index,...CLUB_CUTS[modelName]};
}

// Shared by the original fitted bodice and its skinned skirt. Fine details fade
// with derivatives, so lace and sequins do not shimmer in wide camera shots.
export const eveningFabricGLSL=`
float eveningLine(float distance,float width){return 1.-smoothstep(width,width+max(fwidth(distance),.006),abs(distance));}
vec3 eveningFabric(vec2 uv,vec3 tint,float pattern){
 vec2 q=fract(uv*vec2(9.,15.))-.5;
 float angle=atan(q.y,q.x),radius=length(q);
 float flower=eveningLine(radius-(.24+.065*cos(angle*5.)),.018);
 float vine=eveningLine(q.x-.12*sin(q.y*9.),.012);
 float weave=sin(uv.x*500.)*sin(uv.y*600.)*.014;
 vec3 fabric=tint*(.90+weave);
 if(pattern<.5){float motif=max(flower,vine*.6);fabric=mix(fabric,vec3(.22,.12,.035),motif*.64);}
 else if(pattern<1.5){float mesh=eveningLine(sin(uv.x*220.+uv.y*210.),.08);fabric=mix(fabric*.65,vec3(.028,.020,.029),max(flower,vine)*.85);fabric+=mesh*.0015;}
 else if(pattern<2.5){float bead=1.-smoothstep(.09,.09+max(length(fwidth(q)),.04),length(q));fabric+=bead*vec3(.017,.020,.032);}
 else if(pattern<3.5){float leaf=eveningLine(sin(uv.y*90.+sin(uv.x*42.)*3.),.12);fabric=mix(fabric,vec3(.68,.50,.28),max(leaf,flower)*.58);}
 else if(pattern<4.5){float pleat=sin(uv.y*90.+sin(uv.x*8.)*3.);fabric*=.91+.09*pleat;}
 else{float stripe=sin(uv.y*85.+sin(uv.x*19.)*4.+sin(uv.x*43.)*.9);fabric=mix(fabric,vec3(.020,.016,.022),smoothstep(-.15,.12,stripe));}
 return fabric;
}
`;

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
