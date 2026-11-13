import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {loadPeople,Person} from './actors.js';
import {guestModels} from './wardrobe.js';
import {clubLook} from './club-fashion.js';
const renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.4));renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;document.body.append(renderer.domElement);
const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
const cards=document.querySelector('#cards'),views=[];let detail='full',back=false,moving=false,age=0,last=performance.now();
const assets=await loadPeople(()=>{});
guestModels.female.forEach((modelName,i)=>{
 const card=document.createElement('section');card.className='card';card.innerHTML='<div class="view"></div><div class="caption"></div>';cards.append(card);card.querySelector('.caption').textContent=(i+1).toString().padStart(2,'0')+' / '+clubLook(modelName,i).label;
 const scene=new T.Scene();scene.environment=env;scene.environmentIntensity=.6;scene.add(new T.HemisphereLight('#ffece0','#464960',1));
 const light=new T.DirectionalLight('#fff1de',2.4);light.position.set(2,3,4);scene.add(light);const rim=new T.DirectionalLight('#beabed',1.2);rim.position.set(-3,2,-2);scene.add(rim);
 const camera=new T.PerspectiveCamera(35,1,.1,20),person=new Person(assets,{name:'Karakter '+(i+1),gender:'female',variant:i,modelName,role:'dance',npc:false},scene,card);
 person.play('idle');person.mixer.update(.3);person.root.updateMatrixWorld(true);
 views.push({scene,camera,person,element:card.querySelector('.view')});
});document.querySelector('#status').hidden=true;
document.querySelector('#face').onclick=()=>detail=detail==='face'?'full':'face';
document.querySelector('#hair').onclick=()=>detail=detail==='hair'?'full':'hair';
document.querySelector('#hands').onclick=()=>detail=detail==='hands'?'full':'hands';
document.querySelector('#legs').onclick=()=>detail=detail==='legs'?'full':'legs';
document.querySelector('#back').onclick=()=>back=!back;
document.querySelector('#dance').onclick=e=>{moving=!moving;e.target.textContent=moving?'Duruşu göster':'Dansı göster';};
function render(now){const dt=Math.min(.04,(now-last)/1000);last=now;if(moving)age+=dt;renderer.setSize(innerWidth,innerHeight,false);renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
 for(const {scene,camera,person,element}of views){const r=element.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)continue;renderer.setViewport(r.left,innerHeight-r.bottom,r.width,r.height);renderer.setScissor(r.left,innerHeight-r.bottom,r.width,r.height);camera.aspect=r.width/r.height;
  if(moving)person.update(dt,age);else{for(const b of person.restBones){b.bone.quaternion.copy(b.quaternion);b.bone.position.copy(b.position);}person.mixer.update(dt);person.root.updateMatrixWorld(true);if(detail==='hands')person.arms([.38,1.2,.5],[-.38,1.2,.5]);}
  const h=person.facePosition().y,face=detail==='face';
  if(detail==='hands'){
   const hand=person.bone('L Hand'),middle=person.bone('L Finger21'),target=hand.getWorldPosition(new T.Vector3()).lerp(middle.getWorldPosition(new T.Vector3()),.63),offset=new T.Vector3(.025,(back?-1:1)*.39,.055).applyQuaternion(hand.getWorldQuaternion(new T.Quaternion()));
   camera.position.copy(target).add(offset);camera.lookAt(target);
  }else if(detail==='legs'){camera.position.set(.08,.42,(back?-1:1)*1.35);camera.lookAt(0,.38,0);}
  else if(detail==='hair'){camera.position.set(.48,h+.04,(back?-1:1)*1.28);camera.lookAt(0,h-.10,0);}
  else{camera.position.set(0,face?h+.08:1.05,(back?-1:1)*(face?.66:3.4));camera.lookAt(0,face?h+.055:.91,0);}
  camera.updateProjectionMatrix();renderer.render(scene,camera);
 }setTimeout(()=>requestAnimationFrame(render),60);
}requestAnimationFrame(render);
