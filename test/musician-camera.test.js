import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {musicianCamera} from '../public/musician-camera.js';
import {STAGE_DANCERS} from '../public/club-layout.js';
import {constrainCamera} from '../public/spatial.js';

const person=(role,x,y,z)=>{const root=new T.Group();root.position.set(x,y,z);return{role,root};};
function view(plan,aspect){const camera=new T.PerspectiveCamera(plan.fov,aspect,.1,90);camera.position.copy(plan.pos);camera.lookAt(plan.target);camera.updateMatrixWorld(true);return camera;}
function frontObstruction(plan,subject,other,height){
 const end=subject.root.position.clone().add(new T.Vector3(0,height,.2)),delta=end.clone().sub(plan.pos),offset=other.root.position.clone().sub(plan.pos);
 const u=(offset.x*delta.x+offset.z*delta.z)/(delta.x**2+delta.z**2);
 const lateral=Math.hypot(offset.x-u*delta.x,offset.z-u*delta.z),y=plan.pos.y+u*delta.y-other.root.position.y;
 return u>0&&u<.98&&lateral<.65&&y>0&&y<2.15;
}
test('saz and drum use clear front diagonals with dancers in their normal stage positions',()=>{
 const dancers=STAGE_DANCERS.map(p=>person('dancer',...p));
 for(const role of ['saz','drum'])for(const aspect of [9/16,16/9,1]){
  const p=person(role,role==='saz'?-3.9:3.9,.64,-7),plan=musicianCamera(p,[p,...dancers],aspect),origin=p.root.position;
  assert.ok(plan);assert.ok(plan.pos.z>origin.z);assert.ok(Math.abs(plan.pos.x-origin.x)>2);
  assert.equal(Math.sign(plan.pos.x-origin.x),-Math.sign(origin.x));
  assert.ok(constrainCamera(plan.pos.clone()).distanceTo(plan.pos)<1e-6);
  assert.ok([...plan.pos.toArray(),...plan.target.toArray(),plan.fov].every(Number.isFinite));
  for(const d of dancers)for(const height of [.18,.8,1.75])assert.equal(frontObstruction(plan,p,d,height),false,`${role} ${aspect}: dancer obscures ${height}`);
  const camera=view(plan,aspect);
  for(const x of [-.83,.83])for(const y of [.035,1.94])for(const z of [-.34,.76]){
   const point=origin.clone().add(new T.Vector3(x,y,z)).project(camera);
   assert.ok(Math.abs(point.x)<.84&&point.y>-.82&&point.y<.78,`${role} full seated body/saz neck cropped`);
  }
 }
});
test('foreground dancers project beside the musician instead of over face, hands and instrument',()=>{
 const dancers=STAGE_DANCERS.map(p=>person('dancer',...p));
 for(const role of ['saz','drum'])for(const aspect of [9/16,16/9]){
  const p=person(role,role==='saz'?-3.9:3.9,.64,-7),plan=musicianCamera(p,[p,...dancers],aspect),camera=view(plan,aspect);
  for(const d of dancers){
   const center=d.root.position.clone().add(new T.Vector3(0,1,0)),depth=center.clone().applyMatrix4(camera.matrixWorldInverse).z;
   for(const offset of [[0,1.75,.12],[-.65,.88,.30],[.72,1.05,.38]]){
    const target=p.root.position.clone().add(new T.Vector3(...offset)),subjectDepth=target.clone().applyMatrix4(camera.matrixWorldInverse).z;
    if(depth>=-.1||depth<subjectDepth)continue;
    const projected=target.project(camera),left=center.clone().add(new T.Vector3(-.6,0,0)).project(camera),right=center.clone().add(new T.Vector3(.6,0,0)).project(camera);
    assert.ok(projected.x<Math.min(left.x,right.x)||projected.x>Math.max(left.x,right.x),`${role}: foreground performer overlaps focus`);
   }
  }
 }
});
test('camera considers old-frustum invisible blockers, ignores hidden role duplicates and stays stable over time',()=>{
 const p=person('saz',-3.9,.64,-7),dancers=STAGE_DANCERS.map(p=>person('dancer',...p));
 const base=musicianCamera(p,[p,...dancers],9/16,0),blocker=person('dancer',0,.64,0);
 blocker.root.position.copy(base.pos).lerp(p.root.position,.45);blocker.root.position.y=.64;blocker.root.visible=false;
 const changed=musicianCamera(p,[p,...dancers,blocker],9/16,1);
 assert.notEqual(changed.angle,base.angle);
 blocker.giftHidden=true;const restored=musicianCamera(p,[p,...dancers,blocker],9/16,2);assert.equal(restored.angle,base.angle);
 const later=musicianCamera(p,[p,...dancers,blocker],9/16,900);assert.deepEqual(later.pos.toArray(),restored.pos.toArray());
 later.pos.x=100;assert.notEqual(musicianCamera(p,[p,...dancers,blocker],9/16).pos.x,100);
 assert.equal(musicianCamera(person('dance',0,0,0),[],1),null);
});

test('musician views clear real VIP portal posts and speaker cabinets instead of filming through them',()=>{
 const dancers=STAGE_DANCERS.map(p=>person('dancer',...p));
 for(const role of ['saz','drum'])for(const aspect of [9/16,16/9,1]){
  const side=role==='saz'?-1:1,p=person(role,side*3.9,.64,-7),plan=musicianCamera(p,[p,...dancers],aspect);
  // Independent measurements from the actual room: inner VIP portal at
  // x=±6.46,z=-5.45 and PA speaker at x=±6,z=-6.8.
  const portal=new T.Box3(new T.Vector3(side*6.46-.12,.32,-5.57),new T.Vector3(side*6.46+.12,3,-5.33));
  const speaker=new T.Box3(new T.Vector3(side*6-.43,.575,-7.19),new T.Vector3(side*6+.43,2.825,-6.35));
  for(const box of [portal,speaker]){
   assert.ok(box.distanceToPoint(plan.pos)>.9,'lens is too close to a foreground fixture');
   for(const x of [-.65,0,.72])for(const y of [.18,.8,1.75]){
    const end=p.root.position.clone().add(new T.Vector3(x,y,.2)),line=end.clone().sub(plan.pos),distance=line.length();
    const hit=new T.Ray(plan.pos,line.normalize()).intersectBox(box,new T.Vector3());
    assert.ok(!hit||hit.distanceTo(plan.pos)>distance,'fixture covers the musician');
   }
  }
 }
});
