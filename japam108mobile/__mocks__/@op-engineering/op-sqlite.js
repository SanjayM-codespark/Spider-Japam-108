/**
 * Manual mock for op-sqlite.
 *
 * The real package is a native module, so it cannot load under jest. This
 * stands in for it with an in-memory store: enough for the app tree to import
 * and run its queries, which is what the render smoke test needs.
 *
 * Jest picks this up automatically for a node_modules package, so no
 * jest.mock() call is required in the tests themselves.
 */
const rowsFor = value => {
  if (Array.isArray(value)) {
    return {_array: value};
  }
  return {rows: value == null ? [] : value};
};

const makeDatabase = () => {
  const closed = {value: false};

  const db = {
    execute: jest.fn(async (sql, params) => {
      // CREATE TABLE and friends report no rows; the app checks the result of
      // a few SELECTs, so those hand back an empty row set.
      if (/^\s*select/i.test(sql)) {
        return rowsFor([]);
      }
      return rowsFor([]);
    }),
    executeSync: jest.fn(() => rowsFor([])),
    executeBatch: jest.fn(async () => []),
    transaction: jest.fn(async fn => (typeof fn === 'function' ? fn() : undefined)),
    loadFile: jest.fn(async () => undefined),
    updateAssets: jest.fn(async () => undefined),
    close: jest.fn(() => {
      closed.value = true;
    }),
    isOpen: jest.fn(() => !closed.value),
  };

  return db;
};

const databases = new Map();

module.exports = {
  open: jest.fn(async ({name, location} = {}) => {
    const key = name || 'default';
    if (!databases.has(key)) {
      databases.set(key, makeDatabase());
    }
    return databases.get(key);
  }),
  // Also exported so tests can drive the store directly.
  __reset: () => databases.clear(),
};
