const assert = require('node:assert/strict');
const test = require('node:test');
const api = require('../utils/api.js');
const { PhysicsWorld } = require('../pages/game/game-physics.js');

test('game counts real drops and merges', () => {
  const world = new PhysicsWorld(300, 400);
  world.spawnLevel = 0;
  world.nextLevel = 0;
  world.drop(100);
  world.drop(100);
  assert.equal(world.dropCount, 2);
  world._queueMerge(world.balls[0], world.balls[1]);
  world._resolveMerges();
  assert.equal(world.mergeCount, 1);
  assert.equal(world.balls.length, 1);
});

test('game result only announces newly unlocked patterns', () => {
  const previousWx = global.wx;
  const previousPage = global.Page;
  const previousSubmitGame = api.submitGame;
  const storage = new Map();
  let page;
  global.wx = {
    getStorageSync: key => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value)
  };
  global.Page = definition => { page = definition; };
  api.submitGame = () => Promise.resolve({});

  try {
    delete require.cache[require.resolve('../pages/game/game.js')];
    require('../pages/game/game.js');
    page.setData = function (patch) { Object.assign(this.data, patch); };
    page.data.best = 0;
    page._startTime = Date.now() - 2500;

    page.world = { score: 0, maxLevel: 1, dropCount: 2, mergeCount: 0 };
    page._endGame();
    assert.equal(page.data.result.topPattern, null);
    assert.deepEqual(page.data.result.unlockedPatterns.map(item => item.id), ['tuan', 'hudie']);
    assert.equal(page.data.result.unlockedCount, 2);
    assert.equal(page.data.result.dropCount, 2);
    assert.equal(page.data.result.mergeCount, 0);
    assert.equal(page.data.result.time, 2);

    page.data.gameOver = false;
    page.world = { score: 125, maxLevel: 4, dropCount: 8, mergeCount: 4 };
    page._endGame();
    assert.equal(page.data.result.topPattern.id, 'shui');
    assert.deepEqual(page.data.result.unlockedNow, ['shui']);
    assert.equal(page.data.result.unlockedCount, 3);
    assert.equal(page.data.result.dropCount, 8);
    assert.equal(page.data.result.mergeCount, 4);

    page.data.gameOver = false;
    page._endGame();
    assert.equal(page.data.result.topPattern, null);
    assert.deepEqual(page.data.result.unlockedNow, []);
    assert.equal(page.data.result.unlockedCount, 3);
  } finally {
    api.submitGame = previousSubmitGame;
    global.wx = previousWx;
    global.Page = previousPage;
  }
});
