import {open} from '@op-engineering/op-sqlite';

export interface Naam {
  id: number;
  name: string;
  mantra: string;
  bead_count: number;
  daily_goal: number;
  weekly_goal: number;
  monthly_goal: number;
  yearly_goal: number;
  is_selected: number;
  is_default: number;
  count: number;
  total_beads: number;
  /**
   * Id of this naam in the backend `naams` table, or null when the naam was
   * created on the phone. `id` stays the local row id so the counter and the
   * reports keep working on names the device chose itself.
   */
  remote_id: number | null;
  /**
   * Id of the Sacred Library reading this naam was created from, or null for a
   * naam that was not. It is what lets "Start Naam Jap" find the naam it made
   * for a reading instead of adding the same reading again.
   */
  content_id: number | null;
  created_at: string;
}

/** A naam as it comes from the backend, ready to be written to the local table. */
export interface RemoteNaamInput {
  remoteId: number;
  name: string;
  mantra: string;
  beadCount: number;
  dailyGoal: number;
  weeklyGoal: number;
  monthlyGoal: number;
  yearlyGoal: number;
}

let dbPromise: Promise<any> | null = null;
let writeQueue: Promise<any> = Promise.resolve();

export const getDatabase = (): Promise<any> => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await open({name: 'spiderNaamJap.db'});
      await database.execute('PRAGMA journal_mode = WAL;');
      await createTable(database);
      return database;
    })();
  }
  return dbPromise as Promise<any>;
};

export const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Naams an earlier build of the app shipped with. They were written into the
 * local table on first launch and are not owned by the admin panel, so they are
 * removed once. Naams now only come from the backend.
 */
const PRESEEDED_NAAM_NAMES = [
  'Hare Krishna',
  'Om Namah Shivaya',
  'Ram',
  'Om',
  'Gayatri Mantra',
];

const createTable = async (database: any) => {
  await database.execute(
    `CREATE TABLE IF NOT EXISTS naam (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mantra TEXT DEFAULT '',
      bead_count INTEGER DEFAULT 108,
      daily_goal INTEGER DEFAULT 1,
      weekly_goal INTEGER DEFAULT 7,
      monthly_goal INTEGER DEFAULT 30,
      yearly_goal INTEGER DEFAULT 365,
      is_selected INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      count INTEGER DEFAULT 0,
      total_beads INTEGER DEFAULT 0,
      remote_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
  );

  await database.execute(
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`,
  );

  await database.execute(
    `CREATE TABLE IF NOT EXISTS count_daily (
      naam_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      from_backfill INTEGER DEFAULT 0,
      PRIMARY KEY (naam_id, date)
    )`,
  );

  await database.execute(
    `CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0
    )`,
  );

  // Sacred Library favourites, kept on the phone only. The public library
  // endpoints are unauthenticated, so there is no account to attach a
  // favourite to; storing the id locally is what the heart button toggles.
  // The title is kept alongside so a future favourites list can render without
  // refetching every entry.
  await database.execute(
    `CREATE TABLE IF NOT EXISTS favorite_content (
      content_id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      saved_at TEXT DEFAULT (datetime('now'))
    )`,
  );

  const preseedResult = await database.execute(
    "SELECT value FROM settings WHERE key = 'preseeded_naams_cleared'",
  );
  const preseedFlag = (preseedResult.rows as {value?: string}[]) ?? [];
  if (!preseedFlag.length) {
    // Delete the naams the app used to ship with, together with the bead
    // counts recorded against them, so nothing is left pointing at a naam
    // that no longer exists. The admin panel's naams come back on the next
    // backend sync.
    const placeholders = PRESEEDED_NAAM_NAMES.map(() => '?').join(', ');
    const preseeded = await database.execute(
      `SELECT id FROM naam WHERE name IN (${placeholders})`,
      PRESEEDED_NAAM_NAMES,
    );
    for (const row of preseeded.rows as {id: number}[]) {
      await database.execute('DELETE FROM count_daily WHERE naam_id = ?', [row.id]);
      await database.execute('DELETE FROM naam WHERE id = ?', [row.id]);
    }
    await database.execute(
      "INSERT INTO settings (key, value) VALUES ('preseeded_naams_cleared', '1')",
    );
  }

  const backfillResult = await database.execute(
    "SELECT value FROM settings WHERE key = 'count_daily_backfill'",
  );
  const backfillFlag = (backfillResult.rows as {value?: string}[]) ?? [];
  if (!backfillFlag.length) {
    // Beads counted before the daily log existed. They have no real date, so
    // they are parked on today and flagged, rather than being presented as
    // beads counted today. Unflagged, a naam with a long history would meet its
    // daily goal the moment the app opened and hold a streak for a day nobody
    // practised.
    await database.execute(
      `INSERT INTO count_daily (naam_id, date, count, from_backfill)
       SELECT id, ?, (count + total_beads), 1 FROM naam
       WHERE (count + total_beads) > 0`,
      [formatDateKey(new Date())],
    );
    await database.execute(
      "INSERT INTO settings (key, value) VALUES ('count_daily_backfill', '1')",
    );
  }

  const columnsResult = await database.execute('PRAGMA table_info(naam)');
  const columnNames = columnsResult.rows.map((row: any) => row.name);
  if (!columnNames.includes('is_default')) {
    await database.execute('ALTER TABLE naam ADD COLUMN is_default INTEGER DEFAULT 0');
  }
  if (!columnNames.includes('count')) {
    await database.execute('ALTER TABLE naam ADD COLUMN count INTEGER DEFAULT 0');
  }
  if (!columnNames.includes('total_beads')) {
    await database.execute('ALTER TABLE naam ADD COLUMN total_beads INTEGER DEFAULT 0');
  }
  if (!columnNames.includes('mantra')) {
    await database.execute('ALTER TABLE naam ADD COLUMN mantra TEXT DEFAULT \'\'');
  }
  if (!columnNames.includes('remote_id')) {
    await database.execute('ALTER TABLE naam ADD COLUMN remote_id INTEGER');
    // Rows written by an earlier build used the backend id as the local id.
    // Adopt them as remote naams so their counts stay attached to them.
    await database.execute(
      'UPDATE naam SET remote_id = id WHERE remote_id IS NULL AND is_default = 1',
    );
  }
  if (!columnNames.includes('content_id')) {
    // Set when a reading is started from the Sacred Library, so the counter can
    // find the naam it created before instead of adding the same reading twice.
    await database.execute('ALTER TABLE naam ADD COLUMN content_id INTEGER');
  }
  const countDailyColumns = await database.execute('PRAGMA table_info(count_daily)');
  const countDailyColumnNames = countDailyColumns.rows.map((row: any) => row.name);
  if (!countDailyColumnNames.includes('from_backfill')) {
    // Marks beads carried over from before the daily log existed. They have no
    // real date, so they must not count towards a day's goal.
    await database.execute(
      'ALTER TABLE count_daily ADD COLUMN from_backfill INTEGER DEFAULT 0',
    );
    // Rows written by the earlier build were all backfilled, so every one of
    // them has to be marked now or they would read as real counting.
    await database.execute('UPDATE count_daily SET from_backfill = 1');
  }
  await database.execute(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_naam_remote_id ON naam(remote_id)',
  );

  const result = await database.execute('SELECT COUNT(*) as count FROM naam');
  const count = result.rows[0]?.count ?? 0;

  if (count === 0) {
    // No hardcoded default naams - they will be synced from admin panel
  }
};

export const getAllNaams = async (): Promise<Naam[]> => {
  const database = await getDatabase();
  // Naams from the admin panel first (in backend order), then the ones the
  // user added on this device.
  const result = await database.execute(
    'SELECT * FROM naam ORDER BY (remote_id IS NULL), COALESCE(remote_id, id) ASC',
  );
  return (result.rows as Naam[]) || [];
};

/**
 * Write naams coming from the backend into the local table, matched on
 * remote_id so an update never creates a duplicate and never touches the local
 * selection, counters or daily log of that naam.
 *
 * Backend naams are always stored with is_default = 1, which is how the app
 * marks a naam as owned by the admin panel.
 */
export const upsertRemoteNaams = async (remoteNaams: RemoteNaamInput[]): Promise<Naam[]> => {
  const database = await getDatabase();

  for (const remote of remoteNaams) {
    const existing = await database.execute('SELECT id FROM naam WHERE remote_id = ?', [
      remote.remoteId,
    ]);

    const values = [
      remote.name,
      remote.mantra,
      remote.beadCount,
      remote.dailyGoal,
      remote.weeklyGoal,
      remote.monthlyGoal,
      remote.yearlyGoal,
    ];

    if (existing.rows.length > 0) {
      await database.execute(
        `UPDATE naam
            SET name = ?, mantra = ?, bead_count = ?, daily_goal = ?, weekly_goal = ?,
                monthly_goal = ?, yearly_goal = ?, is_default = 1
          WHERE remote_id = ?`,
        [...values, remote.remoteId],
      );
    } else {
      await database.execute(
        `INSERT INTO naam
           (name, mantra, bead_count, daily_goal, weekly_goal, monthly_goal, yearly_goal,
            is_default, is_selected, count, total_beads, remote_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0, ?, datetime('now'))`,
        [...values, remote.remoteId],
      );
    }
  }

  return getAllNaams();
};

export const addNaam = async (
  name: string,
  mantra: string,
  beadCount: number,
  dailyGoal: number,
  weeklyGoal: number,
  monthlyGoal: number,
  yearlyGoal: number,
): Promise<number> => {
  const database = await getDatabase();
  const result = await database.execute(
    `INSERT INTO naam (name, mantra, bead_count, daily_goal, weekly_goal, monthly_goal, yearly_goal)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, mantra, beadCount, dailyGoal, weeklyGoal, monthlyGoal, yearlyGoal],
  );
  return result.insertId;
};

export const selectNaam = async (id: number): Promise<void> => {
  const database = await getDatabase();
  await database.execute('UPDATE naam SET is_selected = 0');
  await database.execute('UPDATE naam SET is_selected = 1 WHERE id = ?', [id]);
};

/**
 * Points the counter at a reading, creating the naam for it the first time.
 *
 * The counter shows whatever naam is selected, so starting a reading from the
 * library means the reading has to become a naam. It is matched on content_id,
 * which means opening the same reading again reuses the naam and its count
 * rather than starting a second one, while a new reading gets its own mala and
 * its own streak.
 *
 * The name, script and bead count are refreshed on every call so an edit to the
 * reading in the admin panel carries over. Counts, streaks and the daily log are
 * left alone.
 */
export const selectNaamForContent = async (input: {
  contentId: number;
  name: string;
  mantra: string;
  beadCount: number;
}): Promise<number> => {
  const database = await getDatabase();

  const existing = await database.execute(
    'SELECT id FROM naam WHERE content_id = ? LIMIT 1',
    [input.contentId],
  );

  let id: number;
  if (existing.rows.length > 0) {
    id = existing.rows[0].id as number;
    await database.execute(
      'UPDATE naam SET name = ?, mantra = ?, bead_count = ? WHERE id = ?',
      [input.name, input.mantra, input.beadCount, id],
    );
  } else {
    // is_default stays 0: this naam belongs to this device, so the admin naams
    // that arrive on the next sync neither touch nor replace it.
    const inserted = await database.execute(
      `INSERT INTO naam
         (name, mantra, bead_count, content_id, is_default, is_selected, count,
          total_beads, created_at)
       VALUES (?, ?, ?, ?, 0, 0, 0, 0, datetime('now'))`,
      [input.name, input.mantra, input.beadCount, input.contentId],
    );
    id = inserted.insertId as number;
  }

  await selectNaam(id);
  return id;
};

export const saveNaamCount = (id: number, count: number, totalBeads: number): Promise<void> => {
  const today = formatDateKey(new Date());
  writeQueue = writeQueue.then(async () => {
    const database = await getDatabase();
    await database.execute(
      'UPDATE naam SET count = ?, total_beads = ? WHERE id = ?',
      [count, totalBeads, id],
    );
    await database.execute(
      `INSERT INTO count_daily (naam_id, date, count) VALUES (?, ?, 1)
       ON CONFLICT(naam_id, date) DO UPDATE SET count = count + 1`,
      [id, today],
    );
  });
  return writeQueue;
};

export const deleteNaam = async (id: number): Promise<void> => {
  const database = await getDatabase();
  await database.execute('DELETE FROM naam WHERE id = ?', [id]);
};

export const updateNaam = async (
  id: number,
  name: string,
  mantra: string,
  beadCount: number,
  dailyGoal: number,
  weeklyGoal: number,
  monthlyGoal: number,
  yearlyGoal: number,
): Promise<void> => {
  const database = await getDatabase();

  await database.execute(
    `UPDATE naam SET name = ?, mantra = ?, bead_count = ?, daily_goal = ?, weekly_goal = ?, monthly_goal = ?, yearly_goal = ?
     WHERE id = ?`,
    [name, mantra, beadCount, dailyGoal, weeklyGoal, monthlyGoal, yearlyGoal, id],
  );
};

export const getSelectedNaam = async (): Promise<Naam | null> => {
  const database = await getDatabase();
  const result = await database.execute('SELECT * FROM naam WHERE is_selected = 1 LIMIT 1');
  const rows = result.rows as Naam[];
  if (rows && rows.length > 0) {
    return rows[0];
  }
  return null;
};

export const getSetting = async (key: string): Promise<string | null> => {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT value FROM settings WHERE key = ?',
    [key],
  );
  const rows = result.rows as {value: string}[];
  if (rows && rows.length > 0) {
    return rows[0].value;
  }
  return null;
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  const database = await getDatabase();
  await database.execute(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
};

export const getDailyCounts = async (
  startDate: string,
  endDate: string,
  naamId?: number | null,
  options?: {excludeBackfill?: boolean},
): Promise<{date: string; count: number}[]> => {
  const database = await getDatabase();
  let query = 'SELECT date, SUM(count) as count FROM count_daily WHERE date BETWEEN ? AND ?';
  const params: any[] = [startDate, endDate];
  if (naamId != null) {
    query += ' AND naam_id = ?';
    params.push(naamId);
  }
  if (options?.excludeBackfill) {
    // Beads carried over from before the daily log existed, parked on a date
    // that is not the day they were counted.
    query += ' AND COALESCE(from_backfill, 0) = 0';
  }
  query += ' GROUP BY date ORDER BY date';
  const result = await database.execute(query, params);
  return (result.rows as {date: string; count: number}[]) ?? [];
};

export const recordSession = (durationSeconds: number): Promise<void> => {
  const rounded = Math.max(0, Math.round(durationSeconds));
  writeQueue = writeQueue.then(async () => {
    const database = await getDatabase();
    await database.execute(
      'INSERT INTO sessions (date, duration_seconds) VALUES (?, ?)',
      [formatDateKey(new Date()), rounded],
    );
  });
  return writeQueue;
};

export const resetDailyCount = (date: string): Promise<void> => {
  writeQueue = writeQueue.then(async () => {
    const database = await getDatabase();
    const result = await database.execute(
      'SELECT naam_id, SUM(count) as c FROM count_daily WHERE date = ? GROUP BY naam_id',
      [date],
    );
    const rows = (result.rows as {naam_id: number; c: number}[]) ?? [];
    for (const row of rows) {
      await database.execute(
        'UPDATE naam SET total_beads = MAX(0, total_beads - ?) WHERE id = ?',
        [row.c, row.naam_id],
      );
    }
    await database.execute('DELETE FROM count_daily WHERE date = ?', [date]);
    if (date === formatDateKey(new Date()) && rows.length > 0) {
      const ids = rows.map(row => row.naam_id).join(',');
      await database.execute(`UPDATE naam SET count = 0 WHERE id IN (${ids})`);
    }
  });
  return writeQueue;
};

export const addNaamLog = (
  naamId: number,
  date: string,
  count: number,
): Promise<void> => {
  writeQueue = writeQueue.then(async () => {
    const database = await getDatabase();
    await database.execute(
      `INSERT INTO count_daily (naam_id, date, count) VALUES (?, ?, ?)
       ON CONFLICT(naam_id, date) DO UPDATE SET count = count + excluded.count`,
      [naamId, date, count],
    );
    await database.execute(
      'UPDATE naam SET total_beads = total_beads + ? WHERE id = ?',
      [count, naamId],
    );
    if (date === formatDateKey(new Date())) {
      await database.execute('UPDATE naam SET count = count + ? WHERE id = ?', [
        count,
        naamId,
      ]);
    }
  });
  return writeQueue;
};

/**
 * The selected naam's streak: the number of consecutive days on which it
 * completed a full mala.
 *
 * A day counts once that naam has counted its whole mala, so the target is
 * bead_count beads and not a single tap. The naam's own daily_goal is
 * deliberately not used here: a goal of two or more malas made the streak far
 * harder to keep than the one round of japa the day is actually built around, and
 * most naams have no goal set at all, which would otherwise make the day count
 * for nothing.
 *
 * Each day stands on its own, so a mala started before midnight and finished
 * after it counts for neither day.
 *
 * Today not counting yet does not break the streak. Without that, the number
 * would read zero for the whole day before the user had a chance to practise.
 */
export const getStreak = async (
  naam: Pick<Naam, 'id' | 'bead_count'> | null,
): Promise<number> => {
  if (!naam) {
    return 0;
  }

  // Mirrors the counter's own fallback for a naam with no bead count set.
  const goalBeads = naam.bead_count > 0 ? naam.bead_count : 108;

  // Scoped to this naam: the bead count that decides whether a day counts is its
  // own, so another naam's beads must not carry its streak. The backfilled rows
  // are left out because they were not counted on the day they are filed under.
  const daily = await getDailyCounts(
    '1900-01-01',
    formatDateKey(new Date()),
    naam.id,
    {excludeBackfill: true},
  );
  const byDay = new Map<string, number>(
    daily.map(day => [day.date, Number(day.count)]),
  );
  const metGoal = (key: string) => (byDay.get(key) ?? 0) >= goalBeads;

  const cursor = new Date();
  if (!metGoal(formatDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (metGoal(formatDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export interface NaamJapReminder {
  id: number;
  time: string;
  enabled: number;
}

export const getNaamJapReminders = async (): Promise<NaamJapReminder[]> => {
  const database = await getDatabase();
  await database.execute(
    `CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time TEXT NOT NULL,
      enabled INTEGER DEFAULT 1
    )`,
  );
  const result = await database.execute('SELECT * FROM reminders ORDER BY id ASC');
  return (result.rows as NaamJapReminder[]) || [];
};

export const addNaamJapReminder = async (time: string): Promise<number> => {
  const database = await getDatabase();
  const result = await database.execute(
    'INSERT INTO reminders (time, enabled) VALUES (?, 1)',
    [time],
  );
  return result.insertId;
};

export const updateNaamJapReminderEnabled = async (
  id: number,
  enabled: boolean,
): Promise<void> => {
  const database = await getDatabase();
  await database.execute('UPDATE reminders SET enabled = ? WHERE id = ?', [
    enabled ? 1 : 0,
    id,
  ]);
};

export const deleteNaamJapReminder = async (id: number): Promise<void> => {
  const database = await getDatabase();
  await database.execute('DELETE FROM reminders WHERE id = ?', [id]);
};

export const getSessionsInRange = async (
  startDate: string,
  endDate: string,
): Promise<{date: string; total_seconds: number}[]> => {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT date, SUM(duration_seconds) as total_seconds FROM sessions WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date',
    [startDate, endDate],
  );
  return (result.rows as {date: string; total_seconds: number}[]) ?? [];
};

// ---------------------------------------------------------------------------
// Sacred Library favourites
// ---------------------------------------------------------------------------

/**
 * Every favourited content id, newest save first.
 *
 * The screens read the whole set at once and keep it in component state, so
 * filling a list of hearts is one query rather than one per row.
 */
export const getFavoriteContentIds = async (): Promise<number[]> => {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT content_id FROM favorite_content ORDER BY saved_at DESC, content_id DESC',
  );
  return ((result.rows as {content_id: number}[]) ?? []).map(row => row.content_id);
};

/** One reading saved on this phone, newest save first. */
export interface FavoriteContent {
  contentId: number;
  title: string;
  savedAt: string;
}

/**
 * Every saved reading, newest first. The Saved screen reads this so its rows can
 * render straight from local storage; opening one goes to the detail screen,
 * which fetches the entry by id from the backend.
 */
export const getFavoriteContents = async (): Promise<FavoriteContent[]> => {
  const database = await getDatabase();
  const result = await database.execute(
    'SELECT content_id, title, saved_at FROM favorite_content ORDER BY saved_at DESC, content_id DESC',
  );
  return ((result.rows as {
    content_id: number;
    title: string;
    saved_at: string;
  }[]) ?? []).map(row => ({
    contentId: row.content_id,
    title: row.title,
    savedAt: row.saved_at,
  }));
};

/**
 * Adds or removes one favourite and reports the state it ended up in, so the
 * caller can update the heart without a second read.
 *
 * Existence is checked before anything changes: a saved entry is deleted and
 * reported as removed, a missing one is inserted and reported as saved. A failed
 * insert therefore surfaces as "not saved" rather than silently reporting
 * success.
 */
export const toggleFavoriteContent = async (
  contentId: number,
  title: string,
): Promise<boolean> => {
  const database = await getDatabase();

  const existing = await database.execute(
    'SELECT content_id FROM favorite_content WHERE content_id = ?',
    [contentId],
  );
  const wasFavorite = ((existing.rows as {content_id: number}[]) ?? []).length > 0;

  if (wasFavorite) {
    await database.execute('DELETE FROM favorite_content WHERE content_id = ?', [
      contentId,
    ]);
    return false;
  }

  await database.execute(
    'INSERT INTO favorite_content (content_id, title) VALUES (?, ?)',
    [contentId, title],
  );
  return true;
};
