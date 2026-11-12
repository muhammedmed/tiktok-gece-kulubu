import * as T from 'three';
import {spoonGesture} from './solo-motion.js';

const shared=resource=>{resource.userData.shared=true;return resource;};
const wood=shared(new T.MeshStandardMaterial({color:'#a76b36',roughness:.38,metalness:0}));
const bowlWood=shared(new T.MeshStandardMaterial({color:'#c18a4f',roughness:.34,metalness:0,side:T.DoubleSide}));

// Hollow wooden shells, not flattened solid spheres. The inner face is a
// shallow dish; the second surface and rim give it a small real wall thickness.
function bowlGeometry(){
 const vertices=[],indices=[],segments=20,rings=5,stride=segments+1;
 for(let surface=0;surface<2;surface++)for(let ring=0;ring<=rings;ring++){
  const r=ring/rings;
  for(let i=0;i<=segments;i++){
   const a=i/segments*Math.PI*2;
   vertices.push(.13+.048*r*Math.cos(a),-.017*(1-r*r)-(surface?.0035:0),.029*r*Math.sin(a));
  }
 }
 const surfaceSize=(rings+1)*stride;
 for(let surface=0;surface<2;surface++)for(let ring=0;ring<rings;ring++)for(let i=0;i<segments;i++){
  const a=surface*surfaceSize+ring*stride+i,b=a+1,c=a+stride,d=c+1;
  if(surface)indices.push(a,c,b,b,c,d);else indices.push(a,b,c,b,d,c);
 }
 for(let i=0;i<segments;i++){
  const a=rings*stride+i,b=a+1,c=a+surfaceSize,d=c+1;indices.push(a,c,b,b,c,d);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return shared(geometry);
}
const bowl=bowlGeometry();
const handle=shared(new T.LatheGeometry([
 new T.Vector2(0,-.065),new T.Vector2(.007,-.061),new T.Vector2(.008,-.048),
 new T.Vector2(.007,.035),new T.Vector2(.0055,.074),new T.Vector2(.008,.092),new T.Vector2(0,.096),
],12).rotateZ(-Math.PI/2));
const beads=shared(new T.TorusGeometry(.0074,.0011,4,12).rotateY(Math.PI/2));

function spoon(){
 const group=new T.Group(),stem=new T.Mesh(handle,wood),dish=new T.Mesh(bowl,bowlWood);
 group.add(stem,dish);
 // Two carved rings at the handle end make the small prop readable in close shots.
 for(const x of [-.045,-.034]){const ring=new T.Mesh(beads,bowlWood);ring.position.x=x;group.add(ring);}
 group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return group;
}

// Fingers encircle the two handles. No snapping pose is used while holding them:
// a small pressure accent closes the pair without opening or flipping the wrist.
export function applySpoonGrip(person,side,click=0,weight=1){
 const w=T.MathUtils.clamp(weight,0,1),pressure=T.MathUtils.clamp(click,0,1);
 if(w<=0)return;
 const grip=[[.46,.80,.43],[.51,.88,.47],[.60,.98,.53],[.67,1.02,.56]];
 for(let finger=1;finger<=4;finger++)for(const [j,suffix]of ['', '1','2'].entries()){
  const b=person.bone(side+' Finger'+finger+suffix);if(b)b.rotateZ((grip[finger-1][j]+pressure*(finger<3?.055:.025))*w);
 }
 for(const [suffix,curl]of [['',.36],['1',.30],['2',.19]])person.bone(side+' Finger0'+suffix)?.rotateZ(curl*w);
 person.bone(side+' Hand')?.updateWorldMatrix(false,true);
}

export function soloProps(_variant,parent){
 const attachments=[];
 for(const side of ['L','R']){
  const group=new T.Group(),upper=spoon(),lower=spoon();group.add(upper,lower);parent.add(group);
  attachments.push({side,group,upper,lower,gripMatrix:null,person:null});
 }
 const inverseParent=new T.Matrix4(),matrix=new T.Matrix4(),basis=new T.Matrix4(),rotation=new T.Quaternion();
 const forward=new T.Vector3(),normal=new T.Vector3(0,1,0),width=new T.Vector3(),grip=new T.Vector3();
 function bind(item,person){
  const index=person.bone(item.side+' Finger1'),little=person.bone(item.side+' Finger4');
  // Rig hands point local +X towards the fingertips; the knuckle row runs
  // along local Z and is mirrored between hands. Lay the handles across that
  // row, into the curled palm, with the bowls beyond the little-finger edge.
  const direction=index&&little?Math.sign(little.position.z-index.position.z):(item.side==='L'?1:-1);
  forward.set(0,0,direction||1);width.crossVectors(forward,normal).normalize();basis.makeBasis(forward,normal,width);rotation.setFromRotationMatrix(basis);
  grip.set(index&&little?(index.position.x+little.position.x)*.5:.087,.026,index&&little?(index.position.z+little.position.z)*.5:0);
  item.gripMatrix=new T.Matrix4().compose(grip,rotation,new T.Vector3(1,1,1));item.person=person;
 }
 return {update(person,t){
  parent.updateWorldMatrix(true,false);inverseParent.copy(parent.matrixWorld).invert();
  for(const item of attachments){
   const hand=person.bone(item.side+' Hand');if(!hand)continue;
   if(item.person!==person)bind(item,person);
   hand.updateWorldMatrix(true,false);matrix.copy(inverseParent).multiply(hand.matrixWorld).multiply(item.gripMatrix);matrix.decompose(item.group.position,item.group.quaternion,item.group.scale);
   const {click}=spoonGesture(t,item.side),opening=.035+.085*(1-click);
   // Opposed backs meet on the beat. The pivot remains inside the grip;
   // only the wooden bowls open and close a few centimetres beyond the hand.
   item.upper.position.y=.016;item.lower.position.y=-.016;
   item.upper.rotation.set(0,0,opening);item.lower.rotation.set(Math.PI,0,-opening);
  }
 }};
}
