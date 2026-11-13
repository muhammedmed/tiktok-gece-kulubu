import * as T from 'three';
import {clubLook} from './club-fashion.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Build a modest clearance envelope from the actual fitted upper body. Skinning
// the long ends with the chest then keeps this clearance during head turns.
function bodyEnvelope(person){
 const samples=[];person.model.traverse(mesh=>{const p=mesh.geometry?.attributes.eveningRest,arm=mesh.geometry?.attributes.eveningArm;if(!p)return;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(Math.abs(x)<.26&&y>1.08&&y<1.54&&(arm?.getX(i)||0)<.3)samples.push([x,y,z]);}
 });
 const rows=[];for(let y=1.08;y<=1.55;y+=.02){let front=-Infinity,back=Infinity;
  for(const [,sy,z]of samples)if(Math.abs(sy-y)<.045){front=Math.max(front,z);back=Math.min(back,z);}
  rows.push([y,Number.isFinite(front)?front:.065,Number.isFinite(back)?back:-.105]);
 }
 return (y,front)=>{const n=T.MathUtils.clamp((y-1.08)/.02,0,rows.length-1),i=Math.floor(n),a=rows[i],b=rows[Math.min(i+1,rows.length-1)],t=n-i;return T.MathUtils.lerp(a[front?1:2],b[front?1:2],t);};
}

// One cached mesh, two existing bones. No per-frame strand simulation, per-lock
// objects or extra transparent passes, even on the 84-person floor.
export function addEveningHair(person,assets){
 const look=clubLook(person.modelName,person.variant),head=person.bone('Head'),chest=person.bone('Spine2');if(!head||!chest)return;
 assets.eveningHairGeometry??=new Map();assets.eveningHairMaterials??=new Map();
 const key=person.modelName+':'+look.hairStyle;
 if(!assets.eveningHairGeometry.has(key)){
  const parts=[],h=person.root.worldToLocal(head.getWorldPosition(new T.Vector3())),envelope=bodyEnvelope(person);
  function lock(points,radius=.020,front=false){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),g=new T.TubeGeometry(curve,14,radius,6,false),p=g.attributes.position;
   for(let row=0;row<=14;row++){const t=row/14,center=curve.getPointAt(t),taper=(.18+.82*T.MathUtils.smoothstep(t,0,.15))*(1-.96*T.MathUtils.smoothstep(t,.70,1));
    const shoulder=T.MathUtils.smoothstep(h.y-center.y,-.005,.09),boundary=envelope(center.y,front)+(front?1:-1)*(.026+radius*.42),clearZ=front?Math.max(center.z,boundary):Math.min(center.z,boundary),dz=(clearZ-center.z)*shoulder;
    for(let i=0;i<=6;i++){const n=row*7+i;p.setXYZ(n,center.x+(p.getX(n)-center.x)*taper,center.y+(p.getY(n)-center.y)*taper,center.z+dz+(p.getZ(n)-center.z)*taper*.42);}}
   g.computeVertexNormals();parts.push(g);
  }
  if(look.hairStyle==='updo'){
   const bun=new T.SphereGeometry(1,18,12);bun.scale(.068,.062,.057);bun.translate(0,h.y+.15,h.z-.09);parts.push(bun);
   for(const side of [-1,1])lock([[side*.055,h.y+.12,h.z+.01],[side*.10,h.y+.09,h.z+.075],[side*.105,h.y-.04,h.z+.085],[side*.125,h.y-.10,h.z+.05]],.009,true);
  }else if(look.hairStyle==='pony'){
   for(let i=0;i<7;i++){const a=i/7*Math.PI*2;lock([[Math.cos(a)*.026,h.y+.18,h.z-.08],[Math.cos(a)*.033,h.y+.07,h.z-.17],[Math.cos(a)*.03+.015,h.y-.09,h.z-.19],[Math.cos(a)*.016+.045,h.y-.28,h.z-.15]],.018);}
  }else{
   const wave=look.hairStyle==='straight'?.003:look.hairStyle==='curls'?.015:.010,length=look.hairStyle==='straight'?.42:.35;
   for(let i=0;i<13;i++){const a=Math.PI+i/12*Math.PI,points=[];
    for(let row=0;row<=9;row++){const t=row/9,spread=.045+.085*Math.sin(Math.min(1,t*2)*Math.PI/2),ripple=wave*Math.sin(t*16+i*.7);
     points.push([Math.cos(a)*(spread+ripple),h.y+.19-t*(.19+length),h.z+Math.sin(a)*(.08+.025*t)+ripple*.5]);}
    lock(points,.021);
   }
   for(const side of [-1,1])for(let i=0;i<5;i++){const points=[];
    for(let row=0;row<=9;row++){const t=row/9,ripple=wave*Math.sin(t*18+i*.8);points.push([side*(.065+i*.007+.045*Math.sin(Math.min(1,t*3)*Math.PI/2)+.025*t+ripple),h.y+.12-t*(length+.10+i*.009),h.z+.02+.10*Math.sin(Math.min(1,t*2)*Math.PI/2)+ripple]);}
    lock(points,.009,true);
   }
  }
  const g=mergeGeometries(parts);parts.forEach(p=>p.dispose());g.userData.shared=true;
  const count=g.attributes.position.count,ids=new Uint16Array(count*4),weights=new Float32Array(count*4);
  for(let i=0;i<count;i++){const chestWeight=T.MathUtils.smoothstep(h.y-g.attributes.position.getY(i),.005,.125);ids[i*4+1]=1;weights[i*4]=1-chestWeight;weights[i*4+1]=chestWeight;}
  g.setAttribute('skinIndex',new T.BufferAttribute(ids,4));g.setAttribute('skinWeight',new T.BufferAttribute(weights,4));assets.eveningHairGeometry.set(key,g);
 }
 if(!assets.eveningHairMaterials.has(look.index)){
  const m=new T.MeshStandardMaterial({color:look.hair,roughness:.82,metalness:0,envMapIntensity:.20});m.userData.shared=true;
  m.onBeforeCompile=s=>{s.vertexShader='varying vec2 vHairUv;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHairUv=uv;');s.fragmentShader='varying vec2 vHairUv;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat strand=sin(vHairUv.y*175.+sin(vHairUv.x*12.)*.6);diffuseColor.rgb*=.84+.16*strand;');};m.customProgramCacheKey=()=> 'evening-hair-v1';assets.eveningHairMaterials.set(look.index,m);
 }
 const material=assets.eveningHairMaterials.get(look.index),mesh=new T.SkinnedMesh(assets.eveningHairGeometry.get(key),material);mesh.name='eveningHair';mesh.frustumCulled=false;mesh.castShadow=true;mesh.userData.fullMaterial=material;mesh.userData.distantMaterial=material;person.model.add(mesh);
 mesh.bind(new T.Skeleton([head,chest],[head.matrixWorld.clone().invert(),chest.matrixWorld.clone().invert()]),person.root.matrixWorld.clone());person.meshes.push(mesh);return mesh;
}
