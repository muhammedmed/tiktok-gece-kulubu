import test from 'node:test';
import assert from 'node:assert/strict';
import {updatePortrait} from '../public/portrait.js';

function actor(name='İpek') {
 const requests=[];
 const cell={textContent:'',children:[],querySelector(){return this.children[0]||null;},
  replaceChildren(...children){this.children=children;this.textContent='';},
  ownerDocument:{createElement(tag){assert.equal(tag,'img');const img={};requests.push(img);return img;}}};
 return {person:{name,tag:{querySelector:()=>cell}},cell,requests};
}
const url='https://example.com/portrait.jpg';

test('initial remains while loading; successful portrait is reused instead of fetched each state update', () => {
 const {person,cell,requests}=actor();updatePortrait(person,{name:'İpek',avatar:url});
 assert.equal(cell.textContent,'İ');assert.equal(cell.children.length,0);assert.equal(requests[0].referrerPolicy,'no-referrer');
 for(let i=0;i<100;i++)updatePortrait(person,{name:'İpek',avatar:url});
 assert.equal(requests.length,1);requests[0].onload();assert.equal(cell.children[0].src,url);
 updatePortrait(person,{name:'İpek'});assert.equal(cell.children[0],requests[0]);assert.equal(requests.length,1);
});

test('network failure preserves fallback and allows bounded retries on later updates', t => {
 t.mock.timers.enable({apis:['Date'],now:1000});
 const {person,cell,requests}=actor();const data={name:'İpek',avatar:url};
 updatePortrait(person,data);requests[0].onerror();assert.equal(cell.textContent,'İ');
 updatePortrait(person,data);assert.equal(requests.length,1);
 t.mock.timers.tick(5000);updatePortrait(person,data);assert.equal(requests.length,2);
 requests[1].onerror();t.mock.timers.tick(29999);updatePortrait(person,data);assert.equal(requests.length,2);
 t.mock.timers.tick(1);updatePortrait(person,data);requests[2].onerror();
 t.mock.timers.tick(600000);updatePortrait(person,data);assert.equal(requests.length,3);
 updatePortrait(person,{...data,avatar:url+'?fresh=1'});assert.equal(requests.length,4);requests[3].onload();
 assert.equal(cell.children[0],requests[3]);
});

test('out-of-order loads cannot overwrite a newer avatar, and a bad replacement keeps the previous photo', () => {
 const {person,cell,requests}=actor();
 updatePortrait(person,{name:'İpek',avatar:url});
 updatePortrait(person,{name:'İpek',avatar:url+'?new=1'});
 requests[1].onload();requests[0].onload();assert.equal(cell.children[0],requests[1]);
 updatePortrait(person,{name:'İpek',avatar:url+'?new=2'});requests[2].onerror();
 assert.equal(cell.children[0],requests[1]);
});

test('same display names have independent portraits; fallback initials follow name changes', () => {
 const a=actor('Ada'),b=actor('Ada');
 updatePortrait(a.person,{name:'Ada',avatar:url});updatePortrait(b.person,{name:'Ada',avatar:url+'?b=1'});
 a.requests[0].onload();b.requests[0].onload();assert.notEqual(a.cell.children[0].src,b.cell.children[0].src);
 const c=actor();updatePortrait(c.person,{name:'Ece'});assert.equal(c.cell.textContent,'E');assert.equal(c.requests.length,0);
});
