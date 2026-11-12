import {hypePose} from './hype-motion.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {dancePose} from './dance-motion.js';
import {dancerArmTarget} from './dancer-arms.js';
import {dancerPose} from './dancer-motion.js';
import {dancerCostume} from './dancer-costume.js';
import {moneyPose} from './money-motion.js';
import {soloPose} from './solo-motion.js';
import {soloProps,applySpoonGrip} from './solo-props.js';
import {audiencePose} from './solo-audience.js';
import {allModels,chooseModel} from './wardrobe.js';
import {sharedMaterial} from './appearance.js';
import {measureSoles,soleProfile,bindSoles,groundedAnkle,penetration} from './foot-contact.js';
import {floorHeight} from './spatial.js';
import {makeSnapPoses,applySnapPose,snapCycle} from './finger-gesture.js';
import {makeInstrumentGrips,applyInstrumentGrip,orientInstrumentHand} from './instrument-grip.js';
import {drumStroke,sazGesture} from './performance-motion.js';
import {advancePath} from './role-transitions.js';
import {limitWrist} from './wrist-pose.js';
import {makeSaz,makeDrum,glass,cyl,gold,mat} from './environment.js';
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

const clips={idle:'idle_neutral_01',dance:'dancing_neutral',walk:'walk_neutral_01',clap:'claphands_01',cheer:'cheer_01'};
export async function loadPeople(progress,anisotropy=1){let done=0;const total=allModels.length+Object.keys(clips).length*2,models={},animations={female:{},male:{}};await Promise.all([...allModels.map(async n=>{models[n]=(await loader.loadAsync('/assets/characters/'+n+'.glb')).scene;models[n].traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))for(const key of ['map','normalMap','roughnessMap','metalnessMap'])if(m[key]){m[key].anisotropy=anisotropy;m[key].needsUpdate=true;}});progress(++done/total);}),...['female','male'].flatMap(g=>Object.entries(clips).map(async([key,file])=>{const gltf=await loader.loadAsync('/assets/animations/'+g[0]+'_'+file+'.glb');animations[g][key]=gltf.animations[0];progress(++done/total);} ))]);return{models,animations};}
const v=()=>new T.Vector3(),q=()=>new T.Quaternion();
function point(root,a){return root.localToWorld(new T.Vector3(...a));}
function aim(bone,child,target){const a=bone.getWorldPosition(v()),b=child.getWorldPosition(v());const rot=q().setFromUnitVectors(b.sub(a).normalize(),target.clone().sub(a).normalize());const world=bone.getWorldQuaternion(q()).premultiply(rot),parent=bone.parent.getWorldQuaternion(q()).invert();bone.quaternion.copy(parent.multiply(world));bone.updateWorldMatrix(false,true);}
function ik(a,b,c,target,pole){if(!a||!b||!c)return;const A=a.getWorldPosition(v()),B=b.getWorldPosition(v()),C=c.getWorldPosition(v()),l1=A.distanceTo(B),l2=B.distanceTo(C);const d=T.MathUtils.clamp(A.distanceTo(target),Math.abs(l1-l2)+.001,l1+l2-.006),dir=target.clone().sub(A).normalize(),pd=pole.clone().sub(A);pd.addScaledVector(dir,-pd.dot(dir)).normalize();const along=(l1*l1+d*d-l2*l2)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along)),elbow=A.clone().addScaledVector(dir,along).addScaledVector(pd,height);aim(a,b,elbow);aim(b,c,A.clone().addScaledVector(dir,d));}
const normalize=s=>s.replace(/[^a-z0-9]/gi,'').toLowerCase();
export class Person{
 constructor(assets,{name,gender='male',variant=0,modelName=null,role='dance',npc=false,danceSlot=null,x=0,z=0,y=0,yaw=0},scene,labels){
  this.name=name;this.npc=npc;this.gender=gender;this.variant=variant;this.meshes=[];this.lastPoseTime=-1;this.danceSlot=danceSlot;this.role=role;this.seed=variant*1.63+Math.random()*8;this.root=new T.Group();scene.add(this.root);this.root.position.set(x,y,z);this.root.rotation.y=yaw;this.baseY=y;this.target=null;this.path=[];
  this.costumed=role==='dancer';this.modelName=modelName||chooseModel(gender,variant,role);this.model=clone(assets.models[this.modelName]);this.root.add(this.model);this.bones={};this.model.traverse(o=>{if(o.isBone)this.bones[normalize(o.name)]=o;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;this.meshes.push(o);const materials=Array.isArray(o.material)?o.material:[o.material];o.material=materials.map(m=>sharedMaterial(assets,m,{modelName:this.modelName,gender,variant,role}));if(o.material.length===1)o.material=o.material[0];o.userData.fullMaterial=o.material;o.userData.distantMaterial=Array.isArray(o.material)?o.material.map(m=>m.userData.distantMaterial||m):o.material.userData.distantMaterial||o.material;}});
  this.restBones=Object.values(this.bones).map(b=>({bone:b,position:b.position.clone(),quaternion:b.quaternion.clone()}));
  this.snapPoses=null;this.instrumentGrips=null;
  this.root.updateMatrixWorld(true);this.footRest={};for(const side of ['L','R']){const foot=this.bone(side+' Foot');if(foot)this.footRest[side]=this.root.getWorldQuaternion(q()).invert().multiply(foot.getWorldQuaternion(q()));}
  this.restHipHeight=(this.root.worldToLocal(this.bone('L Thigh').getWorldPosition(v())).y+this.root.worldToLocal(this.bone('R Thigh').getWorldPosition(v())).y)/2;
  if(this.costumed){assets.costumeGeometries??=new Map();const waist=this.restHipHeight+.015;this.model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const key=this.modelName+mesh.geometry.uuid;let geometry=assets.costumeGeometries.get(key);if(!geometry){geometry=mesh.geometry.clone();const heights=new Float32Array(geometry.attributes.position.count),restPositions=new Float32Array(geometry.attributes.position.count*3),torsoWeights=new Float32Array(geometry.attributes.position.count),position=new T.Vector3();mesh.skeleton.update();for(let i=0;i<heights.length;i++){mesh.getVertexPosition(i,position);mesh.localToWorld(position);this.root.worldToLocal(position);heights[i]=(position.y-.12)/(waist-.12);position.toArray(restPositions,i*3);for(let j=0;j<4;j++){const bone=mesh.skeleton.bones[geometry.attributes.skinIndex.getComponent(i,j)];if(/Spine|Pelvis|Clavicle|Neck/.test(bone?.name||''))torsoWeights[i]+=geometry.attributes.skinWeight.getComponent(i,j);}}// Smooth the old blouse's tied fabric only at the dancer's waist.
   // Arms and the rest of the shared guest mesh remain untouched.
   if(!/head|opacity/i.test([].concat(mesh.material).map(m=>m.name).join(' '))){const local=new T.Vector3(),restToMesh=new T.Matrix4().copy(mesh.matrixWorld).invert().multiply(this.root.matrixWorld);for(let i=0;i<heights.length;i++){const x=restPositions[i*3],y=restPositions[i*3+1],z=restPositions[i*3+2];if(torsoWeights[i]<.85||y<waist+.025||y>waist+.23)continue;const fade=Math.sin(Math.PI*(y-waist-.025)/.205),rx=.18-.018*fade,rz=.126-.012*fade,d=Math.hypot(x/rx,z/rz);if(d>1){restPositions[i*3]=x/d;restPositions[i*3+2]=z/d;const skinMatrix=new T.Matrix4();skinMatrix.elements.fill(0);for(let j=0;j<4;j++){const weight=geometry.attributes.skinWeight.getComponent(i,j),offset=geometry.attributes.skinIndex.getComponent(i,j)*16;for(let k=0;k<16;k++)skinMatrix.elements[k]+=mesh.skeleton.boneMatrices[offset+k]*weight;}skinMatrix.premultiply(mesh.bindMatrixInverse).multiply(mesh.bindMatrix).invert();local.set(x/d,y,z/d).applyMatrix4(restToMesh).applyMatrix4(skinMatrix);geometry.attributes.position.setXYZ(i,local.x,local.y,local.z);}}geometry.computeVertexNormals();}
   geometry.setAttribute('costumeTorso',new T.BufferAttribute(torsoWeights,1));geometry.setAttribute('costumeCoverage',new T.BufferAttribute(heights,1));geometry.setAttribute('costumeRestPosition',new T.BufferAttribute(restPositions,3));assets.costumeGeometries.set(key,geometry);}mesh.geometry=geometry;});}
  assets.soleProfiles??=new Map();const feet={L:this.bone('L Foot'),R:this.bone('R Foot')},soleKey=this.modelName+(this.costumed?'-costume':''),profile=assets.soleProfiles.get(soleKey);this.soles=profile?bindSoles(profile,this.model,feet):measureSoles(this.model,this.root,feet);if(!profile)assets.soleProfiles.set(soleKey,soleProfile(this.soles));
  this.mixer=new T.AnimationMixer(this.model);this.actions={};
  const boneNames=new Set();this.model.traverse(o=>boneNames.add(o.name));
  for(const [key,src]of Object.entries(assets.animations[gender])){const clip=src.clone();clip.tracks=clip.tracks.filter(tr=>{const n=tr.name.slice(0,tr.name.lastIndexOf('.'));return boneNames.has(n)&&tr.name.endsWith('.quaternion');});this.actions[key]=this.mixer.clipAction(clip);}
  this.tag=document.createElement('div');this.tag.className='name-tag';this.tag.hidden=npc;this.tag.innerHTML='<em></em><span></span>';this.tag.querySelector('em').textContent=name.slice(0,1).toLocaleUpperCase('tr');this.tag.querySelector('span').textContent=name;labels.append(this.tag);
  this.prop=new T.Group();this.root.add(this.prop);this.current=null;this.setRole(role);this.mixer.update(Math.random()*12);this.root.updateMatrixWorld(true);
 }
 setDetail(distant){if(this.distant===distant)return;this.distant=distant;for(const mesh of this.meshes)mesh.material=distant?mesh.userData.distantMaterial:mesh.userData.fullMaterial;}
 calibrate(factory){const current=this.restBones.map(r=>({bone:r.bone,q:r.bone.quaternion.clone(),p:r.bone.position.clone()}));for(const r of this.restBones){r.bone.quaternion.copy(r.quaternion);r.bone.position.copy(r.position);}this.root.updateMatrixWorld(true);const result=factory();for(const r of current){r.bone.quaternion.copy(r.q);r.bone.position.copy(r.p);}this.root.updateMatrixWorld(true);return result;}
 ensureGrips(){if(!this.instrumentGrips)this.instrumentGrips=this.calibrate(()=>makeInstrumentGrips(name=>this.bone(name)));}
 ensureSnap(){if(!this.snapPoses)this.snapPoses=this.calibrate(()=>makeSnapPoses(name=>this.bone(name)));}
 bone(s){return this.bones[normalize('Bip01 '+s)];}
 play(key){if(this.current===key)return;const next=this.actions[key];if(!next)return;const prev=this.actions[this.current];next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();if(prev)prev.crossFadeTo(next,.7,false);this.current=key;}
 clearProps(){const geometries=new Set(),materials=new Set();this.prop.traverse(o=>{if(!o.isMesh)return;if(o.isInstancedMesh)o.dispose();if(o.userData.costumeSkeleton)o.skeleton.dispose();if(!o.geometry.userData.shared)geometries.add(o.geometry);for(const m of [].concat(o.material))if(!m.userData.shared)materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.prop.clear();}
 setRole(role){this.role=role;this.soloAudience=null;this.lastPoseTime=-1;this.dancePartner=null;this.danceBlend=0;this.model.position.x=0;this.model.position.z=0;this.clearProps();this.costumeAccessories=null;this.model.position.y=['table','vip'].includes(role)?-.28:['saz','drum'].includes(role)?-.36:0;
  if(role==='saz'){this.ensureGrips();this.instrument=makeSaz();this.instrument.position.set(-.29,.86,this.modelName==='male-adult-04'?.33:.31);this.instrument.rotation.z=-1.02;this.instrument.scale.setScalar(.76);this.prop.add(this.instrument);const pickGeometry=new T.BufferGeometry();pickGeometry.setAttribute('position',new T.Float32BufferAttribute([-.01,0,.008,.01,0,.008,0,0,-.043],3));pickGeometry.computeVertexNormals();this.pick=new T.Mesh(pickGeometry,new T.MeshStandardMaterial({color:'#f4dfae',side:T.DoubleSide,roughness:.5}));this.instrument.add(this.pick);}
  if(role==='drum'){this.instrument=makeDrum();this.instrument.position.set(.40,.65,.11);this.instrument.rotation.set(.95,0,.40);this.instrument.scale.setScalar(.66);this.prop.add(this.instrument);}
  if(role==='table'||role==='vip'){this.cup=glass(this.prop,.28,.9,.35);}
  if(role==='waiter'){this.waiterOrigin=this.root.position.clone();this.waiterStart=null;this.tray=new T.Group();this.tray.position.set(.35,1.13,.4);this.prop.add(this.tray);cyl([0,0,0],.31,.31,.025,gold,this.tray);for(let i=0;i<3;i++)glass(this.tray,(i-1)*.16,.015,0);}
  if(this.costumed)this.costumeAccessories=this.calibrate(()=>dancerCostume(this));
  this.play(role==='waiter'?'walk':'idle');
 }
 placeAt(position,role,yaw=0){this.walking=false;this.path=[];this.entryPending=false;this.entryReleaseAt=null;this.root.position.set(...position);this.root.rotation.y=yaw;this.baseY=position[1];this.prop.visible=true;this.setRole(role);}
 walkTo(points,role,yaw=0,duration=null){this.entryPending=false;this.entryReleaseAt=null;this.dancePartner=null;this.danceFacing=undefined;this.model.position.x=0;this.model.position.z=0;this.destinationRole=role;this.destinationYaw=yaw;this.path=points.map(p=>new T.Vector3(...p));this.model.position.y=0;this.prop.visible=false;this.play('walk');this.walking=true;const length=this.path.reduce((sum,pt,i)=>sum+pt.distanceTo(i?this.path[i-1]:this.root.position),0);this.walkSpeed=duration?length/duration:1.15;this.actions.walk?.setEffectiveTimeScale(Math.min(1.6,Math.max(1,this.walkSpeed/1.15)));}
 arms(left,right){for(const [s,target]of [['L',left],['R',right]]){ik(this.bone(s+' UpperArm'),this.bone(s+' Forearm'),this.bone(s+' Hand'),point(this.root,target),point(this.root,[s==='L'?.55:-.55,.9,.05]));}}
 handAim(side,target){const hand=this.bone(side+' Hand'),finger=this.bone(side+' Finger1');if(hand&&finger)aim(hand,finger,point(this.root,target));}
 seated(t){
  const musician=this.role==='saz'||this.role==='drum',height=musician?.55:.50;
  // Seat from measured hip height; the old fixed offset left taller rigs hovering.
  this.model.position.set(0,height+.07-this.restHipHeight,.065);
  this.root.updateWorldMatrix(true,true);
  this.rotateBody(this.bone('Spine1'),[1,0,0],musician?.065:.025);
  this.rotateBody(this.bone('Head'),[0,1,0],Math.sin(t*.32+this.seed)*.065);
  const cacheKey=musician?'musician':'guest';this.seatClearance??={};
  const cached=this.seatClearance[cacheKey],clearance=cached||{L:0,R:0};
  for(let pass=0;pass<(cached?1:6);pass++){
   for(const s of ['L','R']){const sign=s==='L'?1:-1,foot=this.bone(s+' Foot');if(!foot||!this.soles[s])continue;
    const world=this.root.getWorldQuaternion(q()).multiply(this.footRest[s]);
    const spread=musician?.23:this.gender==='female'?.115:.17;
    const target=groundedAnkle(this.soles[s],world,point(this.root,[sign*spread,0,.42+(s==='L'?.025:0)]),clearance[s]);
    ik(this.bone(s+' Thigh'),this.bone(s+' Calf'),foot,target,point(this.root,[sign*(spread+.035),.48,.73]));
    foot.quaternion.copy(foot.parent.getWorldQuaternion(q()).invert().multiply(world));foot.updateWorldMatrix(false,true);
   }
   if(cached)break;
   this.model.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});let depth=0;
   for(const s of ['L','R']){let correction=0;for(const {mesh,index}of this.soles[s].samples){const p=mesh.getVertexPosition(index,v()).applyMatrix4(mesh.matrixWorld);correction=Math.max(correction,floorHeight(p.x,p.z)+.002-p.y);}
    clearance[s]+=correction*1.4;depth=Math.max(depth,correction);
   }if(depth<.0005)break;
  }
  this.seatClearance[cacheKey]=clearance;
 }
 instrumentHand(side,contact,direction,normal,curl=.08,anchor=null){
  const hand=this.bone(side+' Hand');if(!hand)return;
  const forward=direction.clone().normalize(),palm=normal.clone().negate();palm.addScaledVector(forward,-palm.dot(forward)).normalize();
  const across=forward.clone().cross(palm).normalize(),orientation=q().setFromRotationMatrix(new T.Matrix4().makeBasis(forward,palm,across));
  const offset=anchor||new T.Vector3(.105,0,0),wrist=contact.clone().sub(offset.clone().applyQuaternion(orientation));
  const pole=point(this.root,[side==='L'?.54:-.60,this.role==='drum'?1.16:side==='R'?1.28:this.modelName==='male-adult-04'?.68:.76,.55]);
  ik(this.bone(side+' UpperArm'),this.bone(side+' Forearm'),hand,wrist,pole);
  orientInstrumentHand(hand,orientation);
  if(!anchor)for(let f=1;f<=4;f++)for(const [joint,factor]of [['',1],['1',.7],['2',.4]])this.bone(side+' Finger'+f+joint)?.rotateZ(curl*factor);
  this.handTargets??={};this.handTargets[side]=wrist;
 }
 performInstrument(t){
  this.instrument.updateWorldMatrix(true,true);
  const instrumentPoint=a=>this.instrument.localToWorld(new T.Vector3(...a));
  if(this.role==='saz'){
   const gesture=sazGesture(t),rotation=this.instrument.getWorldQuaternion(q()),normal=new T.Vector3(0,0,1).applyQuaternion(rotation);
   const left=instrumentPoint([-.015,gesture.fret,.10]),right=instrumentPoint([gesture.pluck,.12,.08+gesture.lift]);this.pick?.position.set(gesture.pluck,.12,.08+gesture.lift);
   applyInstrumentGrip(this.instrumentGrips.L);applyInstrumentGrip(this.instrumentGrips.R);
   this.instrumentHand('L',left,new T.Vector3(-1,.12,0).applyQuaternion(rotation),normal,0,this.instrumentGrips.L.anchor);
   this.instrumentHand('R',right,new T.Vector3(1,-.25,0).normalize().applyQuaternion(rotation),normal,0,this.instrumentGrips.R.anchor);
   // Independent fretting fingers lift between notes, without moving the supporting thumb.
   for(let f=1;f<=3;f++)this.bone('L Finger'+f+'1')?.rotateZ(f===gesture.activeFinger?gesture.press*.10:-.08);
  }else{
   const rotation=this.instrument.getWorldQuaternion(q()),normal=new T.Vector3(0,1,0).applyQuaternion(rotation);
   for(const side of ['L','R']){const stroke=drumStroke(t,side),x=side==='L'?.155:-.055,z=side==='L'?.025:.035;
    const contact=instrumentPoint([x,.69+stroke.lift,z]),forward=new T.Vector3(side==='L'?-.50:.35,0,1).normalize().applyQuaternion(rotation);
    this.instrumentHand(side,contact,forward,normal,-.12);this.bone(side+' Finger0')?.rotateZ(-.30);
   }
  }
 }
 keepSolesAboveFloor(){this.root.updateWorldMatrix(true,true);const depth=Math.max(0,...Object.values(this.soles).map(penetration));if(depth>0){this.model.position.y+=depth;this.root.updateWorldMatrix(true,true);}}

 update(dt,t){this.lastPoseTime=t;for(const r of this.restBones){r.bone.position.copy(r.position);r.bone.quaternion.copy(r.quaternion);}if(this.walking||!['dance','dancer','table','vip','saz','drum'].includes(this.role))this.mixer.update(dt);
  // Do not layer a breathing/idle clip over authored dance IK: it makes shoulders and knees drift.

  this.root.updateMatrixWorld(true);
  if(this.walking){this.model.position.y=0;if(this.entryPending){this.keepSolesAboveFloor();return;}const diff=advancePath(this.root.position,this.path,dt*(this.walkSpeed??1.15));if(diff){const yaw=Math.atan2(diff.x,diff.z),delta=Math.atan2(Math.sin(yaw-this.root.rotation.y),Math.cos(yaw-this.root.rotation.y));this.root.rotation.y+=delta*Math.min(1,dt*12);}if(!this.path.length){this.walking=false;this.root.rotation.y=this.destinationYaw;this.baseY=this.root.position.y;this.prop.visible=true;this.setRole(this.destinationRole);}this.keepSolesAboveFloor();return;}
  // SoloShow owns these temporary paths without changing the reserved role or
  // dance slot. Use the walking clip on the way in, then switch to applause.
  if(this.soloAudience?.moving&&!this.solo&&this.role==='dance'){
   const a=this.soloAudience;this.play('walk');this.actions.walk?.setEffectiveTimeScale(Math.min(2.4,Math.max(.7,a.speed/1.15)));this.mixer.update(dt);
   const yaw=Math.atan2(a.direction.x,a.direction.z),delta=Math.atan2(Math.sin(yaw-this.root.rotation.y),Math.cos(yaw-this.root.rotation.y));this.root.rotation.y+=delta*(1-Math.exp(-dt*12));this.danceFacing=this.root.rotation.y;this.danceBlend=0;
   this.model.position.set(0,floorHeight(this.root.position.x,this.root.position.z)-this.root.position.y,0);this.keepSolesAboveFloor();return;
  }
  if(this.role==='dance'||this.role==='dancer'){this.oyunHavasi(dt,t);if(this.solo){this.soloAccessory??=soloProps(this.solo.variant,this.prop);this.soloAccessory.update(this,t-this.solo.startedAt);}}
  if(['table','vip','saz','drum'].includes(this.role)){this.seated(t);}
  if(this.role==='table'||this.role==='vip'){const sip=Math.pow(Math.max(0,Math.sin(t*.45+this.seed)),6);const mouth=this.root.worldToLocal(this.facePosition());const r=[-.23+.15*sip,.72+(mouth.y-.10-.72)*sip,.37-.12*sip];this.arms([.18,.65,.35],r);this.cup.position.set(r[0],r[1]-.13,r[2]+.045);this.cup.rotation.x=-sip*.5;}
  if(this.role==='saz'||this.role==='drum')this.performInstrument(t);
  if(this.role==='dj'){this.arms([.35,1.27+Math.sin(t*1.4)*.05,.43],[-.4,1.25,.45]);}
  if(this.role==='waiter'){this.model.position.y=0;this.waiterStart??=t;const phase=(t-this.waiterStart)*.23;this.arms([.34,1.13,.4],[-.22,.9,.1]);this.root.position.x=this.waiterOrigin.x+Math.sin(phase*.7)*.12;this.root.position.z=this.waiterOrigin.z+Math.sin(phase)*3;const yaw=Math.cos(phase)>0?0:Math.PI,delta=Math.atan2(Math.sin(yaw-this.root.rotation.y),Math.cos(yaw-this.root.rotation.y));this.root.rotation.y+=delta*Math.min(1,dt*5);}

  this.keepSolesAboveFloor();this.costumeAccessories?.update(t);
 }
 rotateBody(bone,axis,angle){if(!bone)return;const worldAxis=new T.Vector3(...axis).applyQuaternion(this.root.getWorldQuaternion(q()));const world=bone.getWorldQuaternion(q()).premultiply(q().setFromAxisAngle(worldAxis,angle));bone.quaternion.copy(bone.parent.getWorldQuaternion(q()).invert().multiply(world));bone.updateWorldMatrix(false,true);}
 oyunHavasi(dt,t){
  const slot=this.danceSlot??0,pair=Math.floor(slot/2),side=slot%2?1:-1;
  const pose=this.moneyInteraction?moneyPose(t-this.moneyInteraction.startedAt,this.moneyInteraction.receiver,t,this.variant):this.solo?soloPose(t-this.solo.startedAt,this.solo.variant):this.soloAudience?audiencePose(t,this.soloAudience,pair,side):this.role==='dancer'?dancerPose(t,this.variant):this.hypeStartedAt!=null?hypePose(t,t-this.hypeStartedAt,pair,side,this.variant,this.hypeTravel?.weight||0):dancePose(t,pair,side);this.dancePhrase=pose.phrase+' · '+pose.stepName;
  const surfaceOffset=floorHeight(this.root.position.x,this.root.position.z)-this.root.position.y;
  this.danceBlend=Math.min(1,(this.danceBlend||0)+dt*1.6);const blend=this.danceBlend*this.danceBlend*(3-2*this.danceBlend);
  this.play('idle');
  if(this.solo)this.danceFacing=0;
  else if(this.soloAudience){const center=this.soloAudience.center,desired=Math.atan2(center.x-this.root.position.x,center.z-this.root.position.z);this.danceFacing??=this.root.rotation.y;this.danceFacing+=Math.atan2(Math.sin(desired-this.danceFacing),Math.cos(desired-this.danceFacing))*(1-Math.exp(-dt*4));}
  else if(this.dancePartner&&!this.moneyInteraction){const dx=this.dancePartner.root.position.x-this.root.position.x,dz=this.dancePartner.root.position.z-this.root.position.z;const desired=Math.atan2(dx,dz);if(this.danceFacing===undefined)this.danceFacing=this.root.rotation.y;this.danceFacing+=Math.atan2(Math.sin(desired-this.danceFacing),Math.cos(desired-this.danceFacing))*(1-Math.exp(-dt*4));}
  else if(this.danceFacing===undefined)this.danceFacing=this.root.rotation.y;
  this.root.rotation.y=this.danceFacing+pose.turn*blend;
  this.model.position.set(pose.body.x*blend,pose.body.y*blend+surfaceOffset,pose.body.z*blend);this.root.updateMatrixWorld(true);
  if(this.role==='dancer'){this.rotateBody(this.bone('Pelvis'),[0,1,0],pose.hipTwist*blend);this.rotateBody(this.bone('Pelvis'),[0,0,1],pose.hipTilt*blend);this.rotateBody(this.bone('Pelvis'),[1,0,0],(pose.hipPitch||0)*blend);}
  if(pose.hipIsolation){this.rotateBody(this.bone('Spine1'),[0,0,1],-pose.hipTilt*pose.hipIsolation*blend);this.rotateBody(this.bone('Spine1'),[0,1,0],-pose.hipTwist*pose.hipIsolation*blend);this.rotateBody(this.bone('Spine1'),[1,0,0],-pose.hipPitch*pose.hipIsolation*blend);}
  this.rotateBody(this.bone('Spine1'),[0,0,1],pose.body.lean*blend);
  this.rotateBody(this.bone('Spine1'),[1,0,0],(pose.body.pitch||0)*blend);
  this.rotateBody(this.bone('Spine2'),[0,1,0],pose.body.twist*blend);
  this.rotateBody(this.bone('Spine2'),[0,0,1],(pose.chestRoll||0)*blend);this.rotateBody(this.bone('Spine2'),[1,0,0],(pose.chestPitch||0)*blend);
  this.rotateBody(this.bone('L Clavicle'),[0,0,1],pose.shoulder*blend);
  this.rotateBody(this.bone('R Clavicle'),[0,0,1],-pose.shoulder*blend);
  this.rotateBody(this.bone('L Clavicle'),[0,1,0],(pose.shoulderSwing||0)*blend);this.rotateBody(this.bone('R Clavicle'),[0,1,0],-(pose.shoulderSwing||0)*blend);
  this.rotateBody(this.bone('Head'),[0,1,0],pose.headYaw*blend);
  this.rotateBody(this.bone('Head'),[1,0,0],pose.headNod*blend);this.rotateBody(this.bone('Head'),[0,0,1],(pose.headTilt||0)*blend);
  for(const [s,key]of [['L','left'],['R','right']]){
   const sign=s==='L'?1:-1,arm=[...pose.hands[key]],hand=this.bone(s+' Hand'),belt=pose.beltWeight[key];
   // Waist contact follows the torso, not a stationary world-space hand target.
   arm[0]+=pose.body.x*belt;arm[1]+=surfaceOffset+pose.body.y*belt;arm[2]+=pose.body.z*belt;
   const target=point(this.root,arm);if(hand)target.lerp(hand.getWorldPosition(v()),1-blend);
   const elbow=pose.elbows?.[key]?[...pose.elbows[key]]:[sign*(.62-.16*belt),1.10+.03*belt,.05-.10*belt];elbow[1]+=surfaceOffset;const upper=this.bone(s+' UpperArm'),forearm=this.bone(s+' Forearm');
   if(this.costumed&&!this.solo&&!this.moneyInteraction){const safe=dancerArmTarget(this.root,upper,forearm,hand,this.root.worldToLocal(target.clone()).toArray(),s);ik(upper,forearm,hand,safe.target,safe.pole);}else ik(upper,forearm,hand,target,point(this.root,elbow));
   const wristNeutral=hand?.quaternion.clone();
   if(hand){
    const neutral=hand.quaternion.clone();
    if(this.costumed&&!this.solo&&!this.moneyInteraction){
     // Retain the forearm's orientation; tiny local flourishes cannot flip a wrist.
     const flourish=pose.wristFlourish?.[key]||[.06*Math.sin(t*3.2+this.variant),sign*.10*Math.sin(t*2.8+this.variant)];hand.rotateZ(flourish[1]*blend);hand.rotateX(flourish[0]*blend);hand.updateWorldMatrix(false,true);
    }else{
    const direction=pose.handDirections?.[key];this.handAim(s,direction?arm.map((n,i)=>n+direction[i]):[arm[0]+sign*.025*(1-belt),arm[1]+(.095+.025*pose.clap)*(1-belt)-.10*belt,arm[2]+(.08-.065*pose.clap)*(1-belt)+.025*belt]);
    this.rotateBody(hand,[0,0,1],sign*pose.wrist*blend*(1-belt)*(1-pose.clap));
    if(pose.palmNormals?.[key]){const forward=new T.Vector3(...pose.handDirections[key]).normalize(),palm=new T.Vector3(...pose.palmNormals[key]).normalize(),across=forward.clone().cross(palm).normalize(),basis=new T.Matrix4().makeBasis(forward,palm,across),world=this.root.getWorldQuaternion(q()).multiply(q().setFromRotationMatrix(basis));hand.quaternion.slerp(hand.parent.getWorldQuaternion(q()).invert().multiply(world),pose.clap*blend);}
    hand.quaternion.copy(limitWrist(neutral,hand.quaternion,.75*(1-belt)+.42*belt));
    hand.updateWorldMatrix(false,true);
    }
   }
   const snap=pose.snapWeight[key],beat=pose.snapBeat+(s==='L'?0:.035);
   if(snap>0){this.ensureSnap();applySnapPose(this.snapPoses[s],beat,snap*blend);}
   if(pose.fingerCurl)for(let f=1;f<=4;f++)for(const [joint,factor]of [['',.6],['1',1],['2',.65]])this.bone(s+' Finger'+f+joint)?.rotateZ((pose.fingerCurl[key]+f*.012)*factor*(1-snap));
   const dancerWrist=this.costumed&&!this.solo&&!this.moneyInteraction;
   this.rotateBody(hand,[1,0,0],-(dancerWrist?.04:.12)*snapCycle(beat).release*snap*blend);
   if(hand&&dancerWrist){hand.quaternion.copy(limitWrist(wristNeutral,hand.quaternion,.15));hand.updateWorldMatrix(false,true);}
   if(pose.spoonGrip)applySpoonGrip(this,s,pose.spoonClick?.[key]||0,pose.spoonGrip[key]*blend);
   const foot=this.bone(s+' Foot');
   if(foot&&this.footRest[s]&&this.soles[s]){
    const world=this.root.getWorldQuaternion(q()).multiply(this.footRest[s]);
    const axis=new T.Vector3(1,0,0).applyQuaternion(this.root.getWorldQuaternion(q()));world.premultiply(q().setFromAxisAngle(axis,-pose.heel[s==='L'?0:1]*blend));
    const desired=pose.feet[key],targetFoot=groundedAnkle(this.soles[s],world,point(this.root,[desired[0],0,desired[2]]),desired[1]*blend);
    ik(this.bone(s+' Thigh'),this.bone(s+' Calf'),foot,targetFoot,point(this.root,[sign*.2,.45,.8]));
    foot.quaternion.copy(foot.parent.getWorldQuaternion(q()).invert().multiply(world));foot.updateWorldMatrix(false,true);
   }
  }
 }
 facePosition(){this.root.updateWorldMatrix(true,true);return this.bone('Head')?.getWorldPosition(v())||point(this.root,[0,1.6,0]);}
 label(camera,w,h,focus){if(this.npc){this.tag.hidden=true;return;}const p=point(this.root,[0,1.93+this.model.position.y,0]),dist=p.distanceTo(camera.position);p.project(camera);const visible=this.root.visible&&p.z>-1&&p.z<1&&Math.abs(p.x)<1.1&&Math.abs(p.y)<1.1&&(focus||dist<17);this.tag.hidden=!visible;if(visible){this.tag.style.left=(p.x*.5+.5)*w+'px';this.tag.style.top=(-p.y*.5+.5)*h+'px';this.tag.style.opacity=focus?'1':'.85';this.tag.classList.toggle('focus',focus);}}
 dispose(){this.clearProps();this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);this.tag.remove();this.root.removeFromParent();// Geometry, textures and wardrobe materials belong to the shared asset pool.
  this.model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});}
}
