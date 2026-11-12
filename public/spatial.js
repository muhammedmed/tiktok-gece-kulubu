import {FLOOR,ROOM,VIP_LOUNGES} from './club-layout.js';
export {FLOOR,ROOM,VIP_LOUNGES};
export const STAGE={x:0,z:-8,r:5.8};
export function floorHeight(x,z){let y=0;if(Math.hypot(x-FLOOR.x,z-FLOOR.z)<=FLOOR.r)y=.055;const r=Math.hypot(x,z+8);if(r<=6.3)y=Math.max(y,.2);if(r<=6.05)y=Math.max(y,.4);if(r<=5.8)y=Math.max(y,.64);for(const l of VIP_LOUNGES){const dx=x-l.x,dz=z-l.z,lx=dx*Math.cos(l.yaw)-dz*Math.sin(l.yaw),lz=dx*Math.sin(l.yaw)+dz*Math.cos(l.yaw);if(Math.abs(lx)<=2.45&&Math.abs(lz)<=2.65)y=Math.max(y,.32);}return y;}
const glsl=n=>Number(n).toFixed(6);
export const FLOOR_SHADER=`float clubFloor=.005;
if(length(clubWorld.xz-vec2(${glsl(FLOOR.x)},${glsl(FLOOR.z)}))<=${glsl(FLOOR.r)})clubFloor=.06;
float stageR=length(clubWorld.xz-vec2(0.,-8.));
if(stageR<=6.3)clubFloor=max(clubFloor,.205);if(stageR<=6.05)clubFloor=max(clubFloor,.405);if(stageR<=5.8)clubFloor=max(clubFloor,.645);
${VIP_LOUNGES.map(l=>`{vec2 delta=clubWorld.xz-vec2(${glsl(l.x)},${glsl(l.z)});vec2 localVIP=vec2(delta.x*${glsl(Math.cos(l.yaw))}-delta.y*${glsl(Math.sin(l.yaw))},delta.x*${glsl(Math.sin(l.yaw))}+delta.y*${glsl(Math.cos(l.yaw))});if(abs(localVIP.x)<=2.45&&abs(localVIP.y)<=2.65)clubFloor=max(clubFloor,.325);}`).join('\n')}`;
const safeRadius=ROOM.r-1.2;
export const CAMERA_BOUNDS={minX:-safeRadius,maxX:safeRadius,minY:1.25,maxY:6.2,minZ:ROOM.z-safeRadius,maxZ:ROOM.z+safeRadius};
export function constrainCamera(p){const b=CAMERA_BOUNDS;p.y=Math.max(b.minY,Math.min(b.maxY,p.y));const r=Math.hypot(p.x-ROOM.x,p.z-ROOM.z);if(r>safeRadius){p.x=ROOM.x+(p.x-ROOM.x)*safeRadius/r;p.z=ROOM.z+(p.z-ROOM.z)*safeRadius/r;}return p;}
