import * as T from 'three';
import {DANCER_COLORS,dancerLook} from './dancer-palette.js';
export {DANCER_LOOKS,dancerLook} from './dancer-palette.js';
// UV landmarks checked against each Rocketbox atlas. These are material layers,
// not painted replacement textures; the original skin pores and fabric folds remain.
const looks={
 'female-adult-11':{hair:'#3b251e',cloth:'#171b25',lip:'#b0244b',eye:'#69405f',makeup:1.08},
 'business-female-03':{hair:'#a36832',cloth:'#183d5c',lip:'#b93950',eye:'#694b63',makeup:1.02},
 'female-adult-02':{hair:'#30211c',cloth:'#273842',lip:'#b12b55',eye:'#73507c',makeup:1.05},
 'female-adult-15':{hair:'#773b2b',cloth:'#193f4e',lip:'#b02b48',eye:'#70475d',makeup:1.05},
 'female-adult-17':{hair:'#bb9054',cloth:'#1e6352',lip:'#b83259',eye:'#735d62',makeup:1.02},
 'female-adult-01':{hair:'#8d5533',cloth:'#8e3150',lip:'#af2753',eye:'#705277',makeup:1.03},
 'male-adult-02':{hair:'#37291e',cloth:'#7d6950'},
 'male-adult-07':{hair:'#2d241c',cloth:'#34383c'},
 'male-adult-10':{hair:'#34271e',cloth:'#76323b'},
 'male-adult-16':{hair:'#6c4630',cloth:'#335d7a'},
 'male-adult-20':{hair:'#2a221e',cloth:'#5d455b'},
 'female-party-02':{hair:'#30201e',cloth:'#221c2c',lip:'#bd3057',eye:'#774365',makeup:1.05},
 'female-party-01':{hair:'#c09559',cloth:'#1c2634',lip:'#b93861',eye:'#785279',makeup:1},
 'female-adult-03':{hair:'#332630',cloth:'#512332',lip:'#b53060',eye:'#664567',makeup:1.02},
 'female-adult-08':{hair:'#643323',cloth:'#205e66',lip:'#ac3653',eye:'#6c4c42',makeup:.9},
 'female-adult-13':{hair:'#b78950',cloth:'#25242c',lip:'#b93650',eye:'#74514a',makeup:.95},
 'male-adult-08':{hair:'#32251e',cloth:'#246c79'},
 'male-adult-11':{hair:'#3b2922',cloth:'#782f43'},
 'male-adult-09':{hair:'#261e1c',cloth:'#454579'},
 'male-adult-12':{hair:'#221b18',cloth:'#27495c'},
 'male-adult-04':{hair:'#261c17',cloth:'#352b39'},
};
const palettes=[
 {hair:'#5d3325',cloth:'#19222c',lip:'#ad284a',eye:'#664a60',makeup:1.02},
 {hair:'#b18752',cloth:'#172f48',lip:'#a33c58',eye:'#6c506a',makeup:.95},
 {hair:'#35212b',cloth:'#522b39',lip:'#ac2b4e',eye:'#654572',makeup:1.05},
 {hair:'#30221d',cloth:'#1c4942',lip:'#b43c4b',eye:'#685146',makeup:.96},
 {hair:'#733c2a',cloth:'#61574d',lip:'#aa344f',eye:'#6c4e74',makeup:.98},
];
export function appearanceVariant(modelName,variant=0){
 const base={hair:'#33251e',cloth:'#263643',lip:'#b23652',eye:'#735260',makeup:modelName.startsWith('female')||modelName.startsWith('business-female')?1:0,...looks[modelName]};
 const offset=[...modelName].reduce((n,c)=>n+c.charCodeAt(0),0)%6;
 const index=((Math.floor(variant/10)+offset)%6+6)%6,look={...base,...(index?palettes[index-1]:{}),index};
 // Natural dark hair on men; avoid the gray dye that made the whole crowd look older.
 if(!modelName.includes('female'))look.hair=['#30231c','#503325','#382720','#231b18','#673f28','#33251e'][index];
 return look;
}
// Atlas-specific fabric regions leave bare arms, neckline, shoes and denim alone.
export function fabricMask(modelName){
 if(modelName==='female-party-01')return 'step(.33,uv.x)*step(uv.x,.67)*step(uv.y,.77)*(1.0-smoothstep(.035,.09,max(base.r,max(base.g,base.b))-min(base.r,min(base.g,base.b))))';
 if(['female-adult-08','female-adult-13'].includes(modelName))return 'step(.335,uv.x)*step(uv.x,.665)*step(uv.y,.76)*(1.0-smoothstep(.025,.075,base.r-base.g))';
 if(modelName==='female-adult-03')return 'smoothstep(.018,.06,min(base.r,base.b)-base.g)';
 if(modelName.startsWith('male-adult')){
  const sleeveEnd=modelName==='male-adult-08'?'.73':modelName==='male-adult-12'?'.75':'.58';
  return `(1.0-smoothstep(.025,.075,base.r-base.g))*max(step(.325,uv.x)*step(uv.x,.675)*step(uv.y,.84),step(.45,uv.y)*step(uv.y,${sleeveEnd}))`;
 }
 return '(1.0-smoothstep(.13,.21,lum))*max(step(.315,uv.x)*step(uv.x,.685),step(.29,uv.y)*step(uv.y,.60))';
}
export function sharedMaterial(assets,source,options){
 assets.materialPool??=new Map();const look=appearanceVariant(options.modelName,options.variant),key=source.uuid+options.modelName+look.index+(options.role==='dancer'?'-dancer-'+options.variant%5:'');
 if(!assets.materialPool.has(key))assets.materialPool.set(key,styleMaterial(source,options));
 return assets.materialPool.get(key);
}
const helpers=`
float clubOval(vec2 uv, vec2 p, vec2 r) {float d=length((uv-p)/r);return 1.0-smoothstep(.55,1.0,d);}
vec3 clubDye(vec3 source,vec3 tint){float l=dot(source,vec3(.2126,.7152,.0722));return tint*(.19+4.2*l);}
// GLSL pow has undefined results for negative bases, including pow(x, 2.0).
float clubSquare(float x){return x*x;}
`;
export function styleMaterial(source,{modelName,gender,variant=0,role}){
 const m=new T.MeshPhysicalMaterial();T.MeshStandardMaterial.prototype.copy.call(m,source);
 const face=/_head/i.test(source.name),hair=/_opacity/i.test(source.name),look=appearanceVariant(modelName,variant);
 const costume=role==='dancer';if(costume){Object.assign(look,dancerLook(variant));look.cloth=DANCER_COLORS[((variant%5)+5)%5];}
 const evening=gender==='female';
 m.metalness=0;m.roughness=face?.49:hair?.48:evening?.46:.68;m.envMapIntensity=face?.32:.38;
 m.specularIntensity=face?.28:hair?.48:.3;if(costume&&face){m.specularIntensity=.36;m.roughness=.53;m.normalScale.multiplyScalar(.58);}m.sheen=face||hair?0:evening?.5:.22;m.sheenRoughness=.68;m.sheenColor.set('#c9b8ae');
 if(costume&&hair){m.roughness=.64;m.specularIntensity=.28;}
 if(hair){m.forceSinglePass=true;m.alphaTest=.19;m.transparent=false;m.depthWrite=true;m.side=T.DoubleSide;}
 if(!look){return m;}
 const uniforms={clubSkin:{value:new T.Color(look.skin||'#d3a184')},clubSkinReference:{value:new T.Color(modelName==='female-adult-17'?'#cd9977':'#c58f6d')},clubBlush:{value:new T.Color(look.blush||'#c87574')},clubHair:{value:new T.Color(look.hair)},clubCloth:{value:new T.Color(look.cloth)},clubLip:{value:new T.Color(look.lip)},clubEye:{value:new T.Color(look.eye)},clubMakeup:{value:look.makeup},clubTexel:{value:new T.Vector2(1/(source.map?.image?.width||1024),1/(source.map?.image?.height||1024))}};
 if(costume&&!face&&!hair){m.normalMap=null;m.bumpMap=null;m.roughnessMap=null;m.roughness=.58;m.sheen=.12;m.sheenColor.set('#eac682');}
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  if(costume&&!face&&!hair){shader.vertexShader='attribute float costumeCoverage;attribute float costumeTorso;varying float vCostumeTorso;attribute vec3 costumeRestPosition;varying float vCostumeCoverage;varying vec3 vCostumeRest;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCostumeCoverage=costumeCoverage;vCostumeRest=costumeRestPosition;vCostumeTorso=costumeTorso;');shader.fragmentShader='varying float vCostumeTorso;varying float vCostumeCoverage;varying vec3 vCostumeRest;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nif(vCostumeRest.y>.125&&vCostumeCoverage<1.0)discard;');}

  shader.fragmentShader='uniform vec3 clubHair,clubCloth,clubLip,clubEye,clubSkin,clubSkinReference,clubBlush;uniform float clubMakeup;uniform vec2 clubTexel;\n'+helpers+shader.fragmentShader;
  let layer='';
  if(face)layer=`
   vec2 uv=vMapUv;vec3 base=diffuseColor.rgb;float lum=dot(base,vec3(.2126,.7152,.0722));
   // Light makeup-like texture smoothing on cheeks/forehead only, preserving eyes and mouth.
   float skinArea=max(clubOval(uv,vec2(.5,.195),vec2(.09,.05)),max(clubOval(uv,vec2(.365,.35),vec2(.055,.055)),clubOval(uv,vec2(.635,.35),vec2(.055,.055))));
   vec2 o=clubTexel*2.0;vec3 soft=(texture2D(map,uv+vec2(o.x,o.y)).rgb+texture2D(map,uv+vec2(-o.x,o.y)).rgb+texture2D(map,uv+vec2(o.x,-o.y)).rgb+texture2D(map,uv-o).rgb)*.25;
   base=mix(base,soft,skinArea*${costume?'.42':'.30'});diffuseColor.rgb=base;
   ${costume?`// Tint skin only; keep iris, teeth, nostrils, brows and the hair islands intact.
   float complexion=step(uv.y,.79)*smoothstep(.035,.12,base.r-base.g)*smoothstep(.025,.10,lum);
   vec3 balanced=base*clubSkin/max(clubSkinReference,vec3(.03));
   base=mix(base,balanced,complexion*.82);diffuseColor.rgb=base;`:''}
   // Leave the central face, eyebrows, ears, eyes and separate mouth/eye islands alone.
   float border=max(1.0-smoothstep(.30,.37,uv.x),smoothstep(.63,.71,uv.x));
   float scalp=max(1.0-smoothstep(.13,.20,uv.y),border*(1.0-smoothstep(.47,.58,uv.y)));
   scalp=max(scalp,step(.38,uv.x)*smoothstep(.79,.86,uv.y));
   float hairMask=scalp*${modelName==='female-party-01'||modelName==='female-adult-13'?'1.0':'(1.0-smoothstep(.055,.12,lum))'};
   ${costume?`float strand=smoothstep(.0,.6,lum);
   vec3 stageHair=clubHair*(.20+strand*1.35);
   diffuseColor.rgb=mix(base,stageHair,hairMask*.94);`:'diffuseColor.rgb=mix(base,clubDye(base,clubHair),hairMask*.91);'}
   ${gender==='female'?`float lips=clubOval(uv,vec2(.5,.407),vec2(.048,.024));
   float shadow=clubOval(uv,vec2(.428,.267),vec2(.042,.017))+clubOval(uv,vec2(.572,.267),vec2(.042,.017));
   float eyeliner=0.0;
   for(int eye=0;eye<2;eye++){
    float cx=eye==0?.428:.572;float ex=(uv.x-cx)/.031;
    float upper=.283-.010*sqrt(max(0.0,1.0-ex*ex));
    eyeliner+=exp(-clubSquare((uv.y-upper)/.0021))*(1.0-smoothstep(.83,1.0,abs(ex)));
   }
   float blush=clubOval(uv,vec2(.368,.358),vec2(.058,.038))+clubOval(uv,vec2(.632,.358),vec2(.058,.038));
   diffuseColor.rgb=mix(diffuseColor.rgb,clubLip*(.55+lum*1.3),min(1.0,lips*.94*clubMakeup));
   diffuseColor.rgb=mix(diffuseColor.rgb,clubEye*(.55+lum),min(1.0,shadow)*.57*clubMakeup);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.018,.009,.016),min(1.0,eyeliner)*.76);
   diffuseColor.rgb=mix(diffuseColor.rgb,${costume?'clubBlush':'vec3(.43,.095,.13)'},min(1.0,blush)*${costume?'.24':'.18'}*clubMakeup);
   ${costume?`float highlight=clubOval(uv,vec2(.382,.326),vec2(.036,.012))+clubOval(uv,vec2(.618,.326),vec2(.036,.012));diffuseColor.rgb+=vec3(.06,.042,.024)*highlight;`:''}
   diffuseColor.rgb=clamp((diffuseColor.rgb-vec3(.18))*1.055+vec3(.18),0.0,1.0);`:''}
  `;
  else if(hair){
   layer=costume?'float strand=smoothstep(.0,.6,dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)));diffuseColor.rgb=clubHair*(.20+strand*1.35);':'diffuseColor.rgb=clubDye(diffuseColor.rgb,clubHair);';
   // Slightly fuller hair cards, without a second overlapping scalp or extra rig.
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed += objectNormal * 0.0025;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','diffuseColor.a=pow(diffuseColor.a,0.72);\n#include <alphatest_fragment>');
  }else{
   const mask=fabricMask(modelName);
   layer=`vec2 uv=vMapUv;vec3 base=diffuseColor.rgb;float lum=dot(base,vec3(.2126,.7152,.0722));
    float fabric=${mask};
    diffuseColor.rgb=mix(base,clubCloth*(.40+sqrt(max(0.0,lum))*1.8),fabric*${costume?'.97':'.82'});${costume?`float bead=pow(max(0.,sin(uv.x*340.)*sin(uv.y*340.)),12.);float embroidery=pow(max(0.,cos(uv.y*85.+sin(uv.x*65.)*3.)),30.);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.86,.59,.18),fabric*(bead*.65+embroidery*.28));`:''}`;
  }
  if(costume&&!face&&!hair)layer=`
   vec2 uv=vMapUv;vec3 base=diffuseColor.rgb;vec3 p=vCostumeRest;
   float torso=1.-smoothstep(.225,.255,abs(p.x));
   float bodyBand=step(.12,p.y);
   // Gentle anatomical shading replaces the old flat, orange body paint.
   float pores=sin(uv.x*890.+sin(uv.y*173.))*sin(uv.y*970.);
   float front=smoothstep(.015,.075,p.z)*torso;
   float navel=exp(-clubSquare(p.x/.009)-clubSquare((p.y-1.06)/.012))*front;
   float waistShade=exp(-clubSquare((p.y-1.02)/.15))*clubSquare(clamp(abs(p.x)/.24,0.,1.));
   vec3 skin=clubSkin*(1.+.012*pores-.07*waistShade-.15*navel);
   skin+=vec3(.013,.007,.004)*exp(-clubSquare(p.x/.10))*front;
   float skinArea=bodyBand;
   diffuseColor.rgb=mix(vec3(.045,.019,.025)*(.6+dot(base,vec3(.2126,.7152,.0722))),skin,skinArea);
   float cupA=length((p.xy-vec2(.095,1.335))/vec2(.113,.079));
   float cupB=length((p.xy-vec2(-.095,1.335))/vec2(.113,.079));
   float edge=min(cupA,cupB);
   float cups=1.-smoothstep(.96,1.02,edge);
   float underband=step(1.255,p.y)*(1.-step(1.295,p.y))*torso;
   float straps=(1.-smoothstep(.012,.023,abs(abs(p.x)-.165)))*step(1.36,p.y)*(1.-step(1.62,p.y));
   float back=step(p.z,.025)*step(1.265,p.y)*(1.-step(1.37,p.y))*torso;
   float top=max(max(cups,underband),max(straps,back))*smoothstep(.60,.95,vCostumeTorso);
   float lum=dot(base,vec3(.2126,.7152,.0722));
   float fittedStraps=(${fabricMask(modelName)})*step(1.36,p.y);
   top=max(top,fittedStraps);
   float bead=pow(max(0.,sin(p.x*610.)*sin(p.y*640.)),18.);
   float scroll=pow(max(0.,cos((p.y-1.30)*220.+sin(abs(p.x)*36.)*3.5)),24.);
   float piping=smoothstep(.84,.96,edge)*cups;
   vec3 fabric=mix(clubCloth*(.72+bead*.35),vec3(.75,.48,.19),clamp(piping*.80+scroll*.70+bead*.60,0.,.95));
   diffuseColor.rgb=mix(diffuseColor.rgb,fabric,top);
  `;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n'+layer);
  if(face&&gender==='female')shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.29,clubOval(vMapUv,vec2(.5,.407),vec2(.048,.024))*.8);');
 };
 m.customProgramCacheKey=()=>`club-look-v14-${gender}-${modelName}-${face?'face':hair?'hair':'cloth'}-${costume?'costume':'guest'}`;
 const distant=new T.MeshStandardMaterial();T.MeshStandardMaterial.prototype.copy.call(distant,m);distant.onBeforeCompile=m.onBeforeCompile;distant.customProgramCacheKey=()=>m.customProgramCacheKey()+'-distant';distant.forceSinglePass=true;m.userData.distantMaterial=distant;
 return m;
}
