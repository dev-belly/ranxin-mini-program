const assert = require('node:assert/strict');
const test = require('node:test');
const api = require('../utils/api.js');

test('collection distinguishes the full catalog from unlocked patterns', async () => {
  const previousWx = global.wx;
  const previousPage = global.Page;
  const previousGetPatterns = api.getPatterns;
  let storedUnlocks = [];
  let page;
  global.wx = { getStorageSync: () => storedUnlocks };
  global.Page = definition => { page = definition; };

  try {
    require('../pages/collection/collection.js');
    page.setData = function (patch, callback) {
      Object.assign(this.data, patch);
      if (callback) callback();
    };

    const load = () => new Promise(resolve => {
      page.renderThumbs = resolve;
      page.loadUnlocked();
    });

    await load();
    assert.equal(page.data.unlockedCount, 2);
    assert.deepEqual(page.data.viewList.filter(item => item.unlocked).map(item => item.id), [
      'hudie', 'tuan'
    ]);
    assert.equal(page.data.viewList.find(item => item.id === 'shui').unlocked, false);

    storedUnlocks = ['shui'];
    await load();
    assert.equal(page.data.unlockedCount, 3);
    assert.equal(page.data.viewList.find(item => item.id === 'shui').unlocked, true);
    assert.equal(page.data.viewList.find(item => item.id === 'cang').unlocked, false);

    api.getPatterns = () => Promise.reject(new Error('offline'));
    await load();
    assert.equal(page.data.unlockedCount, 3);
    assert.equal(page.data.viewList.find(item => item.id === 'cang').unlocked, false);
  } finally {
    api.getPatterns = previousGetPatterns;
    global.wx = previousWx;
    global.Page = previousPage;
  }
});
