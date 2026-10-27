const assert = require('node:assert/strict');
const test = require('node:test');

function database(initial = [], failOnceAt) {
  const records = new Map(initial.map((row, index) => [row._id || `legacy-${index}`, { ...row }]));
  let failed = false;
  let writes = 0;
  async function write(id, data) {
    if (!failed && data.id === failOnceAt) {
      failed = true;
      throw new Error('temporary database failure');
    }
    writes += 1;
    records.set(id, { ...data, _id: id });
    return { _id: id };
  }
  const collection = {
    count: async () => ({ total: records.size }),
    add: async ({ data }) => write(`auto-${writes}`, data),
    doc: id => ({ set: async ({ data }) => write(id, data) }),
    where: filter => ({
      limit() { return this; },
      get: async () => ({
        data: [...records.values()].filter(row => Object.entries(filter).every(([key, value]) => row[key] === value)),
      }),
    }),
  };
  return {
    db: { collection(name) { assert.equal(name, 'patterns'); return collection; } },
    records,
    writes: () => writes,
  };
}

// Each function is uploaded as its own folder; exercise the deployed copies as
// well as the canonical helper to prevent a fix that works only in local tests.
for (const location of ['shared', 'getPatterns/shared', 'submitGame/shared', 'unlockPattern/shared']) {
  const { seedPatterns, SEED_PATTERNS } = require(`../cloudfunctions/${location}/utils.js`);

  test(`${location}: completes partial initialization without replacing existing records`, async () => {
    const h = database([
      { ...SEED_PATTERNS[0], name: 'curated name', _id: 'legacy-hudie' },
      { id: 'custom', name: 'custom pattern', _id: 'custom-record' },
    ]);
    await seedPatterns(h.db);
    assert.equal(h.records.size, SEED_PATTERNS.length + 1);
    assert.equal(h.records.get('legacy-hudie').name, 'curated name');
    assert.equal(h.records.get('custom-record').name, 'custom pattern');
    for (const pattern of SEED_PATTERNS) {
      assert.equal([...h.records.values()].filter(row => row.id === pattern.id).length, 1);
    }
    const writes = h.writes();
    await seedPatterns(h.db);
    assert.equal(h.writes(), writes);
  });

  test(`${location}: surfaces a failed write and repairs the partial seed on retry`, async () => {
    const h = database([], SEED_PATTERNS[2].id);
    await assert.rejects(seedPatterns(h.db), /temporary database failure/);
    assert.equal(h.records.size, 2);
    await seedPatterns(h.db);
    assert.equal(h.records.size, SEED_PATTERNS.length);
  });

  test(`${location}: simultaneous first loads converge without duplicate pattern IDs`, async () => {
    const h = database();
    await Promise.all([seedPatterns(h.db), seedPatterns(h.db)]);
    assert.equal(h.records.size, SEED_PATTERNS.length);
    assert.equal(new Set([...h.records.values()].map(row => row.id)).size, SEED_PATTERNS.length);
  });
}
