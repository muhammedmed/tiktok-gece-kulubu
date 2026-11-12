import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {allModels,guestModels,chooseModel} from '../public/wardrobe.js';
test('active adult club wardrobe ships matching licensed rigs without increasing per-person model loading',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../public/assets/catalog.json',import.meta.url)));
 assert.equal(new Set(allModels).size,21);assert.equal(guestModels.female.length,10);assert.equal(guestModels.male.length,10);
 assert.ok(guestModels.male.every(name=>name.startsWith('male-adult')));
 assert.deepEqual(new Set(catalog.models.map(m=>m.slug)),new Set(allModels));
 for(const name of allModels){const data=fs.readFileSync(new URL('../public/assets/characters/'+name+'.glb',import.meta.url));assert.equal(data.readUInt32LE(0),0x46546c67);const gltf=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)));
  assert.equal(gltf.asset.extras.license,'MIT',name);assert.match(gltf.asset.extras.licenseText,/Microsoft/);
  assert.ok(gltf.skins?.length>0,name);assert.ok(gltf.nodes.some(n=>/^Bip01/.test(n.name||'')),name);assert.ok(catalog.models.find(m=>m.slug===name).triangles<11000,name);
 }
 for(const gender of ['female','male'])for(let n=0;n<100;n++)assert.ok(allModels.includes(chooseModel(gender,n,'dance')));
});
