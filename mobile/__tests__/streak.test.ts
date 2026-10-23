/**
 * The streak used to count any day with a single bead on it, which meant the
 * daily goal was never really a goal. It now counts a day only once that naam
 * has reached its own daily goal, in beads, for that naam alone.
 *
 * The dates are built relative to today rather than hard-coded, so these do not
 * rot on a day boundary and the "today is still in progress" rule stays
 * testable.
 */
type Row = {
  naam_id: number;
  date: string;
  count: number;
  from_backfill?: number;
};

export {};

/** YYYY-MM-DD for a day offset from today, matching formatDateKey. */
const dayKey = (offsetDays: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

let rows: Row[] = [];

const loadDb = () =>
  require('../src/database/database') as typeof import('../src/database/database');

/** Rows for the selected naam. The fourth value marks a backfilled row. */
const days = (
  ...entries: Array<[offset: number, beads: number, naamId?: number, backfill?: number]>
) => {
  rows = entries.map(([offset, beads, naamId = 1, backfill = 0]) => ({
    naam_id: naamId,
    date: dayKey(offset),
    count: beads,
    from_backfill: backfill,
  }));
};

const GAYATRI = {id: 1, bead_count: 108, daily_goal: 1};
const THOUSAND_BEADS = {id: 2, bead_count: 1008, daily_goal: 1};

describe('getStreak', () => {
  beforeEach(() => {
    jest.resetModules();
    rows = [];
    jest.doMock('@op-engineering/op-sqlite', () => ({
      open: async () => ({
        execute: async (statement: string, params: any[] = []) => {
          if (statement.includes('FROM count_daily')) {
            // Mirrors getDailyCounts: BETWEEN over the dates, optionally scoped
            // to one naam, optionally dropping the backfilled rows, grouped by
            // date.
            const [start, end] = params;
            const scoped = statement.includes('AND naam_id = ?');
            const naamId = scoped ? params[2] : null;
            const excludeBackfill = statement.includes('from_backfill');
            const totals = new Map<string, number>();
            rows
              .filter(r => r.date >= start && r.date <= end)
              .filter(r => naamId == null || r.naam_id === naamId)
              .filter(r => !excludeBackfill || !r.from_backfill)
              .forEach(r => {
                totals.set(r.date, (totals.get(r.date) ?? 0) + r.count);
              });
            return {
              rows: [...totals.entries()].map(([date, count]) => ({date, count})),
            };
          }
          if (statement.includes('PRAGMA table_info(naam)')) {
            return {rows: [{name: 'content_id'}]};
          }
          if (statement.includes('PRAGMA table_info(count_daily)')) {
            return {rows: [{name: 'from_backfill'}]};
          }
          return {rows: []};
        },
      }),
    }));
  });

  afterEach(() => {
    jest.dontMock('@op-engineering/op-sqlite');
  });

  it('counts a day only once the whole mala is done', async () => {
    const {getStreak} = loadDb();
    // Three days of counting, but only the last two reached 108 beads.
    days([0, 108], [-1, 108], [-2, 107]);

    expect(await getStreak(GAYATRI)).toBe(2);
  });

  it('does not let a single bead stand in for the goal', async () => {
    const {getStreak} = loadDb();
    // The old rule: any day with a bead counted. Ten days of that used to read
    // as a ten day streak.
    days([0, 1], [-1, 1], [-2, 1], [-3, 1], [-4, 1], [-5, 1], [-6, 1], [-7, 1], [-8, 1], [-9, 1]);

    expect(await getStreak(GAYATRI)).toBe(0);
  });

  it('keeps the streak alive until the day is over', async () => {
    const {getStreak} = loadDb();
    // Yesterday and the day before were completed; today has barely started.
    days([0, 3], [-1, 108], [-2, 108]);

    // Otherwise the number would read zero for the whole day before the user
    // had a chance to practise.
    expect(await getStreak(GAYATRI)).toBe(2);
  });

  it('breaks the streak on a day that fell short', async () => {
    const {getStreak} = loadDb();
    days([0, 108], [-1, 108], [-2, 40], [-3, 108], [-4, 108], [-5, 108]);

    expect(await getStreak(GAYATRI)).toBe(2);
  });

  it('is zero before any counting at all', async () => {
    const {getStreak} = loadDb();
    days();

    expect(await getStreak(GAYATRI)).toBe(0);
  });

  it('scales the target with a longer mala', async () => {
    const {getStreak} = loadDb();
    // 108 beads is a full mala here, not the 1008 the goal asks for.
    days([0, 108], [-1, 108], [-2, 500]);

    expect(await getStreak(THOUSAND_BEADS)).toBe(0);
  });

  it('ignores a larger daily goal and always counts one full mala', async () => {
    const {getStreak} = loadDb();
    // A goal of two malas would not be met by a single mala, but the streak is
    // built around one round of japa a day, so it counts. Built as a variable
    // because the field is deliberately not part of what getStreak reads.
    const withGoal = {id: 1, bead_count: 108, daily_goal: 2};
    days([0, 108], [-1, 108], [-2, 216]);

    // All three days cleared a full mala, so all three count even though the
    // goal asked for twice as much.
    expect(await getStreak(withGoal)).toBe(3);
  });

  it('ignores a daily goal of zero', async () => {
    const {getStreak} = loadDb();
    // Most naams have no goal set. Treating that as a goal of zero would be met
    // by every day, including the empty ones, and the streak could never break.
    const withGoal = {id: 1, bead_count: 108, daily_goal: 0};
    days([0, 108], [-1, 108], [-2, 0]);

    expect(await getStreak(withGoal)).toBe(2);
  });

  it('falls back to 108 beads when no bead count is set', async () => {
    const {getStreak} = loadDb();
    days([0, 108], [-1, 108], [-2, 107]);

    expect(await getStreak({id: 1, bead_count: 0})).toBe(2);
  });

  it('counts only the selected naam, not the beads of every naam', async () => {
    const {getStreak} = loadDb();
    const second = {id: 2, bead_count: 108, daily_goal: 1};
    // Today the two naams together reach 120 beads, which clears the 108 goal.
    // Neither does on its own, so summing every naam would have counted today
    // for both of them and given each a three day streak.
    days([0, 60, 1], [0, 60, 2], [-1, 108, 1], [-1, 0, 2], [-2, 108, 1], [-2, 0, 2]);

    expect(await getStreak(GAYATRI)).toBe(2);
    // Naam 2 counted nothing on either of those days, so it has no streak at
    // all however much its neighbour counted.
    expect(await getStreak(second)).toBe(0);
  });

  it('ignores beads carried over from before the daily log existed', async () => {
    const {getStreak} = loadDb();
    // The one-time backfill files a naam's whole bead history under today's
    // date. Unfiltered, that is thousands of beads and the streak reads 1 before
    // the user has counted anything at all today.
    days([0, 4200, 1, 1], [-1, 108]);

    expect(await getStreak(GAYATRI)).toBe(1);
  });

  it('does not let the backfill and a real day combine into a false goal', async () => {
    const {getStreak} = loadDb();
    // Today's real beads plus the backfilled history would clear the goal if
    // they were added together.
    days([0, 4000, 1, 1], [0, 4, 1, 0]);

    expect(await getStreak(GAYATRI)).toBe(0);
  });

  it('has no streak when no naam is selected', async () => {
    const {getStreak} = loadDb();
    days([0, 108], [-1, 108]);

    expect(await getStreak(null)).toBe(0);
  });
});
