const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function mockApi(works) {
  const module = { exports: {} };
  const file = path.resolve(__dirname, '../utils/api.js');
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), {
    module,
    setTimeout: callback => callback(),
    wx: { getStorageSync: () => works },
  }, { filename: file });
  return module.exports;
}

test('mock works pagination returns disjoint bounded pages and the last-page flag', async () => {
  const works = Array.from({ length: 25 }, (_, index) => ({ workId: `work-${index}` }));
  const api = mockApi(works);
  const first = await api.getMyWorks({});
  const second = await api.getMyWorks({ page: 2, pageSize: 10 });
  const third = await api.getMyWorks({ page: 3, pageSize: 10 });
  assert.deepEqual(first.list.map(row => row.workId), works.slice(0, 10).map(row => row.workId));
  assert.deepEqual(second.list.map(row => row.workId), works.slice(10, 20).map(row => row.workId));
  assert.deepEqual(third.list.map(row => row.workId), works.slice(20).map(row => row.workId));
  assert.equal(second.hasMore, true);
  assert.equal(third.hasMore, false);
});

test('mock rejects malformed pagination before reading storage', async () => {
  const api = mockApi(new Proxy([], {
    get() { throw new Error('invalid pagination must not read records'); },
  }));
  for (const params of [
    { page: -1 }, { page: 0 }, { page: 1.5 }, { page: '2' },
    { page: Infinity }, { page: Number.MAX_SAFE_INTEGER, pageSize: 2 },
    { pageSize: '2' }, { pageSize: null }, { pageSize: 0 },
    { pageSize: -10 }, { pageSize: 1.5 }, { pageSize: 101 },
  ]) {
    await assert.rejects(api.getMyWorks(params), /分页参数无效/);
  }
});
