import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {dancerCamera} from '../public/dancer-camera.js';
import {STAGE_DANCERS} from '../public/club-layout.js';
import {constrainCamera} from '../public/spatial.js';

test('15-second dancer shot keeps raised hands and feet in frame in landscape and portrait',()=>{
 for(const aspect of [9/16,16/9,1])for(const position of STAGE_DANCERS){
  const p={root:{position:new T.Vector3(...position)},danceFacing:0};let last;
  for(let age=0;age<=15;age+=.05){
   const shot=dancerCamera(p,age,aspect),view=new T.PerspectiveCamera(shot.fov,aspect,.1,90);
   view.position.copy(shot.pos);view.lookAt(shot.target);view.updateMatrixWorld(true);
   assert.ok(constrainCamera(shot.pos.clone()).distanceTo(shot.pos)<1e-6);
   for(const x of [-.65,.65])for(const y of [0,2.05])for(const z of [-.35,.35]){
    const point=p.root.position.clone().add(new T.Vector3(x,y,z)).project(view);
    assert.ok(Math.abs(point.x)<=.82&&point.y>=-.5&&point.y<=.70,`cropped dancer at ${age}, aspect ${aspect}`);
   }
   if(last)assert.ok(last.distanceTo(shot.pos)<.025,'camera must glide without cuts or zoom steps');
   last=shot.pos;
  }
 }
});
