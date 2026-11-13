import * as T from 'three';

// One circular surface draws the square LED panels. No per-tile meshes,
// lights or textures: a crowded floor keeps the same small draw budget.
export function neonFloor(radius){
 const clock={value:0},material=new T.MeshStandardMaterial({color:'#11101c',metalness:.3,roughness:.29,envMapIntensity:.24});
 material.onBeforeCompile=shader=>{
  shader.uniforms.clubFloorTime=clock;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 clubTilePosition;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\nclubTilePosition=position.xy;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float clubFloorTime;\nvarying vec2 clubTilePosition;')
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    vec2 panel=clubTilePosition/1.35;
    vec2 cell=floor(panel);
    vec2 inset=min(fract(panel),1.0-fract(panel));
    float edge=min(inset.x,inset.y);
    float aa=max(fwidth(edge),0.0005);
    float seam=1.0-smoothstep(0.007,0.014+aa,edge);
    float halo=1.0-smoothstep(0.012,0.095+aa,edge);
    float flow=0.5+0.5*sin(cell.x*0.31+cell.y*0.24+clubFloorTime*0.23);
    vec3 violet=vec3(0.32,0.12,0.80),cyan=vec3(0.04,0.66,0.80),rose=vec3(0.80,0.12,0.36);
    vec3 led=mix(violet,cyan,smoothstep(0.12,0.78,flow));
    led=mix(led,rose,0.30*(0.5+0.5*sin(cell.x*0.21-cell.y*0.28-clubFloorTime*0.17)));
    float checker=mod(cell.x+cell.y,2.0);
    float breath=0.85+0.15*sin(clubFloorTime*0.65+cell.x*0.18+cell.y*0.20);
    diffuseColor.rgb+=led*(0.018+checker*0.018);
    totalEmissiveRadiance+=led*(seam*1.18+halo*0.16+0.018+checker*0.012)*breath;
   `);
 };
 material.customProgramCacheKey=()=> 'club-square-neon-v1';
 const surface=new T.Mesh(new T.CircleGeometry(radius,128),material);
 surface.name='Square neon dance floor';surface.rotation.x=-Math.PI/2;surface.receiveShadow=true;
 return{surface,update(time){clock.value=time;}};
}
