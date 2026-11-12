import * as T from 'three';
import {ROOM,FLOOR,VIP_LOUNGES,vipPoint} from './club-layout.js';
import {batchRoom} from './static-batch.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const materialCache=new Map();
export const mat=(color,metalness=0,roughness=.6,extra={})=>{const key=JSON.stringify([color,metalness,roughness,Object.fromEntries(Object.entries(extra).map(([k,v])=>[k,v?.isTexture?v.uuid:v]))]);if(!materialCache.has(key)){const material=new T.MeshStandardMaterial({color,metalness,roughness,...extra});material.userData.shared=true;materialCache.set(key,material);}return materialCache.get(key);};
export const gold=mat('#b99152',.85,.26),black=mat('#111017',.35,.35),velvet=new T.MeshPhysicalMaterial({color:'#511a37',roughness:.88,metalness:0,sheen:.85,sheenColor:new T.Color('#bd6b97'),sheenRoughness:.7,bumpMap:weaveTexture(),bumpScale:.012}),cream=mat('#e4d7be',0,.8);
function weaveTexture(){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 x.fillStyle='#808080';x.fillRect(0,0,128,128);
 for(let i=0;i<128;i+=4){x.fillStyle='#989898';x.fillRect(i,0,1,128);x.fillStyle='#717171';x.fillRect(0,i,128,1);}
 const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(8,8);return t;
}
export function mesh(g,m,p=[0,0,0],parent){const o=new T.Mesh(g,m);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;parent?.add(o);return o;}
export const box=(p,s,m,parent,r=.04)=>mesh(new RoundedBoxGeometry(...s,2,Math.min(r,Math.min(...s)/3)),m,p,parent);
export const cyl=(p,rt,rb,h,m,parent)=>mesh(new T.CylinderGeometry(rt,rb,h,32),m,p,parent);
export const orb=(p,s,m,parent)=>{const o=mesh(new T.SphereGeometry(1,24,16),m,p,parent);o.scale.set(...s);return o;};
export function tube(points,r,m,parent){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),32,r,8,false),m,[0,0,0],parent);}
export const glow=(c,i=2)=>mat(c,.2,.35,{emissive:c,emissiveIntensity:i});
export function textPlane(text,w,h,color='#eaca8e',size=100){const c=document.createElement('canvas');c.width=1536;c.height=384;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.textAlign='center';x.textBaseline='middle';x.fillStyle=color;x.shadowColor=color;x.shadowBlur=12;x.font=`500 ${size}px Georgia`;x.fillText(text,768,192);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;return mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,toneMapped:false}));}
function marbleTexture(){const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');ctx.fillStyle='#27232b';ctx.fillRect(0,0,512,512);for(let n=0;n<35;n++){ctx.beginPath();let y=(n*79)%512;ctx.moveTo(0,y);for(let x=0;x<=512;x+=16){y+=Math.sin(x*.013+n)*5+Math.cos(x*.06+n)*3;ctx.lineTo(x,y);}ctx.strokeStyle=n%3?'#6c5d6220':'#c1a29140';ctx.lineWidth=n%4*.5+.2;ctx.stroke();}const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(7,7);t.colorSpace=T.SRGBColorSpace;return t;}
const sharedGlass=new T.MeshPhysicalMaterial({color:'#fff8ed',transparent:true,opacity:.23,roughness:.06,metalness:0,ior:1.5,clearcoat:1,clearcoatRoughness:.04,specularIntensity:1,side:T.DoubleSide,depthWrite:false});sharedGlass.userData.shared=true;sharedGlass.forceSinglePass=true;
export function glass(parent,x,y,z){const g=new T.Group();g.position.set(x,y,z);parent.add(g);const gm=sharedGlass;const points=[[.055,0],[.065,.02],[.075,.19],[.085,.2]].map(p=>new T.Vector2(...p));mesh(new T.LatheGeometry(points,20),gm,[0,.035,0],g);cyl([0,.1,0],.067,.06,.1,mat('#a75b28',.05,.12,{transparent:true,opacity:.8}),g);cyl([0,.02,0],.065,.065,.025,gm,g);return g;}
function bottle(parent,x,y,z,c){const g=new T.Group();g.position.set(x,y,z);parent.add(g);const m=mat(c,.15,.2);cyl([0,.15,0],.07,.08,.3,m,g);cyl([0,.33,0],.032,.065,.08,m,g);cyl([0,.42,0],.03,.03,.12,m,g);cyl([0,.49,0],.032,.032,.025,gold,g);box([0,.16,.079],[.1,.12,.007],cream,g,.001);return g;}
export function chair(parent,x,z,yaw=0,y=0){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=yaw;parent.add(g);box([0,.47,0],[.62,.16,.62],velvet,g,.08);box([0,.8,-.28],[.62,.67,.14],velvet,g,.1);for(const a of [-1,1])for(const b of [-1,1])cyl([a*.24,.22,b*.24],.023,.018,.44,gold,g);return g;}
function sofa(parent,x,z,angle=0,width=3){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=angle;parent.add(g);box([0,.21,0],[width,.38,1.05],black,g,.15);box([0,.41,.05],[width-.15,.18,.9],velvet,g,.13);box([0,.85,-.49],[width,.98,.22],velvet,g,.1);for(let i=0;i<Math.floor(width/.32);i++)box([-width/2+.16+i*.32,.85,-.35],[.012,.64,.02],mat('#a95673',.15,.6),g,.005);box([-width/2,.57,0],[.18,.34,1.1],velvet,g);box([width/2,.57,0],[.18,.34,1.1],velvet,g);box([0,.13,.52],[width,.04,.025],gold,g,.003);}
export function table(parent,x,z,number,y=0){const g=new T.Group();g.position.set(x,y,z);parent.add(g);cyl([0,.07,0],.42,.5,.12,gold,g);cyl([0,.42,0],.045,.07,.72,gold,g);cyl([0,.83,0],.78,.78,.09,mat('#ddcfbc',.18,.28),g);cyl([0,.78,0],.8,.8,.035,gold,g);for(let i=0;i<3;i++){const a=i*2.1;glass(g,Math.sin(a)*.48,.88,Math.cos(a)*.48);}bottle(g,.17,.88,.14,'#234538');cyl([-.16,1.0,-.13],.025,.035,.25,cream,g);orb([-.16,1.15,-.13],[.025,.05,.025],glow('#ffd296',4),g);cyl([-.16,.9,-.13],.07,.08,.035,gold,g);box([.38,.96,-.3],[.15,.18,.025],black,g);const tx=textPlane(String(number),.13,.06,'#edc78b',120);tx.position.set(.38,1,-.28);g.add(tx);return g;}
export function makeSaz(){
 const g=new T.Group(),wood=mat('#713c22',.05,.31),face=mat('#d5ac70',.02,.48),ebony=mat('#37271d',.08,.4);
 const shape=new T.Shape();shape.moveTo(0,-.28);shape.bezierCurveTo(-.18,-.28,-.23,-.03,-.145,.16);shape.quadraticCurveTo(-.09,.25,-.031,.31);shape.lineTo(.031,.31);shape.quadraticCurveTo(.09,.25,.145,.16);shape.bezierCurveTo(.23,-.03,.18,-.28,0,-.28);
 // Closed rounded bowl behind a flat soundboard; neither surface protrudes through the other.
 const outline=shape.getPoints(48),vertices=[],indices=[],rings=12,n=outline.length;
 for(let r=0;r<=rings;r++){const u=r/rings;for(const p of outline)vertices.push(p.x*u,p.y*u,-.135*Math.sqrt(1-u*u));}
 for(let r=0;r<rings;r++)for(let i=0;i<n-1;i++){const a=r*n+i,b=a+n;indices.push(a,b,a+1,a+1,b,b+1);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();mesh(geometry,new T.MeshStandardMaterial({color:'#713c22',roughness:.32,side:T.DoubleSide}),[0,0,0],g);
 const board=mesh(new T.ExtrudeGeometry(shape,{depth:.009,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,steps:1,curveSegments:32}),face,[0,0,0],g);board.name='saz-soundboard';
 tube(outline.map(p=>[p.x,p.y,.013]),.004,wood,g);
 for(let i=0;i<7;i++){const x=(i-3)*.006; tube([[x,-.19,.031],[x,.31,.036],[x,1.03,.038]],.0009,cream,g);}
 box([0,.65,.005],[.058,.70,.045],wood,g,.008);box([0,.65,.031],[.059,.70,.006],ebony,g,.001);
 for(let i=0;i<18;i++)box([0,.33+(.67*(1-Math.pow(.94,i)))/(1-Math.pow(.94,18)),.038],[.062,.003,.003],cream,g,.001);
 box([0,1.065,.01],[.075,.14,.05],wood,g,.008);
 for(let i=0;i<6;i++){const x=i%2?.06:-.06,y=1.015+Math.floor(i/2)*.04;cyl([x,y,.008],.012,.012,.055,ebony,g).rotation.z=Math.PI/2;}
 box([0,-.19,.025],[.10,.018,.025],ebony,g,.003);
 // Fine soundboard grain follows the wood, separate from the seven strings.
 for(let i=-8;i<=8;i++){const x=i*.015,y=.15-Math.abs(i)*.012;tube([[x,-.19+Math.abs(i)*.009,.012],[x,y,.012]],.00065,mat('#ad804b',0,.65),g);}
 g.rotation.z=-1.02;g.scale.setScalar(.76);return g;
}
export function makeDrum(){const g=new T.Group();const p=[[.16,0],[.19,.04],[.14,.12],[.12,.25],[.18,.43],[.25,.51],[.25,.57]].map(v=>new T.Vector2(...v));mesh(new T.LatheGeometry(p,48),mat('#b6b1b7',.85,.25),[0,0,0],g);cyl([0,.575,0],.245,.245,.025,mat('#ece1ca',.05,.65),g);for(const y of [.04,.5,.57])mesh(new T.TorusGeometry(y===.04?.18:.25,.014,8,48),gold,[0,y,0],g).rotation.x=Math.PI/2;for(let i=0;i<8;i++){let a=i*Math.PI/4;cyl([Math.sin(a)*.24,.53,Math.cos(a)*.24],.013,.013,.09,black,g);}return g;}
export function buildClub(scene){
 const room=new T.Group();scene.add(room);const warm=glow('#efbd78',1.15),pink=glow('#b84969',.85),blue=glow('#725094',.7),wall=mat('#211521',.1,.8);
 cyl([0,-.18,ROOM.z],ROOM.r,ROOM.r,.35,mat('#17121f',.08,.65,{map:marbleTexture(),envMapIntensity:.12}),room);
 const shell=mesh(new T.CylinderGeometry(ROOM.r,ROOM.r,8.2,128,1,true),mat('#160e1d',.15,.8,{side:T.BackSide}),[0,4.1,ROOM.z],room);
 cyl([0,8.3,ROOM.z],ROOM.r,ROOM.r,.2,mat('#0c0912',0,.95),room);
 for(let i=0;i<56;i++){const a=i/56*Math.PI*2,x=Math.sin(a)*(ROOM.r-.2),z=ROOM.z+Math.cos(a)*(ROOM.r-.2);
  cyl([x,3,z],.08,.08,6,black,room);cyl([x,3,z],.025,.025,3.6,i%3?blue:pink,room);
 }
 for(const y of [.12,5.7]){const rim=mesh(new T.TorusGeometry(ROOM.r-.25,.025,8,128),y<1?warm:blue,[0,y,ROOM.z],room);rim.rotation.x=Math.PI/2;}
 for(const x of [-1.5,1.5])box([x,2.2,ROOM.z+ROOM.r-.4],[2.9,4.3,.12],velvet,room);
 // Raised live stage, illuminated steps and velvet curtain wall.
 for(const [r,h] of [[6.3,.2],[6.05,.4],[5.8,.64]]){cyl([0,h/2,-8],r,r,h,black,room);const rim=mesh(new T.TorusGeometry(r,.018,8,96),warm,[0,h,-8],room);rim.rotation.x=Math.PI/2;}
 for(let i=0;i<55;i++)cyl([-6.35+i*.235,3.05,-10.55],.17,.17,4.8,velvet,room);
 const archPoints=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI;archPoints.push([Math.cos(a)*5.7,2.4+Math.sin(a)*3.5,-10.1]);}tube(archPoints,.055,gold,room);for(const x of [-5.7,5.7])cyl([x,1.5,-10.1],.055,.055,1.8,gold,room);
 box([0,3.6,-10.08],[8.4,3.2,.12],mat('#180f23',.4,.4),room);
 const title=textPlane('Â L Â',7.4,2.2,'#f3d6a3',200);title.position.set(0,4.1,-9.98);room.add(title);
 const sub=textPlane('A N K A R A   G E C E L E R İ',5.2,.8,'#cf8dbe',66);sub.position.set(0,3.05,-9.95);room.add(sub);
 const bars=[];for(let i=0;i<43;i++){const b=box([-5.65+i*.27,1.35,-10],[.12,1.2,.06],i%3?warm:pink,room,.02);bars.push(b);}
 for(const x of [-6,6]){box([x,1.7,-6.8],[.72,2.1,.62],black,room);for(const y of [1.2,1.9,2.45]){const cone=cyl([x,y,-6.47],.23,.23,.03,mat('#20202a',.3,.8),room);cone.rotation.x=Math.PI/2;orb([x,y,-6.44],[.08,.08,.03],black,room);}}
 // DJ station, visible platters, faders and headphones.
 box([0,1.25,-8.1],[3.1,1.15,.85],black,room,.07);box([0,1.82,-8.1],[3.25,.12,1.0],mat('#26212d',.6,.22),room);
 box([0,1.15,-7.66],[2.9,.55,.025],mat('#4a2948',.5,.35),room);const dj=textPlane('ÂLÂ  /  AFTER DARK',2.3,.5,'#e1b980',68);dj.position.set(0,1.2,-7.62);room.add(dj);
 for(const x of [-.95,.95]){cyl([x,1.9,-8.1],.29,.29,.03,black,room);cyl([x,1.922,-8.1],.19,.19,.012,gold,room);for(let i=0;i<4;i++)box([x-.22+i*.14,1.91,-7.76],[.07,.015,.06],i%2?pink:blue,room,.003);}
 for(let i=0;i<6;i++){box([-.32+i*.13,1.9,-8.1],[.018,.02,.35],gold,room,.002);box([-.32+i*.13,1.925,-8.18+(i%3)*.1],[.07,.03,.04],cream,room,.004);}
 // Circular smoked-glass dance floor, concentric LED rings and radial inlays.
 cyl([0,.025,FLOOR.z],FLOOR.r,FLOOR.r,.06,mat('#151320',.05,.62,{envMapIntensity:.1}),room);
 for(const r of [FLOOR.r*.25,FLOOR.r*.5,FLOOR.r*.75,FLOOR.r]){const ring=mesh(new T.TorusGeometry(r,.016,8,112),r===FLOOR.r?warm:blue,[0,.058,FLOOR.z],room);ring.rotation.x=Math.PI/2;}
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const strip=box([Math.sin(a)*FLOOR.r/2,.056,FLOOR.z+Math.cos(a)*FLOOR.r/2],[.012,.008,FLOOR.r],i%3?blue:pink,room,.002);strip.rotation.y=a;}
 const seats=[];let number=1;
 // Rounded seating follows the room perimeter; leave the stage sector open.
 for(let i=1;i<15;i++){const a=-2.15+i/15*4.3,x=Math.sin(a)*(ROOM.r-3.2),z=ROOM.z+Math.cos(a)*(ROOM.r-3.2),yaw=a+Math.PI;
  sofa(room,x,z,yaw,3.5);table(room,Math.sin(a)*(ROOM.r-5.1),ROOM.z+Math.cos(a)*(ROOM.r-5.1),number++);
  for(const dx of [-1.2,-.4,.4,1.2])seats.push({x:x+Math.cos(yaw)*dx,z:z-Math.sin(yaw)*dx,y:0,yaw});
 }
 // VIP: illuminated private portals, a curved velvet booth and an open center entrance.
 for(const [index,lounge] of VIP_LOUNGES.entries()){
  const vip=new T.Group();vip.position.set(lounge.x,.32,lounge.z);vip.rotation.y=lounge.yaw;room.add(vip);
  const vipGold=glow('#f0bd72',1.1),vipWine=mat('#341524',.1,.65),vipDark=mat('#100d18',.15,.55);
  box([0,-.16,0],[4.9,.32,5.3],vipDark,vip,.15);
  // Back panel reads as a separate destination from every dance-floor angle.
  box([0,2.15,-2.48],[4.7,4.3,.15],vipDark,vip,.12);
  for(let i=0;i<17;i++)cyl([-2.18+i*.272,2.1,-2.34],.036,.036,3.9,i%4===0?gold:vipWine,vip);
  const portal=[[-2.24,.08,1.95],[-2.24,2.2,1.95],[-2.18,3.65,1.95],[-1.6,4.15,1.95],[0,4.28,1.95],[1.6,4.15,1.95],[2.18,3.65,1.95],[2.24,2.2,1.95],[2.24,.08,1.95]];
  tube(portal,.04,vipGold,vip);
  const edge=[[-2.3,.025,2.5],[-2.4,.025,1.8],[-2.4,.025,-1.8],[-1.9,.025,-2.5],[0,.025,-2.52],[1.9,.025,-2.5],[2.4,.025,-1.8],[2.4,.025,1.8],[2.3,.025,2.5]];
  tube(edge,.022,vipGold,vip);
  sofa(vip,0,-1.7,0,3.1);sofa(vip,-1.78,-.82,.72,1.6);sofa(vip,1.78,-.82,-.72,1.6);
  // Padded curved ends and gold trim define the booth without blocking the three seats.
  table(vip,0,-.15,'VIP');
  for(const dx of [-1.2,0,1.2]){const [x,y,z]=vipPoint(lounge,dx,0,-1.55);seats.push({x,y,z,yaw:lounge.yaw,vip:true,loungeId:lounge.id});}
  const sign=textPlane('V I P  '+(index+1),3.6,1.15,'#ffe0a3',180);sign.position.set(0,3.3,-2.22);vip.add(sign);
  const sub=textPlane('PRIVATE LOUNGE',3,.48,'#dfbd91',68);sub.position.set(0,2.66,-2.2);vip.add(sub);
  // Crown ornament above the lettering, modeled rather than a flat emoji.
  tube([[-.38,3.94,-2.2],[-.43,4.2,-2.2],[-.2,4.04,-2.2],[0,4.32,-2.2],[.2,4.04,-2.2],[.43,4.2,-2.2],[.38,3.94,-2.2],[-.38,3.94,-2.2]],.022,gold,vip);
  for(const px of [-2.15,-.72,.72,2.15]){cyl([px,.6,2.52],.035,.05,1.1,gold,vip);orb([px,1.19,2.52],[.07,.07,.07],gold,vip);}
  for(const sign of [-1,1])tube([[sign*.72,1.16,2.52],[sign*1.43,.93,2.52],[sign*2.15,1.16,2.52]],.035,velvet,vip);
  // One warm light per lounge; the room remains dim.
  const lamp=new T.PointLight('#ffc88a',4.0,6,2);lamp.position.set(...vipPoint(lounge,0,3.33,-.5));scene.add(lamp);
 }
 // Chandelier fixtures removed; unobtrusive warm room fill remains.
 for(const z of [1,9,17,25]){const l=new T.PointLight('#d39678',1.8,15,2);l.position.set(0,5,z);scene.add(l);}
 for(const side of [-1,1])for(const z of [0,4.2,8.4]){const light=new T.PointLight('#efb272',1.0,5,2);light.position.set(side*8.4,2.1,z);scene.add(light);}
 const beams=[];for(let i=0;i<4;i++){const x=-4.5+i*3;const spot=new T.SpotLight(i%2?'#925bd6':'#ee5e8b',12,32,.37,.8,1.8);spot.position.set(x,6.7,-6.4);scene.add(spot,spot.target);spot.target.position.set(x*.6,0,1);if(i===1){spot.castShadow=true;spot.shadow.mapSize.set(1024,1024);spot.shadow.bias=-.0003;spot.shadow.normalBias=.03;}cyl([x,6.65,-6.4],.14,.2,.38,black,room);const cone=mesh(new T.ConeGeometry(2.1,10,32,1,true),new T.MeshBasicMaterial({color:i%2?'#9b89fa':'#ffa5bb',transparent:true,opacity:.006,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}),[x,2.3,-3],room);cone.visible=true;beams.push({spot,cone,x});}
 const ceiling=new T.Group();room.add(ceiling);for(const x of [-10,-5,5,10])box([x,6.8,-1],[.04,.04,18],gold,ceiling,.005);
 const batchedDraws=batchRoom(room,[...bars,...beams.map(b=>b.cone)]);
 return {seats,bars,beams,room,batchedDraws,update(t){bars.forEach((b,i)=>{const h=.2+(.5+.5*Math.sin(t*2.3+i*.62))*.75;b.scale.y=h;b.position.y=.75+h*.6;});beams.forEach(({spot,cone,x},i)=>{spot.target.position.set(x+Math.sin(t*.22+i)*2,0,FLOOR.z+Math.cos(t*.17+i)*7);const mid=spot.position.clone().lerp(spot.target.position,.5);cone.position.copy(mid);cone.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),spot.position.clone().sub(spot.target.position).normalize());});}};
}
