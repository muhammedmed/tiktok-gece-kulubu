import test from 'node:test';
import assert from 'node:assert/strict';
import {openLive} from '../src/live.js';

function watch(t) {
  t.mock.timers.enable({apis:['setTimeout']});
  const sockets = [], statuses = [], events = [];
  class Socket {
    constructor() { sockets.push(this); }
    close() { this.onclose({code:1000}); }
    message(type, data) { this.onmessage({data:JSON.stringify({messages:[{type, data}]})}); }
  }
  const stop = openLive({Socket, handle:'example', key:'test', waitForLive:true,
    onStatus:status => statuses.push(status), onEvent:event => events.push(event)});
  t.after(stop);
  return {sockets, statuses, events, stop, tick:ms => t.mock.timers.tick(ms)};
}

test('kapalı yayını sessizce bekler, açıldığında ilk yorumu işler ve sonraki yayını bekler', t => {
  const {sockets, statuses, events, tick} = watch(t);
  sockets[0].onclose({code:4404});
  for (let i = 1; i <= 3; i++) {
    tick(15000);
    sockets[i].message('room.status', {state:'connecting'});
    sockets[i].message('room.status', {state:'offline', terminal:true});
  }
  tick(89000);
  assert.equal(sockets.length, 4);
  assert.deepEqual(statuses, ['connecting','waiting']);
  tick(1000);
  const live = sockets[4];
  live.message('WebcastChatMessage', {user:{id:'4',nickname:'Ada'},content:'katıl'});
  assert.equal(statuses.at(-1), 'live');
  assert.equal(events[0].text, 'katıl');
  live.message('tiktok.disconnect', {reason:4005});
  live.onclose({code:4005});
  assert.equal(statuses.at(-1), 'waiting');
  tick(15000);
  assert.equal(sockets.length, 6);
});

test('kota dolunca bekler, kimlik hatasında durur, iptal edilen denemeyi canlandırmaz', t => {
  const {sockets, statuses, tick, stop} = watch(t);
  sockets[0].onclose({code:4429});
  tick(59000);
  assert.equal(sockets.length, 1);
  tick(1000);
  sockets[1].message('room.status', {state:'error', terminal:true, code:4401});
  tick(600000);
  assert.deepEqual(statuses, ['connecting','retry','error']);
  assert.equal(sockets.length, 2);
  stop();
});

test('geçici ağ kesintilerinde yeniden bağlanır, durdurulunca son beklemeyi iptal eder', t => {
  const {sockets, statuses, tick, stop} = watch(t);
  for (let i = 0; i < 7; i++) {
    sockets[i].onclose({code:1006});
    tick(30000);
  }
  assert.equal(sockets.length, 8);
  sockets[7].onclose({code:4404});
  stop();
  tick(120000);
  assert.equal(sockets.length, 8);
  assert.equal(statuses.at(-1), 'waiting');
});
