import test from 'node:test';
import assert from 'node:assert/strict';
import {isOlderState} from '../public/state-order.js';
test('late control response cannot undo latest role delivered over SSE',()=>{
 const before={epoch:'night',mode:'live',seq:10,players:[{id:'a',role:'saz'}]};
 const after={...before,seq:14,players:[{id:'a',role:'dancer'}]};let state=null;
 for(const incoming of [before,after,before])if(!isOlderState(incoming,state))state=incoming;
 assert.equal(state.players[0].role,'dancer');
 assert.equal(isOlderState({...after,settings:{volume:.5}},state),false);
 assert.equal(isOlderState({...before,epoch:'next-night',seq:0},state),false);
 assert.equal(isOlderState({...before,mode:'preview',seq:0},state),false);
});
