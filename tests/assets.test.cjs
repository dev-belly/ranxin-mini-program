const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const assets = require('../utils/assets.js');

test('the collection can load its packaged pattern manifest', () => {
  assert.equal(assets.patternFile('hudie'), 'hudie.png');
  assert.equal(assets.patternFile('shui'), 'shui.png');
  assert.equal(assets.patternFile('unknown'), null);
  assert.equal(assets.assetPath('hudie.png'), '/assets/patterns/hudie.png');
});

test('a failed image access preserves the canvas fallback', async () => {
  const originalWx = global.wx;
  global.wx = {
    getFileSystemManager: () => ({
      access: ({ path: asset, success, fail }) => {
        const file = path.join(__dirname, '..', asset.slice(1));
        if (asset.endsWith('/shui.png')) fail();
        else if (fs.existsSync(file)) success();
        else fail();
      }
    })
  };
  try {
    const resolved = await assets.resolvePatternAssets([
      { id: 'hudie' }, { id: 'shui' }, { id: 'unknown' }
    ]);
    assert.deepEqual(resolved.hudie, { file: 'hudie.png', hasImage: true });
    assert.deepEqual(resolved.shui, { file: 'shui.png', hasImage: false });
    assert.deepEqual(resolved.unknown, { file: null, hasImage: false });
  } finally {
    global.wx = originalWx;
  }
});
