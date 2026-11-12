import * as T from 'three';
// Smooth, tapered legs replace the hidden trouser silhouette behind the skirt slit.
// They use the performer's existing bones, including a soft knee-weight transition.
export function dancerLegs(person,material){
 const meshes=[];person.root.updateWorldMatrix(true,true);
 for(const side of ['L','R']){
  const bones=['Thigh','Calf','Foot'].map(n=>person.bone(side+' '+n));if(bones.some(b=>!b))continue;
  const joints=bones.map(b=>person.root.worldToLocal(b.getWorldPosition(new T.Vector3()))),[hip,knee,ankle]=joints;
  const positions=[],indices=[],weights=[],skinIndices=[],segments=16,rows=20;
  for(let row=0;row<=rows;row++){const u=row/rows,y=T.MathUtils.lerp(hip.y+.025,Math.max(.125,ankle.y),u),upper=y>=knee.y;
   const t=upper?T.MathUtils.clamp((hip.y-y)/(hip.y-knee.y),0,1):T.MathUtils.clamp((knee.y-y)/(knee.y-ankle.y),0,1),center=upper?hip.clone().lerp(knee,t):knee.clone().lerp(ankle,t);
   const radius=upper?T.MathUtils.lerp(.067,.048,t)+.023*Math.sin(t*Math.PI):T.MathUtils.lerp(.048,.031,t)+.025*Math.sin(Math.PI*t);
   const calfWeight=T.MathUtils.smoothstep(knee.y-y,-.075,.075),footWeight=T.MathUtils.smoothstep(ankle.y+.07-y,0,.07);
   for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;positions.push(center.x+Math.cos(a)*radius,y,center.z+Math.sin(a)*radius*.97);skinIndices.push(0,1,2,0);weights.push(1-calfWeight,calfWeight*(1-footWeight),calfWeight*footWeight,0);
    if(row<rows&&i<segments){const k=row*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
   }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));g.setIndex(indices);g.computeVertexNormals();
  const m=new T.SkinnedMesh(g,material);m.name='costumeLeg'+side;m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;m.userData.costumeSkeleton=true;person.prop.add(m);m.bind(new T.Skeleton(bones,bones.map(b=>b.matrixWorld.clone().invert())),person.root.matrixWorld.clone());meshes.push(m);
 }
 return meshes;
}
