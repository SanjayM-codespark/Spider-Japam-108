const { query } = require("../config/db");

const isPositiveInt = (value) => /^\d+$/.test(String(value));

const MANTRA_SELECT = `
    SELECT un.id,
           un.user_id,
           u.name AS user_name,
           u.email AS user_email,
           un.name,
           un.mantra,
           un.bead_count,
           un.daily_goal,
           un.weekly_goal,
           un.monthly_goal,
           un.yearly_goal,
           un.is_default,
           un.created_at,
           un.updated_at
    FROM user_naams un
    JOIN users u ON u.id = un.user_id
`;

const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/**
 * GET /admin/user-mantras
 * List all user-created mantras with pagination and search
 */
async function listUserMantras(req, res) {
    const { search, page = 1, limit = 50 } = req.query;
    const searchTerm = typeof search === "string" ? search.trim() : "";
    const pageNum = isPositiveInt(page) ? Math.max(1, Number(page)) : 1;
    const limitNum = isPositiveInt(limit) ? Math.min(100, Math.max(1, Number(limit))) : 50;
    const offset = (pageNum - 1) * limitNum;

    try {
        const params = [];
        const conditions = [];

        if (searchTerm) {
            params.push(`%${escapeLike(searchTerm)}%`);
            const p = `$${params.length}`;
            conditions.push(
                `(un.name ILIKE ${p} ESCAPE '\\' OR un.mantra ILIKE ${p} ESCAPE '\\' OR u.name ILIKE ${p} ESCAPE '\\' OR u.email ILIKE ${p} ESCAPE '\\')`
            );
        }

        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        // Get total count
        const countResult = await query(
            `SELECT count(*)::int AS total FROM user_naams un JOIN users u ON u.id = un.user_id ${where}`,
            params
        );
        const total = countResult.rows[0].total;

        // Get paginated results
        params.push(limitNum, offset);
        const result = await query(
            `${MANTRA_SELECT} ${where} ORDER BY un.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        return res.json({
            success: true,
            mantras: result.rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (err) {
        console.error("List user mantras error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user mantras.",
        });
    }
}

module.exports = {
    listUserMantras,
};