import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
export async function rig(name){
 const data=fs.readFileSync(new URL('../../public/assets/characters/'+name+'.glb',import.meta.url)),length=data.readUInt32LE(12),json=JSON.parse(data.subarray(20,20+length));
 json.materials=json.materials.map(m=>({name:m.name,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1]}}));delete json.images;delete json.textures;delete json.samplers;
 const content=Buffer.from(JSON.stringify(json)),size=Math.ceil(content.length/4)*4,tail=data.subarray(20+length),glb=Buffer.alloc(20+size+tail.length,32);
 glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(size,12);glb.writeUInt32LE(0x4e4f534a,16);content.copy(glb,20);tail.copy(glb,20+size);
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 return (await loader.parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),'' )).scene;
}
