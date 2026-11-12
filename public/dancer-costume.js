import * as T from 'three';
import {dancerLegs} from './dancer-legs.js';
import {DANCER_COLORS,dancerLook} from './dancer-palette.js';
import {floorHeight} from './spatial.js';
import {costumeSurface} from './costume-fit.js';
// Two-piece oriental stage costume: jeweled top, low coin belt and split silk panels.
export {DANCER_COLORS} from './dancer-palette.js';
export function dancerCostume(person){
 const gold=new T.MeshStandardMaterial({color:'#edc46d',metalness:.75,roughness:.27}),gems=new T.MeshStandardMaterial({color:DANCER_COLORS[person.variant%5],metalness:.45,roughness:.2});
 const skin=new T.MeshPhysicalMaterial({color:dancerLook(person.variant).skin,roughness:.58,metalness:0,specularIntensity:.3,envMapIntensity:.32});
 dancerLegs(person,skin);
 const surface=costumeSurface(person),fitted=[],attachments=[],cloths=[],v=new T.Vector3(),q=new T.Quaternion();person.root.updateWorldMatrix(true,true);
 function attach(boneName,center){const bone=person.bone(boneName);if(!bone)return null;const group=new T.Group();person.prop.add(group);const anchor=bone.worldToLocal(person.root.localToWorld(new T.Vector3(...center))),rest=bone.getWorldQuaternion(new T.Quaternion()).invert().multiply(person.root.getWorldQuaternion(new T.Quaternion()));attachments.push({bone,group,anchor,rest});return group;}
 const waist=person.restHipHeight+.015;
 // Each belt point comes from this model's body, without oversized radius floors.
 const anchors=Array.from({length:48},(_,i)=>surface.sample(waist,i/48*Math.PI*2));
 let rx=.14,rz=.10;for(const anchor of anchors)if(anchor){rx=Math.max(rx,Math.abs(anchor.rest.x));rz=Math.max(rz,Math.abs(anchor.rest.z));}
 const hip=attach('Pelvis',[0,waist,0]);
 if(hip){
  const vertices=[],indices=[],segments=64,rows=18,skirtLength=waist-.12,slitAngle=Math.PI*.32;
  for(let row=0;row<=rows;row++){const u=row/rows,flare=.045*u+.30*u*u,gap=.88*T.MathUtils.smoothstep(u,.12,.50);
   for(let i=0;i<=segments;i++){const a=slitAngle+gap/2+i/segments*(Math.PI*2-gap),fold=(.004+.032*u)*Math.cos(a*16+u*.7);
    const radial=.006+flare+fold;vertices.push(Math.cos(a)*(rx+radial),-skirtLength*u,Math.sin(a)*(rz+radial*1.12));
    if(row<rows&&i<segments){const k=row*(segments+1)+i;indices.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2);}
   }
  }
  const skirtAnchors=Array.from({length:segments+1},(_,i)=>surface.sample(waist,slitAngle+i/segments*Math.PI*2));
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));const uvs=[];for(let row=0;row<=rows;row++)for(let i=0;i<=segments;i++)uvs.push(i/segments,row/rows);geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const silk=new T.MeshPhysicalMaterial({color:DANCER_COLORS[person.variant%5],metalness:.04,roughness:.62,side:T.DoubleSide,sheen:.45,sheenColor:new T.Color(DANCER_COLORS[person.variant%5]),sheenRoughness:.5});
  // Fine weave, stitched panels and an embroidered hem instead of a flat cone.
  silk.onBeforeCompile=shader=>{shader.vertexShader='varying vec2 vSilkUv;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSilkUv=uv;');shader.fragmentShader='varying vec2 vSilkUv;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float weave=sin(vSilkUv.x*1800.)*sin(vSilkUv.y*2200.);
   float seams=pow(max(0.,cos(vSilkUv.x*6.283185*12.)),80.);
   float hem=1.-smoothstep(.003,.009,abs(vSilkUv.y-(.94+.008*cos(vSilkUv.x*6.283185*24.))));
   float crystals=pow(max(0.,cos(vSilkUv.x*6.283185*48.)),40.)*(1.-smoothstep(.004,.011,abs(vSilkUv.y-.08)));
   diffuseColor.rgb*=1.+weave*.025-seams*.09;
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.68,.43,.14),hem*.35+crystals*.55);
  `);};silk.customProgramCacheKey=()=> 'dancer-silk-v1';
  const skirt=new T.Mesh(geometry,silk);skirt.name='costumeSkirt';skirt.castShadow=true;skirt.receiveShadow=true;hip.add(skirt);cloths.push({skirt,base:vertices,rows,segments,anchors:skirtAnchors,hip});
  // A narrow fabric waistband follows the exact skin; no detached rigid hoop.
  const beltVertices=[],beltIndices=[];
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2;for(const dy of [.012,-.080-.020*Math.max(0,Math.sin(a))]){const anchor=surface.sample(waist+dy,a)||anchors[i];beltVertices.push(...(anchor?anchor.rest.toArray():[Math.cos(a)*rx,waist+dy,Math.sin(a)*rz]));fitted.push({anchor,index:i*2+(dy<0?1:0)});}const next=(i+1)%48;beltIndices.push(i*2,next*2,i*2+1,i*2+1,next*2,next*2+1);}
  const bandGeometry=new T.BufferGeometry();bandGeometry.setAttribute('position',new T.Float32BufferAttribute(beltVertices,3));bandGeometry.setIndex(beltIndices);bandGeometry.computeVertexNormals();
  const beltMaterial=new T.MeshStandardMaterial({color:DANCER_COLORS[person.variant%5],metalness:.25,roughness:.36});
  const band=new T.Mesh(bandGeometry,beltMaterial);band.name='costumeWaistband';person.prop.add(band);for(const fit of fitted)fit.mesh=band;
  const coins=new T.InstancedMesh(new T.CylinderGeometry(.012,.012,.003,10),gold,32);person.prop.add(coins);
  for(let i=0;i<32;i++)fitted.push({anchor:surface.sample(waist-.072,i/32*Math.PI*2),instance:coins,index:i,angle:i/32*Math.PI*2,drop:.025+(i%2)*.015});
 }
 // Small beads lie on the actual front of the fitted top, not a fixed-width rail.
 const beads=new T.InstancedMesh(new T.SphereGeometry(.005,8,6),gold,15);person.prop.add(beads);
 for(let i=0;i<15;i++){const angle=.40+i/14*(Math.PI-.80);fitted.push({anchor:surface.sample(1.265,angle),instance:beads,index:i,angle,drop:.004});}
 const fringe=new T.InstancedMesh(new T.CylinderGeometry(.0017,.0017,1,5),gold,56);fringe.name='costumeFringe';person.prop.add(fringe);
 for(let i=0;i<40;i++){const angle=i/40*Math.PI*2;fitted.push({anchor:surface.sample(waist-.06,angle),instance:fringe,index:i,angle,fringe:true,length:.07+.06*(.5+.5*Math.sin(angle*5))});}
 for(let i=0;i<16;i++){const angle=.40+i/15*(Math.PI-.80);fitted.push({anchor:surface.sample(1.265,angle),instance:fringe,index:i+40,angle,fringe:true,length:.035+.06*Math.sin(i/15*Math.PI)**2});}
 for(const side of ['L','R']){const hand=person.bone(side+' Hand');if(!hand)continue;const c=person.root.worldToLocal(hand.getWorldPosition(new T.Vector3())).toArray(),group=attach(side+' Hand',c);const b=new T.Mesh(new T.TorusGeometry(.039,.008,6,16),gold);b.rotation.y=Math.PI/2;group?.add(b);}
 for(const side of ['L','R']){const foot=person.bone(side+' Foot');if(foot){const c=person.root.worldToLocal(foot.getWorldPosition(new T.Vector3()));const group=attach(side+' Foot',[c.x,.15,c.z]);const strap=new T.Mesh(new T.TorusGeometry(.034,.003,5,16),gold);strap.rotation.x=Math.PI/2;group?.add(strap);}}
 const head=person.bone('Head');if(head){const c=person.root.worldToLocal(head.getWorldPosition(new T.Vector3()));const group=attach('Head',[c.x,c.y+.09,c.z]);const band=new T.Mesh(new T.TorusGeometry(.09,.005,6,24),gold);band.rotation.x=Math.PI/2;band.scale.y=.85;group?.add(band);const gem=new T.Mesh(new T.OctahedronGeometry(.018),gems);gem.position.set(0,-.02,.083);group?.add(gem);
  // Lightweight chandelier earrings follow the head, never the torso animation.
  for(const side of [-1,1]){const hoop=new T.Mesh(new T.TorusGeometry(.014,.0025,5,12),gold);hoop.position.set(side*.096,-.06,.012);group?.add(hoop);const drop=new T.Mesh(new T.OctahedronGeometry(.012),gems);drop.scale.set(.65,1.7,.65);drop.position.set(side*.096,-.087,.012);group?.add(drop);}
 }
 return {update(t=0){
  person.root.updateWorldMatrix(true,true);person.model.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});surface.prepare();
  for(const {bone,group,anchor,rest}of attachments){group.position.copy(person.root.worldToLocal(bone.localToWorld(v.copy(anchor))));group.quaternion.copy(person.root.getWorldQuaternion(q).invert().multiply(bone.getWorldQuaternion(new T.Quaternion())).multiply(rest));}person.prop.updateWorldMatrix(true,true);
  const dummy=new T.Object3D();
  for(const fit of fitted){if(!fit.anchor)continue;surface.position(fit.anchor,v,fit.fringe?.025:.003);
   if(fit.instance){dummy.scale.set(1,1,1);dummy.position.copy(v);if(fit.fringe){const sway=.08*Math.sin(t*4+fit.angle*3);dummy.position.y-=fit.length*.5;dummy.rotation.set(sway,0,.10*Math.cos(t*3+fit.angle));dummy.scale.y=fit.length;}else{dummy.position.y-=fit.drop;dummy.rotation.set(Math.PI/2,0,fit.angle);}dummy.updateMatrix();fit.instance.setMatrixAt(fit.index,dummy.matrix);fit.instance.instanceMatrix.needsUpdate=true;}
   else{fit.mesh.geometry.attributes.position.setXYZ(fit.index,v.x,v.y,v.z);fit.mesh.geometry.attributes.position.needsUpdate=true;}
  }
  const legCapsules=[];for(const side of ['L','R']){const h=person.bone(side+' Thigh').getWorldPosition(new T.Vector3()),k=person.bone(side+' Calf').getWorldPosition(new T.Vector3()),f=person.bone(side+' Foot').getWorldPosition(new T.Vector3());legCapsules.push({a:h,b:k,r:.10},{a:k,b:f,r:.075});}
  const nearest=new T.Vector3(),axis=new T.Vector3(),radial=new T.Vector3();
  for(const {skirt,base,rows,segments,anchors,hip}of cloths){const rootToHip=new T.Matrix4().copy(hip.matrixWorld).invert().multiply(person.root.matrixWorld),worldToHip=hip.matrixWorld.clone().invert();const a=skirt.geometry.attributes.position;
   for(let i=0;i<a.count;i++){const row=Math.floor(i/(segments+1)),u=row/rows,col=i%(segments+1),wave=Math.sin(t*3.4+col*.32-u*3)*.025*u*u;let x=base[i*3],y=base[i*3+1],z=base[i*3+2];
    const anchor=anchors[col];if(anchor&&row<4){surface.position(anchor,v,.005);v.applyMatrix4(rootToHip);const blend=1-row/4;x+=(v.x-base[col*3])*blend;y+=v.y*blend;z+=(v.z-base[col*3+2])*blend;}
    v.set(x+wave,y,z+Math.sin(t*2.8+col*.22)*.018*u*u).applyMatrix4(hip.matrixWorld);for(const capsule of legCapsules){axis.subVectors(capsule.b,capsule.a);const fraction=T.MathUtils.clamp(radial.subVectors(v,capsule.a).dot(axis)/axis.lengthSq(),0,1);nearest.copy(capsule.a).addScaledVector(axis,fraction);radial.subVectors(v,nearest);const distance=radial.length();if(distance<capsule.r&&distance>.0001)v.copy(nearest).addScaledVector(radial,capsule.r/distance);}
    v.y=Math.max(v.y,floorHeight(v.x,v.z)+.025);v.applyMatrix4(worldToHip);a.setXYZ(i,v.x,v.y,v.z);
   }a.needsUpdate=true;skirt.geometry.computeVertexNormals();
  }
 }};
}
