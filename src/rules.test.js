import { test } from 'node:test';
import assert from 'node:assert/strict';
import { circleHitsBox, reloadAmmo, formatTime } from './rules.js';
test('cover collision includes edges but permits movement outside cover',()=>{
  const cover={x:0,z:0,w:4,d:4};
  assert.equal(circleHitsBox(0,0,.4,cover),true);
  assert.equal(circleHitsBox(2.2,0,.4,cover),true);
  assert.equal(circleHitsBox(3,0,.4,cover),false);
  assert.equal(circleHitsBox(2.35,2.35,.4,cover),false);
});
test('reload conserves ammo and respects magazine and reserve limits',()=>{
  assert.deepEqual(reloadAmmo(5,100),{ammo:24,reserve:81});
  assert.deepEqual(reloadAmmo(0,7),{ammo:7,reserve:0});
  assert.deepEqual(reloadAmmo(24,50),{ammo:24,reserve:50});
});
test('round timer rounds up and never displays negative time',()=>{
  assert.equal(formatTime(90),'01:30');assert.equal(formatTime(.1),'00:01');assert.equal(formatTime(-1),'00:00');
});
