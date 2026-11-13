import test from 'node:test';import assert from 'node:assert/strict';import{ShotQueue}from'../public/director.js';
test('role action interrupts entrance and repeated gifts do not flood queue',()=>{const q=new ShotQueue();q.push({key:'join',priority:1,duration:15},0);assert.equal(q.tick(0).key,'join');q.push({key:'saz',priority:3,duration:10},1);assert.equal(q.tick(1).key,'saz');for(let i=0;i<30;i++)q.push({key:'saz',priority:3,duration:10},2);assert.ok(q.until<=14);assert.equal(q.items.length,0);});
test('event finishes, wide shot breathes, then queued event starts',()=>{const q=new ShotQueue();q.push({key:'a',priority:2,duration:5},0);q.tick(0);q.push({key:'b',priority:2,duration:5},1);assert.equal(q.tick(5),null);assert.equal(q.tick(7),null);assert.equal(q.tick(8).key,'b');});
test('entrance keeps the camera through travel and five seconds after arrival',()=>{const q=new ShotQueue(),person={walking:true};let started=0,released=0;q.push({key:'join',person,priority:1,duration:60,followArrival:true,onStart:()=>started++,onRelease:()=>released++},0);q.tick(0);q.push({key:'drum',priority:3,duration:10},1);assert.equal(q.tick(9).key,'join');person.walking=false;assert.equal(q.tick(10).key,'join');assert.equal(q.tick(14.99).key,'join');assert.equal(q.tick(15),null);assert.equal(q.tick(17),null);assert.equal(q.tick(18).key,'drum');assert.equal(started,1);assert.equal(released,1);});
test('clearing and bounded overflow release waiting entrances',()=>{const q=new ShotQueue();let released=0;for(let i=0;i<15;i++)q.push({key:String(i),priority:1,duration:60,onRelease:()=>released++},0);assert.equal(q.items.length,12);assert.equal(released,3);q.tick(0);q.clear();assert.equal(released,15);});
test('automatic tour prioritizes floor viewers and pauses during gift events',async()=>{
 const {AutoTour,TOUR_STOPS}=await import('../public/director.js');const t=new AutoTour();assert.equal(t.tick(0).view,'wide');assert.equal(t.tick(2).view,'wide');assert.equal(t.tick(32,true).view,'wide');assert.equal(t.tick(33).view,'dance');
 assert.equal(t.tick(37.9).danceIndex,0);assert.equal(t.tick(38).danceIndex,1);assert.equal(t.tick(43).danceIndex,2);assert.equal(t.tick(57).view,'waiter');assert.equal(t.tick(61.9).view,'waiter');assert.equal(t.tick(62).danceIndex,5);
 const cycle=new AutoTour(),visited=new Set();let now=0;cycle.tick(now);for(const [view,duration] of TOUR_STOPS){assert.equal(cycle.tick(now).view,view);visited.add(view);now+=duration;}
 for(const view of ['dance','saz','drum','vipLeft','vipRight','vipOuterLeft','vipOuterRight','waiter','dj'])assert.ok(visited.has(view),view);assert.ok(!visited.has('guests'));
 for(let i=2;i<TOUR_STOPS.length;i+=2){assert.equal(TOUR_STOPS[i-1][0],'dance');assert.ok(TOUR_STOPS[i][1]<=7);}
 const floorSeconds=TOUR_STOPS.filter(([view])=>view==='dance').reduce((sum,[,duration])=>sum+duration,0),total=TOUR_STOPS.reduce((sum,[,duration])=>sum+duration,0);assert.ok(floorSeconds/total>.79);
});
test('unoccupied tour destinations are skipped, including a VIP that becomes empty mid-shot',async()=>{
 const {AutoTour,TOUR_STOPS}=await import('../public/director.js');const tour=new AutoTour();let now=0;
 for(let i=0;i<100;i++){const shot=tour.tick(now,false,view=>!view.startsWith('vip'));assert.ok(!shot.view.startsWith('vip'));now+=4;}
 tour.index=TOUR_STOPS.findIndex(([view])=>view==='vipLeft');tour.elapsed=3;
 assert.equal(tour.tick(now,false,view=>!view.startsWith('vip')).view,'dance');
 const before=tour.tick(now).danceIndex;tour.resumeDance();assert.ok(tour.tick(now).danceIndex>before);
});
test('same guest role upgrade replaces stale travel shots without a second queue entry',()=>{const q=new ShotQueue(),person={walking:true};q.push({key:'join',person,priority:1,duration:40,followArrival:true},0);q.tick(0);q.push({key:'vip',person,priority:3,duration:50,followArrival:true},3);assert.equal(q.tick(3).key,'vip');assert.equal(q.items.length,0);q.push({key:'other',person:{},priority:1,duration:5},4);assert.equal(q.items.length,1);});

const gift=(key,priority=4,duration=6,extra={})=>({key,priority,duration,protected:true,locked:true,fixedDuration:true,immediate:true,returnDuration:0,...extra});
test('gift burst retains every distinct event and uses priority then arrival order',()=>{
 const q=new ShotQueue(),seen=[],released=[];
 q.push(gift('first',1,6,{onStart:()=>seen.push('first'),onRelease:()=>released.push('first')}),0);
 const pending=Array.from({length:40},(_,i)=>({key:`gift:${i}`,priority:i%4}));
 for(const event of pending)q.push(gift(event.key,event.priority,6,{onStart:()=>seen.push(event.key),onRelease:()=>released.push(event.key)}),1);
 for(let i=0;i<30;i++)q.push({key:`chat:${i}`,priority:0,duration:2},2);
 assert.equal(q.items.filter(e=>e.protected).length,40);assert.equal(q.items.filter(e=>!e.protected).length,12);
 const expected=['first',...pending.toSorted((a,b)=>b.priority-a.priority).map(e=>e.key)];
 for(let i=1;i<=41;i++){assert.equal(q.tick(i*6-.001)?.key,expected[i-1]);q.tick(i*6);}
 assert.deepEqual(seen,expected);assert.deepEqual(released,expected);
});
test('protected gift is not interrupted by a higher priority, chat or same-person role change',()=>{
 const q=new ShotQueue(),person={walking:false};let starts=0;
 q.push(gift('dancer:1',4,10,{person,locked:false,onStart:()=>starts++}),0);
 q.push(gift('waiter:2',99,6,{person}),1);q.push({key:'chat',person,priority:999,immediate:true,duration:3},2);
 assert.equal(q.tick(9.999).key,'dancer:1');assert.equal(q.until,10);assert.equal(starts,1);
 // Incidental messages must not displace protected gifts even when their
 // numeric priority is accidentally set above a gift priority.
 assert.equal(q.tick(10).key,'waiter:2');
 assert.equal(q.tick(15.999).key,'waiter:2');
});
test('protected event keys are idempotent while waiting, playing and after completion',()=>{
 const q=new ShotQueue();let starts=0,releases=0;const event=()=>gift('rose:123',4,6,{onStart:()=>starts++,onRelease:()=>releases++});
 q.push(gift('busy',5,6),0);q.push(event(),1);for(let i=0;i<20;i++)assert.equal(q.push(event(),2),false);
 assert.equal(q.items.length,1);q.tick(6);for(let i=0;i<20;i++)q.push(event(),7);assert.equal(q.until,12);q.tick(12);q.push(event(),13);
 assert.equal(q.current,null);assert.equal(q.items.length,0);assert.equal(starts,1);assert.equal(releases,1);
 q.clear();assert.equal(q.push(event(),14),true);assert.equal(starts,2);
});
test('role synchronization preserves protected presentations; explicit removal and reset cancel them',()=>{
 const q=new ShotQueue(),person={};let released=0;
 q.push(gift('active',4,8,{person,onRelease:()=>released++}),0);q.push(gift('pending',4,8,{person,onRelease:()=>released++}),1);
 q.removePerson(person);assert.equal(q.current.key,'active');assert.equal(q.items.length,1);assert.equal(released,0);
 q.removePerson(person,{force:true});assert.equal(q.current,null);assert.equal(q.items.length,0);assert.equal(released,2);
 q.push(gift('reset',4,8,{person,onRelease:()=>released++}),2);q.clear();assert.equal(released,3);
});
test('protected gift interrupts a free entrance and new gifts respect the queued priority during camera return',()=>{
 const q=new ShotQueue();let released=0;
 q.push({key:'join',person:{walking:true},followArrival:true,priority:1,duration:60,onRelease:()=>released++},0);q.tick(0);
 q.push(gift('saz',4,8,{returnDuration:1}),1);assert.equal(q.current.key,'saz');assert.equal(released,1);
 q.push(gift('high',6,6),2);q.tick(9);assert.equal(q.current,null);
 q.push(gift('new-low',1,6),9.5);assert.equal(q.current,null);assert.equal(q.tick(10).key,'high');
});
