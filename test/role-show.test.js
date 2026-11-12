import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {RoleShow} from '../public/role-show.js';
import {giftShot} from '../public/gift-shots.js';
import {ShotQueue} from '../public/director.js';
import {ENTRY_SECONDS} from '../public/role-transitions.js';

function actor(options={}){
 const p={...options,root:new T.Group(),tag:{hidden:false},walking:false,
  walkTo(path,role,yaw,duration){Object.assign(this,{path,role,yaw,walkDuration:duration,walking:true});}};
 p.root.position.set(options.x||0,options.y||0,options.z||0);return p;
}
function setup(){
 const source=actor({viewerId:'donor',name:'Ada',role:'vip',revision:3,x:8,z:-7}),occupant=actor({viewerId:'new-saz',role:'saz',x:-3,z:-6}),other=actor({viewerId:'other',role:'dance',x:0,z:10});
 const people=[source,occupant,other],removed=[];
 const show=new RoleShow({getPeople:()=>people,
  destinationFor:data=>data.role==='vip'?{position:[8,.32,-7],yaw:0}:{position:[-3,.64,-6],yaw:.4},
  spawn:options=>{const p=actor(options);people.push(p);return p;},
  remove:p=>{removed.push(p);const i=people.indexOf(p);if(i>=0)people.splice(i,1);},
  decorate:(p,data)=>{p.avatar=data.avatar;}});
 return{show,source,occupant,other,people,removed};
}
const saved={id:'donor',name:'Ada',gender:'female',variant:4,avatar:'https://example.com/a.png',role:'saz',revision:1,slot:0};

test('queued role uses its saved actor while source and a later owner keep their authoritative roles',()=>{
 const {show,source,occupant,other,people}=setup(),sourcePosition=source.root.position.clone(),occupantPosition=occupant.root.position.clone();
 const temporary=show.start(saved);
 assert.equal(temporary.role,'saz');assert.equal(temporary.avatar,saved.avatar);assert.equal(temporary.giftActor,true);assert.equal(temporary.walking,false);assert.equal(people.length,4);
 assert.equal(source.giftHidden,true);assert.equal(occupant.giftHidden,true);assert.equal(source.root.visible,false);assert.equal(occupant.tag.hidden,true);assert.equal(other.giftHidden,undefined);
 source.role='dj';source.revision=4;source.root.position.set(0,.64,-9);
 show.stop();
 assert.equal(source.role,'dj');assert.equal(source.revision,4);assert.deepEqual(source.root.position.toArray(),[0,.64,-9]);assert.notDeepEqual(source.root.position,sourcePosition);
 assert.equal(occupant.role,'saz');assert.deepEqual(occupant.root.position,occupantPosition);assert.equal(source.giftHidden,false);assert.equal(occupant.giftHidden,false);assert.equal(source.lastPoseTime,-1);assert.equal(people.length,3);assert.equal(show.active,null);
});

test('late source replacement and destination occupants are hidden without touching disposed actors on release',()=>{
 const {show,source,people}=setup();show.start(saved);people.splice(people.indexOf(source),1);
 Object.defineProperty(source,'giftHidden',{set(){throw Error('disposed actor mutated');}});
 const replacement=actor({viewerId:'donor',role:'drum',revision:5,x:3,z:-6});people.push(replacement);
 show.update();assert.equal(replacement.giftHidden,true);assert.equal(replacement.root.visible,false);
 assert.doesNotThrow(()=>show.stop());assert.equal(replacement.giftHidden,false);assert.equal(replacement.role,'drum');assert.equal(replacement.revision,5);
});

test('restarting or cancelling a role show cleans up just its temporary actor and restores previous occupants',()=>{
 const {show,source,occupant,people,removed}=setup();const first=show.start(saved),second=show.start({...saved,role:'vip'});
 assert.ok(!people.includes(first));assert.ok(people.includes(second));assert.equal(removed.length,1);assert.equal(occupant.giftHidden,false);assert.equal(source.giftHidden,true);assert.equal(second.walkDuration,ENTRY_SECONDS);
 show.stop();show.stop();assert.deepEqual(removed,[first,second]);assert.equal(people.length,3);assert.equal(source.giftHidden,false);
});

test('VIP entrance is part of its fixed eight-second shot, with no duration extension on arrival',()=>{
 const {show}=setup(),q=new ShotQueue();const event=giftShot({seq:77,role:'vip'},{
  onStart:()=>{event.person=show.start({...saved,role:'vip'});},onRelease:()=>show.stop()});
 q.push(event,10);assert.equal(q.until,18);assert.equal(event.person.walkDuration,1.8);assert.equal(event.person.walking,true);
 event.person.walking=false;q.tick(11.8);assert.equal(q.until,18);assert.equal(q.tick(17.99),event);assert.equal(q.tick(18),null);assert.equal(show.active,null);
});

test('saz to VIP to dancer presentations never roll the live actor back to an earlier role',()=>{
 const {show,source,people}=setup();source.role='saz';source.serverRevision=1;
 const saz=show.start(saved);assert.equal(saz.role,'saz');
 // Server changes its authoritative actor while the earlier full gift show continues.
 source.role='vip';source.serverRevision=2;source.root.position.set(8,.32,-7);show.update();show.stop();
 assert.equal(source.role,'vip');assert.equal(source.serverRevision,2);assert.equal(source.giftHidden,false);
 const vip=show.start({...saved,role:'vip',revision:2});assert.equal(vip.role,'vip');
 // A dancer switches costume/model, replacing the canonical actor entirely.
 people.splice(people.indexOf(source),1);const dancer=actor({...saved,viewerId:'donor',role:'dancer',serverRevision:3,x:-3,y:.64,z:-6});people.push(dancer);
 show.update();assert.equal(dancer.giftHidden,true);show.stop();assert.equal(dancer.role,'dancer');assert.equal(dancer.serverRevision,3);assert.equal(dancer.giftHidden,false);
 const dancerShot=show.start({...saved,role:'dancer',revision:3});assert.equal(dancerShot.role,'dancer');show.stop();
 assert.equal(dancer.role,'dancer');assert.equal(dancer.giftHidden,false);assert.equal(people.filter(p=>p.viewerId==='donor').length,1);assert.equal(people.some(p=>p.giftActor),false);
});
test('cleaning an externally removed temporary actor cannot remove another guest twice',()=>{
 const {show,people,removed}=setup(),temporary=show.start(saved);people.splice(people.indexOf(temporary),1);
 const remaining=[...people];show.stop();assert.deepEqual(people,remaining);assert.equal(removed.length,0);
});
