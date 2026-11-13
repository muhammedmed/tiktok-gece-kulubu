import * as T from 'three';
import {clubLook,CLUB_CUTS,eveningFabricGLSL} from './club-fashion.js';

const BONE_NAMES=['Pelvis','L Thigh','L Calf','L Foot','R Thigh','R Calf','R Foot','Head','Spine2','L Hand','R Hand'];
const point=new T.Vector3();
export function hasEveningOutfit({gender,modelName,costumed,npc}) {
 return gender==='female'&&!costumed&&!npc&&!!CLUB_CUTS[modelName];
}

// Original clothing is still skinned by its original rig. The rest-position
// attribute hides only trousers/skirt/boot shafts beneath the new dress.
function prepareBody(person,assets){
 assets.eveningBodies??=new Map();
 const body=[];person.root.updateMatrixWorld(true);
 person.model.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||/head|opacity/i.test([].concat(mesh.material).map(m=>m.name).join(' ')))return;
  const key=person.modelName+':'+mesh.geometry.uuid;let geometry=assets.eveningBodies.get(key);
  if(!geometry){geometry=mesh.geometry.clone();const positions=new Float32Array(geometry.attributes.position.count*3),arms=new Float32Array(geometry.attributes.position.count),hands=new Float32Array(arms.length);mesh.skeleton.update();
   for(let i=0;i<geometry.attributes.position.count;i++){mesh.getVertexPosition(i,point);mesh.localToWorld(point);person.root.worldToLocal(point);point.toArray(positions,i*3);
    for(let j=0;j<4;j++){const name=mesh.skeleton.bones[geometry.attributes.skinIndex.getComponent(i,j)]?.name||'',weight=geometry.attributes.skinWeight.getComponent(i,j);if(/UpperArm|Forearm|Hand|Finger/.test(name))arms[i]+=weight;if(/Hand|Finger/.test(name))hands[i]+=weight;}
   }
   geometry.setAttribute('eveningArm',new T.BufferAttribute(arms,1));geometry.setAttribute('eveningHand',new T.BufferAttribute(hands,1));
   geometry.setAttribute('eveningRest',new T.BufferAttribute(positions,3));geometry.userData.shared=true;assets.eveningBodies.set(key,geometry);
  }mesh.geometry=geometry;body.push(mesh);
 });return body;
}

function dressGeometry(person,body,look){
 const positions=[],uvs=[],kinds=[],skinIndices=[],weights=[],indices=[];
 const bones=BONE_NAMES.map(n=>person.bone(n));
 const joints=bones.map(b=>person.root.worldToLocal(b.getWorldPosition(new T.Vector3())));
 const hipY=(joints[1].y+joints[4].y)*.5,waist=hipY+.145,hem=look.hem;
 function vertex(x,y,z,u,v,kind,ids,ws){const index=positions.length/3;positions.push(x,y,z);uvs.push(u,v);kinds.push(kind);skinIndices.push(...ids);weights.push(...ws);return index;}
 function quad(a,b,c,d){indices.push(a,b,c,b,d,c);}
 // Measure the central torso, excluding arms. Bounds are cached with geometry.
 function radiusAt(y){let rx=.14,front=.080,back=.095;
  for(const mesh of body){const p=mesh.geometry.attributes.eveningRest;
   for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);if(Math.abs(p.getY(i)-y)>.045||Math.abs(x)>.26||Math.abs(z)>.24)continue;rx=Math.max(rx,Math.abs(x));front=Math.max(front,z);back=Math.max(back,-z);}
  }return [Math.min(rx,.235),Math.min(front,.19),Math.min(back,.19)];
 }
 const [waistX,waistZ,waistBack]=radiusAt(waist),[hipX,hipZ,hipBack]=radiusAt(hipY-.035),segments=32,rows=12;
 for(let row=0;row<=rows;row++){const u=row/rows,y=T.MathUtils.lerp(waist,hem,u),hip=T.MathUtils.smoothstep(waist-y,0,.19),flare=T.MathUtils.smoothstep(hipY-y,.08,.34);
  const rx=T.MathUtils.lerp(waistX,hipX,hip)+.010+.023*flare;
  for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,front=Math.sin(a)>=0,baseDepth=T.MathUtils.lerp(front?waistZ:waistBack,front?hipZ:hipBack,hip),rz=T.MathUtils.lerp(baseDepth,front?.112:baseDepth+.023,flare)+.008,x=Math.cos(a)*rx,z=Math.sin(a)*rz;
   const follow=T.MathUtils.smoothstep(hipY-y,.015,.27)*.94,left=T.MathUtils.smoothstep(x,-.10,.10);
   const pleat=(look.pattern===4?.004:.0015)*Math.sin(a*16+u*5)*u;
   vertex(x+Math.cos(a)*pleat,y,z+Math.sin(a)*pleat,i/segments,u,1,[0,1,4,0],[1-follow,follow*left,follow*(1-left),0]);
   if(row<rows&&i<segments){const k=row*(segments+1)+i;quad(k,k+1,k+segments+1,k+segments+2);}
  }
 }
 // Only exposed legs are modeled: covered thighs must not poke through the
 // blended skirt when the two knees move in opposite directions.
 const seams=[];
 for(const [thigh,calf,foot]of [[1,2,3],[4,5,6]]){
  const start=positions.length/3,[h,k,f]=[joints[thigh],joints[calf],joints[foot]],rows=30,segments=28;
  // Elliptical anatomical sections: slim Achilles/ankle, fuller rear calf,
  // patella and a gentle widening into the thigh. Cubic interpolation avoids
  // the hard ring previously visible where the calf met the knee.
  const lower=k.y-f.y,upper=h.y-k.y;
  const sections=[
   [f.y-.03,.027,.029,.002],[f.y+lower*.15,.029,.033,0],
   [f.y+lower*.40,.046,.052,-.006],[f.y+lower*.65,.058,.061,-.010],
   [f.y+lower*.85,.049,.048,-.004],[k.y,.045,.046,0],
   [k.y+upper*.22,.058,.060,0],[k.y+upper*.55,.076,.078,0],
   [h.y+.025,.082,.082,0],
  ];
  const section=y=>{let i=0;while(i<sections.length-2&&y>sections[i+1][0])i++;const a=sections[i],b=sections[i+1],p=sections[Math.max(0,i-1)],n=sections[Math.min(sections.length-1,i+2)],span=b[0]-a[0],u=T.MathUtils.clamp((y-a[0])/span,0,1),u2=u*u,u3=u2*u;
   return [1,2,3].map(c=>(2*u3-3*u2+1)*a[c]+(u3-2*u2+u)*(b[c]-p[c])/(b[0]-p[0])*span+(-2*u3+3*u2)*b[c]+(u3-u2)*(n[c]-a[c])/(n[0]-a[0])*span);
  };
  for(let row=0;row<=rows;row++){const u=row/rows,y=T.MathUtils.lerp(Math.min(h.y+.025,hem+.008),.035,u),upper=y>=k.y;
   const t=upper?T.MathUtils.clamp((h.y-y)/(h.y-k.y),0,1):T.MathUtils.clamp((k.y-y)/(k.y-f.y),0,1),center=upper?h.clone().lerp(k,t):k.clone().lerp(f,t);
   let [rx,rz,offset]=section(y);const instep=T.MathUtils.smoothstep(f.y-y,0,f.y-.035);
   if(y<f.y){rx=T.MathUtils.lerp(.027,.035,instep);rz=T.MathUtils.lerp(.029,.084,instep);offset=T.MathUtils.lerp(.002,.052,instep);}
   const cw=T.MathUtils.smoothstep(k.y-y,-.09,.09),fw=T.MathUtils.smoothstep(f.y+.07-y,0,.07);
   for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,front=Math.max(0,Math.sin(a)),patella=.004*Math.exp(-(((y-k.y)/.045)**2))*front**4;
    vertex(center.x+Math.cos(a)*rx,y,center.z+offset+Math.sin(a)*rz+patella,i/segments,u,0,[thigh,calf,foot,0],[1-cw,cw*(1-fw),cw*fw,0]);
    if(row<rows&&i<segments){const n=start+row*(segments+1)+i;indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}
   }
   seams.push([start+row*(segments+1),start+row*(segments+1)+segments]);
  }
 }
 // Gold hoops, fine necklace, belt clasp and bracelets share this skin/material.
 function jewel(g,position,bone,rotation=new T.Euler(),kind=2){
  const start=positions.length/3,m=new T.Matrix4().compose(position,new T.Quaternion().setFromEuler(rotation),new T.Vector3(1,1,1)),p=g.attributes.position;
  for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(m);vertex(point.x,point.y,point.z,0,0,kind,[bone,0,0,0],[1,0,0,0]);}
  for(let i=0;i<(g.index?.count||p.count);i++)indices.push(start+(g.index?g.index.getX(i):i));g.dispose();
 }
 const head=joints[7];for(const side of [-1,1])jewel(new T.TorusGeometry(.019,.0028,5,16),new T.Vector3(side*.091,head.y+.018,head.z+.014),7);
 const necklace=new T.TorusGeometry(.071,.0027,5,28);necklace.scale(1,1,1.2);jewel(necklace,new T.Vector3(0,head.y-.125,.025),8,new T.Euler(Math.PI/2,0,0));
 jewel(new T.OctahedronGeometry(.011),new T.Vector3(0,head.y-.14,.111),8);
 jewel(new T.TorusGeometry(.018,.004,5,16),new T.Vector3(.055,waist-.014,waistZ+.016),0);
 for(const side of [9,10])jewel(new T.TorusGeometry(.030,.004,5,14),joints[side].clone(),side,new T.Euler(0,Math.PI/2,0));
 for(const foot of [3,6]){const f=joints[foot];
  const sole=new T.CylinderGeometry(.038,.038,.012,16);sole.scale(1,1,2.7);jewel(sole,new T.Vector3(f.x,.008,f.z+.052),foot,new T.Euler(),3);
  const toe=new T.SphereGeometry(1,12,8);toe.scale(.038,.029,.076);jewel(toe,new T.Vector3(f.x,.042,f.z+.075),foot,new T.Euler(),3);
  jewel(new T.BoxGeometry(.022,.054,.024),new T.Vector3(f.x,.034,f.z-.025),foot,new T.Euler(),3);
  // The ankle and instep are a continuous part of the leg, not a separate ball.
  const heelCup=new T.SphereGeometry(1,12,8);heelCup.scale(.032,.030,.036);jewel(heelCup,new T.Vector3(f.x,.047,f.z-.002),foot,new T.Euler(),3);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setAttribute('eveningSurface',new T.Float32BufferAttribute(kinds,1));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));g.setIndex(indices);g.computeVertexNormals();
 // Duplicate UV seam vertices need the same normal or a vertical polygon edge
 // catches every nightclub spotlight despite smooth shading elsewhere.
 for(const [a,b]of seams){point.fromBufferAttribute(g.attributes.normal,a).add(new T.Vector3().fromBufferAttribute(g.attributes.normal,b)).normalize();g.attributes.normal.setXYZ(a,point.x,point.y,point.z);g.attributes.normal.setXYZ(b,point.x,point.y,point.z);}
 g.userData.shared=true;g.userData.waist=waist;g.userData.legSeams=seams;return g;
}

function outfitMaterial(look){
 const m=new T.MeshPhysicalMaterial({color:0xffffff,roughness:look.roughness,metalness:0,specularIntensity:.28,sheen:.18,sheenRoughness:.6,sheenColor:new T.Color(look.cloth),side:T.DoubleSide,envMapIntensity:.25});
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{eveningSkin:{value:new T.Color(look.skin)},eveningCloth:{value:new T.Color(look.cloth)},eveningPattern:{value:look.pattern}});
  shader.vertexShader='attribute float eveningSurface;varying float vEveningSurface;varying vec2 vEveningUv;varying vec3 vEveningPoint;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvEveningSurface=eveningSurface;vEveningUv=uv;vEveningPoint=position;');
  shader.fragmentShader='varying float vEveningSurface;varying vec2 vEveningUv;varying vec3 vEveningPoint;uniform vec3 eveningSkin,eveningCloth;uniform float eveningPattern;\n'+eveningFabricGLSL+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   diffuseColor.rgb=vEveningSurface<.5?eveningSkin: vEveningSurface<1.5?eveningFabric(vEveningUv,eveningCloth,eveningPattern):vEveningSurface<2.5?vec3(.66,.43,.16):vec3(.016,.012,.020);
   if(vEveningSurface<.5){
    float pores=sin(vEveningUv.x*703.+sin(vEveningUv.y*199.))*sin(vEveningUv.y*887.);
    float warmth=.5+.5*sin(vEveningUv.y*6.5+vEveningUv.x*3.);
    float knee=(vEveningPoint.y-.50)/.055;float kneeTone=exp(-knee*knee)*max(0.,sin(vEveningUv.x*6.283));
    diffuseColor.rgb*=1.+.007*pores;
    diffuseColor.rgb+=vec3(.009,.002,-.001)*warmth+vec3(.010,-.002,-.003)*kneeTone;
   }
  `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nif(vEveningSurface<.5)roughnessFactor=.51;else if(vEveningSurface>1.5)roughnessFactor=.26;')
   .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nif(vEveningSurface>1.5&&vEveningSurface<2.5)metalnessFactor=.72;');
 };m.customProgramCacheKey=()=> 'club-evening-outfit-v2';m.userData.shared=true;
 const far=new T.MeshStandardMaterial();T.MeshStandardMaterial.prototype.copy.call(far,m);far.onBeforeCompile=m.onBeforeCompile;far.customProgramCacheKey=()=> 'club-evening-outfit-v2-far';far.userData.shared=true;m.userData.distantMaterial=far;return m;
}

export function addEveningOutfit(person,assets){
 if(!hasEveningOutfit(person))return;
 const look=clubLook(person.modelName,person.variant),body=prepareBody(person,assets);
 assets.eveningGeometry??=new Map();assets.eveningMaterials??=new Map();const key=person.modelName+':'+look.hem+':'+(look.pattern===4);
 if(!assets.eveningGeometry.has(key))assets.eveningGeometry.set(key,dressGeometry(person,body,look));
 if(!assets.eveningMaterials.has(look.index))assets.eveningMaterials.set(look.index,outfitMaterial(look));
 const material=assets.eveningMaterials.get(look.index),mesh=new T.SkinnedMesh(assets.eveningGeometry.get(key),material),bones=BONE_NAMES.map(n=>person.bone(n));
 mesh.name='eveningDress';mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.fullMaterial=material;mesh.userData.distantMaterial=material.userData.distantMaterial;person.model.add(mesh);
 mesh.bind(new T.Skeleton(bones,bones.map(b=>b.matrixWorld.clone().invert())),person.root.matrixWorld.clone());person.meshes.push(mesh);
 return mesh;
}
