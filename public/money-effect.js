import * as T from 'three';
import {floorHeight} from './spatial.js';
export function createMoneyEffect(scene){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#c8e9a4';ctx.fillRect(0,0,128,64);ctx.strokeStyle='#366a39';ctx.lineWidth=3;ctx.strokeRect(5,5,118,54);ctx.strokeRect(10,10,108,44);ctx.fillStyle='#366a39';ctx.font='bold 36px serif';ctx.textAlign='center';ctx.fillText('₺',64,45);
 const material=new T.MeshStandardMaterial({map:new T.CanvasTexture(canvas),side:T.DoubleSide,roughness:.8,emissive:'#6c8a43',emissiveIntensity:.25});
 const mesh=new T.InstancedMesh(new T.PlaneGeometry(.19,.09),material,72),dummy=new T.Object3D(),bills=[];mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
 const held=new T.Group();scene.add(held);const stacks=['L','R'].map(side=>{const group=new T.Group();for(let i=0;i<3;i++){const bill=new T.Mesh(new T.PlaneGeometry(.12,.065),material);bill.position.z=i*.002;bill.rotation.z=(i-1)*.1;group.add(bill);}held.add(group);return{side,group};});held.visible=false;
 return {
  holdHands(person,gesture,visible){held.visible=visible;if(!visible)return;for(const {side,group}of stacks){const hand=person.bone(side+' Finger1')||person.bone(side+' Hand');if(!hand)continue;group.position.copy(hand.getWorldPosition(new T.Vector3()));group.quaternion.copy(hand.getWorldQuaternion(new T.Quaternion()));group.rotateX(Math.PI/2);group.visible=gesture.side!==(side==='L'?'left':'right')||gesture.phase<.56||gesture.phase>.9;}},
  toss(origin,target){for(let i=0;i<4;i++){if(bills.length>=72)bills.shift();const d=target.clone().sub(origin);bills.push({position:origin.clone(),velocity:new T.Vector3(d.x*.65+(Math.random()-.5)*.25,1.1+Math.random()*.5,d.z*.65+(Math.random()-.5)*.25),age:0,phase:Math.random()*6});}},
  clear(){held.visible=false;bills.length=0;mesh.visible=false;mesh.count=0;},
  update(dt,time){for(let i=bills.length-1;i>=0;i--){const b=bills[i];b.age+=dt;if(b.age>2.1){bills.splice(i,1);continue;}b.velocity.y-=dt*1.7;b.velocity.x*=Math.exp(-dt*.3);b.velocity.z*=Math.exp(-dt*.3);b.position.addScaledVector(b.velocity,dt);const floor=floorHeight(b.position.x,b.position.z)+.012;if(b.position.y<floor){b.position.y=floor;b.velocity.set(0,0,0);b.landed=true;}}
   mesh.visible=bills.length>0;mesh.count=bills.length;
   for(let i=0;i<bills.length;i++){const b=bills[i];dummy.position.copy(b.position);dummy.rotation.set(b.landed?-Math.PI/2:b.age*4+b.phase,b.landed?0:time+b.phase,b.landed?b.phase:Math.sin(b.age*7+b.phase)*.6);dummy.scale.setScalar(Math.min(1,(2.1-b.age)*4));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.instanceMatrix.needsUpdate=true;
  }
 };
}
