import * as T from 'three';
// Sample a horizontal ray against the rest-pose body triangles. Store barycentric
// coordinates, so trims follow the same skin deformation as the underlying body.
export function costumeSurface(person){
 const meshes=[];person.model.traverse(mesh=>{if(mesh.isSkinnedMesh&&mesh.geometry.attributes.costumeRestPosition&&!/head|opacity/i.test([].concat(mesh.material).map(m=>m.name).join(' ')))meshes.push(mesh);});
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),ray=new T.Ray(),hit=new T.Vector3(),bary=new T.Vector3(),triangle=new T.Triangle();
 function sample(y,angle){
  const dir=new T.Vector3(Math.cos(angle),0,Math.sin(angle));ray.set(new T.Vector3(dir.x*.55,y,dir.z*.55),dir.clone().negate());let best=null,distance=Infinity;
  for(const mesh of meshes){const g=mesh.geometry,p=g.attributes.costumeRestPosition,index=g.index,count=index?index.count:p.count;
   for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);a.fromBufferAttribute(p,ids[0]);b.fromBufferAttribute(p,ids[1]);c.fromBufferAttribute(p,ids[2]);if(y<Math.min(a.y,b.y,c.y)||y>Math.max(a.y,b.y,c.y))continue;
    if(!ray.intersectTriangle(a,b,c,false,hit)||Math.abs(hit.x)>.31||Math.abs(hit.z)>.31)continue;const d=ray.origin.distanceToSquared(hit);if(d>=distance)continue;
    triangle.set(a,b,c).getBarycoord(hit,bary);best={mesh,ids,weights:bary.toArray(),rest:hit.clone(),normal:dir.clone()};distance=d;
   }
  }return best;
 }
 const point=new T.Vector3(),inverse=new T.Matrix4(),transforms=new Map(meshes.map(m=>[m,new T.Matrix4()]));
 function prepare(){inverse.copy(person.root.matrixWorld).invert();for(const mesh of meshes)transforms.get(mesh).multiplyMatrices(inverse,mesh.matrixWorld);}prepare();
 function position(anchor,out,offset=.003){out.set(0,0,0);for(let i=0;i<3;i++){anchor.mesh.getVertexPosition(anchor.ids[i],point);point.applyMatrix4(transforms.get(anchor.mesh));out.addScaledVector(point,anchor.weights[i]);}return out.addScaledVector(anchor.normal,offset);}
 return {sample,position,prepare};
}
