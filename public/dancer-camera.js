import * as T from 'three';
import {constrainCamera} from './spatial.js';

// A single uninterrupted full-body shot: settle in, arc gently around the
// performer, then ease out. Reserve space for raised hands and heel work.
export function dancerCamera(person,age,aspect){
 const origin=person.root.position,progress=T.MathUtils.clamp(age/15,0,1);
 const close=T.MathUtils.smoothstep(age,1.5,4)*(1-T.MathUtils.smoothstep(age,11.5,15));
 const angle=(person.danceFacing??0)+.28*Math.sin((progress-.5)*Math.PI);
 const target=origin.clone().add(new T.Vector3(0,1.08,0)),fov=48;
 const view=new T.PerspectiveCamera(fov,aspect,.1,90);
 const probe=new T.Vector3();
 function fit(distance){
  view.position.set(origin.x+Math.sin(angle)*distance,origin.y+2.15,origin.z+Math.cos(angle)*distance);
  constrainCamera(view.position);view.lookAt(target);view.updateMatrixWorld(true);
  let fits=true;
  for(const x of [-.65,.65])for(const y of [0,2.05])for(const z of [-.35,.35]){
   const projected=probe.set(x,y,z).add(origin).project(view);
   if(Math.abs(projected.x)>.82||projected.y<-.50||projected.y>.70)fits=false;
  }
  return fits;
 }
 // Continuous fitting avoids the small zoom jumps of rounded distance steps.
 let near=3.4,far=9;
 for(let i=0;i<14;i++){const mid=(near+far)/2;if(fit(mid))far=mid;else near=mid;}
 fit(far+.10+(1-close)*.65);
 return{pos:view.position.clone(),target,fov,focus:person};
}
