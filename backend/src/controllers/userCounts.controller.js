const { query } = require("../config/db");

// Admin mantras live in sacred_library and are shared by every user; user
// mantras live in user_naams and belong to one account. `source` records which
// id space naam_id refers to.
const SOURCES = ["admin", "user"];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isPositiveInt = (value) => /^\d+$/.test(String(value));

/** Normalise an incoming date to YYYY-MM-DD, falling back to today. */
function parseDate(value) {
    if (!value) {
        return null;
    }
    const text = String(value).slice(0, 10);
    if (!DATE_PATTERN.test(text)) {
        return null;
    }
    return text;
}

function todayKey() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

/** The day before a YYYY-MM-DD key, read as a plain calendar date. */
function previousDayKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${mm}-${dd}`;
}

/**
 * The number of beads that makes one day count towards a mantra's streak, or
 * null when the mantra does not exist (or is not the caller's). Mirrors the
 * phone's fallback of 108 for a mantra with no bead count set.
 */
async function mantraGoalBeads(userId, source, naamId) {
    if (source === "user") {
        const owned = await query(
            "SELECT bead_count FROM user_naams WHERE id = $1 AND user_id = $2",
            [naamId, userId]
        );
        if (owned.rowCount === 0) {
            return null;
        }
        const beadCount = Number(owned.rows[0].bead_count);
        return beadCount > 0 ? beadCount : 108;
    }

    const adminNaam = await query("SELECT bead_count FROM sacred_library WHERE id = $1", [naamId]);
    if (adminNaam.rowCount === 0) {
        return null;
    }
    const beadCount = Number(adminNaam.rows[0].bead_count);
    return beadCount > 0 ? beadCount : 108;
}

/**
 * A user mantra must belong to the caller before counting is written against
 * it, so one account cannot record beads on another account's mantra. Admin
 * mantras are only checked for existence, since they are shared.
 */
async function naamBelongsToUser(userId, source, naamId) {
    if (source === "user") {
        const owned = await query(
            "SELECT id FROM user_naams WHERE id = $1 AND user_id = $2",
            [naamId, userId]
        );
        return owned.rowCount > 0;
    }

    const adminNaam = await query("SELECT id FROM sacred_library WHERE id = $1", [naamId]);
    return adminNaam.rowCount > 0;
}

/**
 * POST /api/auth/counts
 * Records beads for one mantra on one date.
 *
 * Body: { source, naam_id, date?, count?, mode? }
 *   mode "add" (default) adds `count` (default 1) to the day's total, which is
 *   what a single bead tap sends. mode "set" overwrites the day's total, used
 *   by the reset/log screens so the server matches the phone exactly.
 */
async function recordCount(req, res) {
    const { source, naam_id, date, count, mode } = req.body || {};

    const resolvedSource = SOURCES.includes(source) ? source : "admin";

    if (!isPositiveInt(naam_id)) {
        return res.status(400).json({
            success: false,
            message: "A valid mantra id is required.",
        });
    }

    const resolvedDate = date === undefined ? todayKey() : parseDate(date);
    if (!resolvedDate) {
        return res.status(400).json({
            success: false,
            message: "Date must be in YYYY-MM-DD format.",
        });
    }

    const resolvedMode = mode === "set" ? "set" : "add";
    let amount = count === undefined || count === null || count === "" ? 1 : Number(count);
    if (!Number.isInteger(amount) || amount < 0) {
        return res.status(400).json({
            success: false,
            message: "Count must be a non-negative integer.",
        });
    }
    if (resolvedMode === "add" && amount === 0) {
        amount = 1;
    }

    try {
        const allowed = await naamBelongsToUser(req.user.id, resolvedSource, Number(naam_id));
        if (!allowed) {
            return res.status(404).json({
                success: false,
                message: "Mantra not found.",
            });
        }

        const result = await query(
            `INSERT INTO user_naam_counts (user_id, source, naam_id, date, bead_count)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, source, naam_id, date)
             DO UPDATE SET bead_count = CASE
                     WHEN $6 THEN EXCLUDED.bead_count
                     ELSE user_naam_counts.bead_count + EXCLUDED.bead_count
                 END,
                 updated_at = NOW()
             RETURNING source, naam_id, to_char(date, 'YYYY-MM-DD') AS date, bead_count AS count`,
            [req.user.id, resolvedSource, Number(naam_id), resolvedDate, amount, resolvedMode === "set"]
        );

        return res.json({
            success: true,
            count: result.rows[0],
        });
    } catch (err) {
        console.error("Record user count error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to record count.",
        });
    }
}

/**
 * GET /api/auth/counts?start=YYYY-MM-DD&end=YYYY-MM-DD&source=&naam_id=
 * Daily bead counts for the caller, one row per mantra per day.
 */
async function listCounts(req, res) {
    const { source, naam_id } = req.query;
    const start = parseDate(req.query.start);
    const end = parseDate(req.query.end);

    if (!start || !end) {
        return res.status(400).json({
            success: false,
            message: "A start and end date (YYYY-MM-DD) are required.",
        });
    }

    try {
        const params = [req.user.id, start, end];
        const conditions = ["user_id = $1", "date BETWEEN $2 AND $3"];

        if (SOURCES.includes(source)) {
            params.push(source);
            conditions.push(`source = $${params.length}`);
        }
        if (isPositiveInt(naam_id)) {
            params.push(Number(naam_id));
            conditions.push(`naam_id = $${params.length}`);
        }

        const result = await query(
            `SELECT source, naam_id, to_char(date, 'YYYY-MM-DD') AS date, bead_count AS count
             FROM user_naam_counts
             WHERE ${conditions.join(" AND ")}
             ORDER BY date ASC`,
            params
        );

        return res.json({
            success: true,
            counts: result.rows,
        });
    } catch (err) {
        console.error("List user counts error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch counts.",
        });
    }
}

/**
 * GET /api/auth/counts/totals
 * Lifetime bead total per mantra for the caller, one row per mantra. The
 * counter screen uses this to rebuild its count, malas and all-naams figures on
 * a new device, where the local database has no history of its own.
 */
async function listCountTotals(req, res) {
    try {
        const result = await query(
            `SELECT source, naam_id, SUM(bead_count)::int AS total
             FROM user_naam_counts
             WHERE user_id = $1
             GROUP BY source, naam_id`,
            [req.user.id]
        );

        return res.json({
            success: true,
            totals: result.rows,
        });
    } catch (err) {
        console.error("List user count totals error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch count totals.",
        });
    }
}

/**
 * POST /api/auth/counts/reset
 * Clears the caller's bead counts for one date, mirroring the phone's
 * "reset count by date" action.
 */
async function resetCounts(req, res) {
    const date = parseDate(req.body?.date);
    if (!date) {
        return res.status(400).json({
            success: false,
            message: "Date must be in YYYY-MM-DD format.",
        });
    }

    try {
        await query(
            `UPDATE user_naam_counts
             SET bead_count = 0, updated_at = NOW()
             WHERE user_id = $1 AND date = $2`,
            [req.user.id, date]
        );

        return res.json({
            success: true,
            message: "Counts reset for the selected date.",
        });
    } catch (err) {
        console.error("Reset user counts error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to reset counts.",
        });
    }
}

/**
 * POST /api/auth/sessions
 * Records one meditation session for the caller.
 * Body: { date?, duration_seconds, source?, naam_id? }
 *
 * source/naam_id are optional: the timer is counted against the mantra that
 * was selected, so the report can break the time down per mantra. A session
 * with neither is an all-mantras session (and how the older rows look).
 */
async function recordSession(req, res) {
    const duration = Number(req.body?.duration_seconds);
    if (!Number.isFinite(duration) || duration < 0) {
        return res.status(400).json({
            success: false,
            message: "A non-negative duration is required.",
        });
    }

    const resolvedDate = req.body?.date === undefined ? todayKey() : parseDate(req.body.date);
    if (!resolvedDate) {
        return res.status(400).json({
            success: false,
            message: "Date must be in YYYY-MM-DD format.",
        });
    }

    const source = SOURCES.includes(req.body?.source) ? req.body.source : null;
    const naamId = isPositiveInt(req.body?.naam_id) ? Number(req.body.naam_id) : null;
    const hasNaam = source !== null && naamId !== null;

    try {
        if (hasNaam) {
            const allowed = await naamBelongsToUser(req.user.id, source, naamId);
            if (!allowed) {
                return res.status(404).json({
                    success: false,
                    message: "Mantra not found.",
                });
            }
        }

        await query(
            `INSERT INTO user_sessions (user_id, date, duration_seconds, source, naam_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                req.user.id,
                resolvedDate,
                Math.round(duration),
                hasNaam ? source : null,
                hasNaam ? naamId : null,
            ]
        );

        return res.json({ success: true });
    } catch (err) {
        console.error("Record user session error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to record session.",
        });
    }
}

/**
 * GET /api/auth/sessions?start=YYYY-MM-DD&end=YYYY-MM-DD&source=&naam_id=
 * Meditation time per day for the caller, summed. Passing source and naam_id
 * narrows the sum to one mantra; omitting both sums every session.
 */
async function listSessions(req, res) {
    const start = parseDate(req.query.start);
    const end = parseDate(req.query.end);

    if (!start || !end) {
        return res.status(400).json({
            success: false,
            message: "A start and end date (YYYY-MM-DD) are required.",
        });
    }

    const { source, naam_id } = req.query;
    const hasNaamFilter = SOURCES.includes(source) && isPositiveInt(naam_id);

    try {
        const params = [req.user.id, start, end];
        const conditions = ["user_id = $1", "date BETWEEN $2 AND $3"];

        if (hasNaamFilter) {
            params.push(source, Number(naam_id));
            conditions.push(`source = $${params.length - 1}`);
            conditions.push(`naam_id = $${params.length}`);
        }

        const result = await query(
            `SELECT to_char(date, 'YYYY-MM-DD') AS date, SUM(duration_seconds)::int AS total_seconds
             FROM user_sessions
             WHERE ${conditions.join(" AND ")}
             GROUP BY date
             ORDER BY date ASC`,
            params
        );

        return res.json({
            success: true,
            sessions: result.rows,
        });
    } catch (err) {
        console.error("List user sessions error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch sessions.",
        });
    }
}

/**
 * GET /api/auth/streak?source=&naam_id=
 * The caller's current streak for one mantra: the number of consecutive days on
 * which that mantra completed a whole mala (bead_count beads).
 *
 * Derived from the daily counts already stored, so it needs no separate storage
 * and stays correct after a reinstall. Today not counting yet does not break the
 * streak, matching the phone's own `getStreak`.
 */
async function getStreak(req, res) {
    const { source, naam_id } = req.query;

    if (!SOURCES.includes(source) || !isPositiveInt(naam_id)) {
        return res.status(400).json({
            success: false,
            message: "A valid mantra is required.",
        });
    }

    const naamId = Number(naam_id);

    try {
        const goalBeads = await mantraGoalBeads(req.user.id, source, naamId);
        if (goalBeads === null) {
            return res.status(404).json({
                success: false,
                message: "Mantra not found.",
            });
        }

        const result = await query(
            `SELECT to_char(date, 'YYYY-MM-DD') AS date, bead_count
             FROM user_naam_counts
             WHERE user_id = $1 AND source = $2 AND naam_id = $3`,
            [req.user.id, source, naamId]
        );

        const byDay = new Map(result.rows.map((row) => [row.date, Number(row.bead_count)]));
        const metGoal = (key) => (byDay.get(key) ?? 0) >= goalBeads;

        // Today not met yet means the streak is measured up to yesterday, so it
        // does not read zero for the whole day before the user has practised.
        // The client sends its own local date because the counts are stamped with
        // the device's date, which can be a day ahead of the server's.
        let cursor = parseDate(req.query.today) || todayKey();
        if (!metGoal(cursor)) {
            cursor = previousDayKey(cursor);
        }

        let streak = 0;
        // A decade is far beyond any real streak and bounds the walk in case a
        // date ever fails to step back.
        const limit = 3660;
        while (streak < limit && metGoal(cursor)) {
            streak += 1;
            cursor = previousDayKey(cursor);
        }

        return res.json({
            success: true,
            streak,
        });
    } catch (err) {
        console.error("Get user streak error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch streak.",
        });
    }
}

module.exports = {
    recordCount,
    listCounts,
    listCountTotals,
    resetCounts,
    recordSession,
    listSessions,
    getStreak,
};
