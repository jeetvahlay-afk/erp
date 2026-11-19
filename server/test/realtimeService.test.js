const test = require('node:test');
const assert = require('node:assert/strict');
const { subscribe, publish } = require('../src/services/realtimeService');

test('publishes only to subscribed recipients', () => {
  const writes = [];
  const unsubscribe = subscribe('one', { write: (value) => writes.push(value) });
  publish(['one', 'two'], 'notification', { title: 'Live' });
  unsubscribe();
  publish('one', 'notification', { title: 'Ignored' });
  assert.equal(writes.length, 1);
  assert.match(writes[0], /event: notification/);
  assert.match(writes[0], /"title":"Live"/);
});
