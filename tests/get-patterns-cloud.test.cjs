const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

test('cloud unlockedOnly keeps locked patterns hidden without an OPENID', async () => {
  const originalLoad = Module._load;
  const patterns = [
    { id: 'hudie', unlockedByDefault: true },
    { id: 'tuan', unlockedByDefault: true },
    { id: 'shui', unlockedByDefault: false }
  ];
  const db = {
    collection(name) {
      assert.equal(name, 'patterns');
      return {
        count: async () => ({ total: patterns.length }),
        get: async () => ({ data: patterns })
      };
    }
  };
  Module._load = function (request, parent, isMain) {
    if (request === 'wx-server-sdk') {
      return {
        DYNAMIC_CURRENT_ENV: 'test',
        init() {},
        database: () => db,
        getWXContext: () => ({})
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve('../cloudfunctions/getPatterns/index.js')];
    const { main } = require('../cloudfunctions/getPatterns/index.js');
    const unlocked = await main({ unlockedOnly: true });
    assert.deepEqual(unlocked.map(pattern => pattern.id), ['hudie', 'tuan']);
    const catalog = await main({});
    assert.equal(catalog.length, 3);
  } finally {
    Module._load = originalLoad;
  }
});
