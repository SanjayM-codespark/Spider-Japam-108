/**
 * "Start Naam Jap" turns the reading being viewed into a naam, because the
 * counter counts a naam and takes no reading. That means the reading has to
 * survive a round trip: opening the same reading twice must not leave two
 * naams, and it must not lose the count the user put into the first one.
 */
type Row = Record<string, any>;

export {};

/**
 * The database module grabs its SQLite handle once at first use, so it is
 * required afresh per test after the handle above is swapped out.
 */
const loadDb = () =>
  require('../src/database/database') as typeof import('../src/database/database');

/** Minimal in-memory stand-in for the `naam` table. */
const makeTable = () => {
  const rows: Row[] = [];
  const sql: string[] = [];
  let nextId = 1;
  return {
    rows,
    sql,
    execute: async (statement: string, params: any[] = []) => {
      sql.push(statement.trim());
      if (statement.includes('PRAGMA table_info(naam)')) {
        // Report the post-migration shape so the open path does not try to
        // ALTER anything, which keeps the log about the calls under test.
        return {rows: [{name: 'content_id'}]};
      }
      if (statement.includes('SELECT id FROM naam WHERE content_id')) {
        return {rows: rows.filter(r => r.content_id === params[0])};
      }
      if (statement.includes('UPDATE naam SET name = ?')) {
        const [name, mantra, beadCount, id] = params;
        rows.forEach(r => {
          if (r.id === id) {
            Object.assign(r, {name, mantra, bead_count: beadCount});
          }
        });
        return {rows: []};
      }
      if (statement.includes('INSERT INTO naam')) {
        const [name, mantra, beadCount, contentId] = params;
        const row: Row = {
          id: nextId++,
          name,
          mantra,
          bead_count: beadCount,
          content_id: contentId,
          is_default: 0,
          is_selected: 0,
          count: 0,
          total_beads: 0,
          remote_id: null,
        };
        rows.push(row);
        return {rows: [], insertId: row.id};
      }
      if (statement.includes('UPDATE naam SET is_selected = 0')) {
        rows.forEach(r => {
          r.is_selected = 0;
        });
        return {rows: []};
      }
      if (statement.includes('UPDATE naam SET is_selected = 1 WHERE id = ?')) {
        rows.forEach(r => {
          if (r.id === params[0]) {
            r.is_selected = 1;
          }
        });
        return {rows: []};
      }
      // Everything else is the open path: table creation, migrations, settings.
      return {rows: []};
    },
  };
};

const GAYATRI = {
  contentId: 7,
  name: 'Gayatri Mantra',
  mantra: 'ॐ भूर् भुवः स्वः',
  beadCount: 108,
};

describe('selectNaamForContent', () => {
  let table: ReturnType<typeof makeTable>;

  beforeEach(() => {
    jest.resetModules();
    table = makeTable();
    jest.doMock('@op-engineering/op-sqlite', () => ({
      open: async () => table,
    }));
  });

  afterEach(() => {
    jest.dontMock('@op-engineering/op-sqlite');
  });

  it('creates a naam for the reading and selects it', async () => {
    const {selectNaamForContent: select} = loadDb();
    const id = await select(GAYATRI);

    expect(table.rows).toHaveLength(1);
    const [row] = table.rows;
    expect(row.id).toBe(id);
    expect(row.name).toBe('Gayatri Mantra');
    expect(row.mantra).toBe('ॐ भूर् भुवः स्वः');
    expect(row.bead_count).toBe(108);
    // Selected, so the counter shows this reading rather than the old one.
    expect(row.is_selected).toBe(1);
  });

  it('marks the naam as belonging to the device, not the admin panel', async () => {
    const {selectNaamForContent: select} = loadDb();
    await select(GAYATRI);

    // is_default 0 keeps the naams that arrive on the next sync from
    // overwriting or removing it.
    expect(table.rows[0].is_default).toBe(0);
    expect(table.rows[0].remote_id).toBeNull();
  });

  it('reuses the same naam when the reading is started again', async () => {
    const {selectNaamForContent: select} = loadDb();
    const first = await select(GAYATRI);
    // The user counted some beads in between.
    table.rows[0].count = 42;

    const second = await select(GAYATRI);

    expect(table.rows).toHaveLength(1);
    expect(second).toBe(first);
    // The count is the user's history and must survive a re-open.
    expect(table.rows[0].count).toBe(42);
  });

  it('gives each reading its own naam', async () => {
    const {selectNaamForContent: select} = loadDb();
    await select(GAYATRI);
    await select({...GAYATRI, contentId: 8, name: 'Saraswati Stotra'});

    expect(table.rows).toHaveLength(2);
    // Only the reading started most recently is the selected one.
    expect(table.rows.filter(r => r.is_selected === 1)).toHaveLength(1);
    expect(table.rows.find(r => r.is_selected === 1)?.name).toBe('Saraswati Stotra');
  });

  it('carries an edit to the reading over without losing the count', async () => {
    const {selectNaamForContent: select} = loadDb();
    await select(GAYATRI);
    table.rows[0].count = 7;
    table.rows[0].total_beads = 70;

    await select({...GAYATRI, name: 'Gayatri', beadCount: 1008});

    expect(table.rows).toHaveLength(1);
    expect(table.rows[0].name).toBe('Gayatri');
    expect(table.rows[0].bead_count).toBe(1008);
    expect(table.rows[0].count).toBe(7);
    expect(table.rows[0].total_beads).toBe(70);
  });
});
