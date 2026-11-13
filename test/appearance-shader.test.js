import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {styleMaterial} from '../public/appearance.js';

function powerArguments(source){
 source=source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
 const calls=[],pattern=/\bpow\s*\(/g;let match;
 while((match=pattern.exec(source))){
  const args=[];let depth=1,start=pattern.lastIndex,end=start;
  for(;end<source.length&&depth;end++){
   const char=source[end];
   if(char==='(')depth++;
   else if(char===')'){if(--depth===0)args.push(source.slice(start,end).trim());}
   else if(char===','&&depth===1){args.push(source.slice(start,end).trim());start=end+1;}
  }
  calls.push(args);pattern.lastIndex=end;
 }
 return calls;
}

test('appearance shaders square signed face and body coordinates without GLSL pow',()=>{
 // GLSL pow(x, 2) is undefined for x < 0; a single NaN can spread through bloom.
 // Inspect generated shaders, including the material used for distant people.
 for(const role of ['dance','dancer'])for(const surface of ['head','body','opacity'])for(const eveningOutfit of [false,true]){
  const source=new T.MeshStandardMaterial();source.name='character_'+surface;
  const material=styleMaterial(source,{modelName:'female-adult-03',gender:'female',role,eveningOutfit:eveningOutfit&&role!=='dancer'});
  for(const candidate of [material,material.userData.distantMaterial]){
   const shader={uniforms:{},vertexShader:T.ShaderLib.physical.vertexShader,fragmentShader:T.ShaderLib.physical.fragmentShader};
   candidate.onBeforeCompile(shader);
   if(eveningOutfit&&role==='dance'&&surface==='body'){
    assert.match(shader.fragmentShader,/if\(vEveningRest\.y<\.99&&vEveningArm<\.01\)discard/,'hands below the hem cutoff must remain visible');
    assert.match(shader.vertexShader,/vEveningArm=eveningArm/,'arm membership must reach the fragment shader');
   }
   for(const [base,exponent]of powerArguments(shader.fragmentShader)){
    assert.notEqual(Number(exponent),2,`${role}/${surface}: use multiplication for a square instead of pow(${base}, ${exponent})`);
   }
  }
  material.userData.distantMaterial.dispose();material.dispose();source.dispose();
 }
});
