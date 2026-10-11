const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const test = require('node:test');
const vm = require('node:vm');
const { SEED_PATTERNS } = require('../cloudfunctions/shared/utils.js');

function harness(initialOpenid = 'alice') {
  let openid = initialOpenid;
  let nextId = 0;
  let calls = 0;
  const tables = { patterns: SEED_PATTERNS.map(p => ({ ...p })) };
  const db = {
    collection(name) {
      calls += 1;
      tables[name] ||= [];
      const rows = tables[name];
      function query(where = {}, offset = 0, size = 100) {
        const selected = () => rows.filter(row => Object.entries(where).every(([key, value]) => row[key] === value));
        return {
          where: filter => query(filter, offset, size),
          orderBy: () => query(where, offset, size),
          skip: value => query(where, value, size),
          limit: value => query(where, offset, value),
          count: async () => ({ total: selected().length }),
          get: async () => ({ data: selected().slice(offset, offset + size) }),
          add: async ({ data }) => {
            const _id = `row-${++nextId}`;
            rows.push({ ...data, _id });
            return { _id };
          }
        };
      }
      return query();
    }
  };
  function load(name) {
    const file = path.resolve(__dirname, `../cloudfunctions/${name}/index.js`);
    const localRequire = createRequire(file);
    const exports = {};
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
      exports,
      require: id => id === 'wx-server-sdk' ? {
        init() {}, DYNAMIC_CURRENT_ENV: 'test', database: () => db,
        getWXContext: () => ({ OPENID: openid }),
      } : localRequire(id),
      Date, console,
    }, { filename: file });
    return exports.main;
  }
  return { load, tables, setOpenid(value) { openid = value; }, calls: () => calls };
}

test('cloud saves retain caller ownership and ignore a forged payload owner', async () => {
  const h = harness();
  for (const [name, collection, idField] of [
    ['saveWork', 'works', 'workId'], ['saveDraft', 'drafts', 'draftId'],
    ['saveMbtiResult', 'mbti_results', 'resultId'],
  ]) {
    const result = await h.load(name)({ payload: { title: 'my work', _openid: 'bob' } });
    assert.ok(result[idField]);
    assert.equal(h.tables[collection][0]._openid, 'alice');
  }
  const own = await h.load('getMyWorks')({});
  assert.equal(own.list.length, 1);
  h.setOpenid('bob');
  assert.equal((await h.load('getMyWorks')({})).list.length, 0);
});

test('missing cloud identity cannot read other users works', async () => {
  const h = harness(undefined);
  h.setOpenid(undefined);
  h.tables.works = [{ _openid: 'alice', title: 'private work' }];
  const result = await h.load('getMyWorks')({});
  assert.equal(result.list.length, 0);
  assert.equal(result.hasMore, false);
  assert.equal(h.calls(), 0);
});

test('anonymous cloud calls cannot create personal records', async () => {
  const h = harness();
  h.setOpenid(undefined);
  for (const name of ['saveWork', 'saveDraft', 'saveMbtiResult', 'submitGame']) {
    await assert.rejects(h.load(name)({ payload: {}, score: 100 }), /微信用户身份/);
  }
  assert.equal(h.calls(), 0);
});

test('repeated cloud login finds its original user record', async () => {
  const h = harness();
  const login = h.load('login');
  const first = await login();
  const again = await login();
  assert.equal(first.user.id, 'alice');
  assert.equal(again.user.id, 'alice');
  assert.equal(h.tables.users.length, 1);
  assert.equal(h.tables.users[0]._openid, 'alice');
});

test('cloud unlocks are owned and a repeat does not create a duplicate', async () => {
  const h = harness();
  const unlock = h.load('unlockPattern');
  assert.equal((await unlock({ patternId: 'shui' })).isNew, true);
  assert.equal((await unlock({ patternId: 'shui' })).isNew, false);
  assert.equal(h.tables.user_patterns.length, 1);
  assert.equal(h.tables.user_patterns[0]._openid, 'alice');
  assert.equal((await unlock({ patternId: 'missing' })).isNew, false);
  assert.equal(h.tables.user_patterns.length, 1);
});

test('successive cloud game rewards progress using owned unlock records', async () => {
  const h = harness();
  const submit = h.load('submitGame');
  assert.equal((await submit({ score: 100, duration: 60 })).reward.patternId, 'shui');
  assert.equal((await submit({ score: 100, duration: 60 })).reward.patternId, 'cang');
  assert.ok(h.tables.game_scores.every(row => row._openid === 'alice'));
  assert.ok(h.tables.user_patterns.every(row => row._openid === 'alice'));
});
