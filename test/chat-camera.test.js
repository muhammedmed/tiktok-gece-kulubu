import test from 'node:test';
import assert from 'node:assert/strict';
import {ChatCamera} from '../public/chat-camera.js';
import {ShotQueue} from '../public/director.js';
const person=id=>({viewerId:id,role:'dance',chatUntil:Date.now()+6000});
test('chat holds four seconds, returns to dance, and limits repeat focus',()=>{
 const c=new ChatCamera(),q=new ShotQueue(),a=person('a'),b=person('b');let starts=0;
 assert.equal(c.focus(a,q,0,()=>starts++),true);
 assert.equal(q.current.person,a);assert.equal(starts,1);
 assert.equal(c.focus(b,q,1),false);assert.equal(q.items.length,0);
 q.tick(4);assert.equal(q.current,null);assert.equal(q.returnView,'dance');
 assert.equal(c.focus(b,q,4.5),false);
 assert.equal(c.focus(a,q,5),false);
 assert.equal(c.focus(b,q,5),true);q.tick(9);
 assert.equal(c.focus(a,q,15),true);
});
test('gifts interrupt chat and chat never interrupts or queues behind gifts',()=>{
 const c=new ChatCamera(),q=new ShotQueue(),a=person('a');
 c.focus(a,q,0);
 q.push({key:'gift',person:person('b'),priority:4,immediate:true,duration:5},1);
 assert.equal(q.current.key,'gift');assert.equal(c.focus(a,q,20),false);
 q.clear();q.push({key:'entry',priority:1,duration:6},21);
 assert.equal(c.focus(a,q,21),false);assert.equal(q.items.length,1);
});
test('ignores expired messages, off-floor viewers and entrances; reset clears limits',()=>{
 const c=new ChatCamera(),q=new ShotQueue(),a=person('a');
 for(const p of [undefined,{...a,npc:true},{...a,walking:true},{...a,role:'vip'},{...a,chatUntil:0}])assert.equal(c.focus(p,q,0),false);
 assert.equal(c.focus(a,q,0),true);q.clear();c.clear();assert.equal(c.focus(a,q,1),true);
});
