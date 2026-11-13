import test from 'node:test';
import assert from 'node:assert/strict';
import {DanceTour} from '../public/dance-tour.js';
function guests(count){const people=Array.from({length:count},(_,i)=>({viewerId:String(i),role:'dance',root:{position:{x:(i%8)*3,z:Math.floor(i/8)*3}},dancePartner:null}));for(let i=0;i<count-1;i+=2){people[i].dancePartner=people[i+1];people[i+1].dancePartner=people[i];}return people;}
test('all 84 floor viewers are visited before any pair repeats, regardless of list order',()=>{
 const tour=new DanceTour(),people=guests(84),seen=new Set();
 for(let i=0;i<42;i++){const pair=tour.pick(i%2?people.toReversed():people,i);for(const p of [pair.first,pair.second]){assert.ok(!seen.has(p.viewerId));seen.add(p.viewerId);}assert.equal(tour.pick(people,i),pair);}
 assert.equal(seen.size,84);assert.ok(tour.pick(people,42));
});
test('new viewers and the unpaired last guest get airtime without invalidating a running shot',()=>{
 const tour=new DanceTour(),people=guests(5),seen=new Set();for(let i=0;i<3;i++){const p=tour.pick(people,i);seen.add(p.first);if(p.second)seen.add(p.second);}assert.equal(seen.size,5);
 const current=tour.current,newGuest={viewerId:'new',role:'dance',root:{position:{x:0,z:1}},dancePartner:null};people.push(newGuest);
 assert.equal(tour.pick(people,2),current);assert.equal(tour.pick(people,3).first,newGuest);
 newGuest.role='vip';assert.notEqual(tour.pick(people,3).first,newGuest);
});
