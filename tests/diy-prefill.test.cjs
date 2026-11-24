const assert = require('node:assert/strict');
const test = require('node:test');
const engine = require('../utils/pattern-engine.js');

test('DIY consumes recommendations on entry and preserves crafts already in progress', () => {
  const previousPage = global.Page;
  const previousWx = global.wx;
  const storage = new Map([['ranxin_diy_prefill', 'ling']]);
  let page;
  global.Page = (definition) => { page = definition; };
  global.wx = {
    getStorageSync: (key) => storage.get(key),
    removeStorageSync: (key) => storage.delete(key)
  };

  try {
    require('../pages/diy/diy.js');
    page.setData = function (patch, callback) {
      Object.assign(this.data, patch);
      if (callback) callback();
    };

    page.onLoad();
    assert.equal(page.data.patternId, 'ling');
    assert.equal(page.data.selPattern.id, 'ling');
    assert.equal(page.data.petals, engine.getPatternById('ling').petals);
    assert.equal(storage.has('ranxin_diy_prefill'), false);

    page.setData({ stage: 'craft', step: 3 });
    storage.set('ranxin_diy_prefill', 'he');
    page.onShow();
    assert.equal(page.data.patternId, 'ling');
    assert.equal(page.data.step, 3);
    assert.equal(storage.get('ranxin_diy_prefill'), 'he');

    page.replay();
    assert.equal(page.data.stage, 'mood');
    assert.equal(page.data.selPattern.id, 'he');
    assert.equal(page.data.petals, engine.getPatternById('he').petals);
    assert.equal(storage.has('ranxin_diy_prefill'), false);

    storage.set('ranxin_diy_prefill', 'shui');
    page.onShow();
    assert.equal(page.data.selPattern.id, 'shui');
    assert.equal(storage.has('ranxin_diy_prefill'), false);
  } finally {
    global.Page = previousPage;
    global.wx = previousWx;
  }
});
