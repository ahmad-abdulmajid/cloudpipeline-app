const test = require('node:test');
const assert = require('node:assert/strict');

test('deliberate failure to verify CI', () => {
  assert.equal(1, 2);
});
