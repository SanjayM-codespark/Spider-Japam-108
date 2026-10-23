const { query } = require("../config/db");

const BEAD_COUNTS = [108, 1008, 10008];
const DEFAULT_BEAD_COUNT = 108;

const parseBeadCount = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || !BEAD_COUNTS.includes(parsed)) return null;
    return parsed;
};

const parseGoal = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const MANTRA_SELECT = `
    SELECT id, user_id, name, mantra, bead_count,
           daily_goal, weekly_goal, monthly_goal, yearly_goal,
           is_default, created_at, updated_at
    FROM user_naams
`;

// GET /api/auth/mantras - List all mantras for the authenticated user
async function listMantras(req, res) {
    try {
        const result = await query(
            `${MANTRA_SELECT} WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC`,
            [req.user.id]
        );

        return res.json({
            success: true,
            mantras: result.rows,
        });
    } catch (err) {
        console.error("List user mantras error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch your mantras.",
        });
    }
}

// POST /api/auth/mantras - Create a new custom mantra for the user
async function createMantra(req, res) {
    const {
        name,
        mantra,
        bead_count,
        daily_goal,
        weekly_goal,
        monthly_goal,
        yearly_goal,
        is_default,
    } = req.body || {};

    if (!name || !name.trim()) {
        return res.status(400).json({
            success: false,
            message: "Title is required.",
        });
    }

    if (!mantra || !mantra.trim()) {
        return res.status(400).json({
            success: false,
            message: "Mantra text is required.",
        });
    }

    const submittedBeadCount = parseBeadCount(bead_count);
    if (submittedBeadCount === null && bead_count !== undefined && bead_count !== null && bead_count !== "") {
        return res.status(400).json({
            success: false,
            message: `Bead count must be one of ${BEAD_COUNTS.join(", ")}.`,
        });
    }

    try {
        // If this mantra is being set as default, unset any existing default for this user
        if (is_default === true) {
            await query("UPDATE user_naams SET is_default = false WHERE user_id = $1 AND is_default = true", [req.user.id]);
        }

        const result = await query(
            `INSERT INTO user_naams
                 (user_id, name, mantra, bead_count, daily_goal, weekly_goal, monthly_goal, yearly_goal, is_default)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               RETURNING id, user_id, name, mantra, bead_count, daily_goal, weekly_goal, monthly_goal, yearly_goal, is_default, created_at, updated_at`,
            [
                req.user.id,
                name.trim(),
                mantra.trim(),
                submittedBeadCount === null ? DEFAULT_BEAD_COUNT : submittedBeadCount,
                parseGoal(daily_goal),
                parseGoal(weekly_goal),
                parseGoal(monthly_goal),
                parseGoal(yearly_goal),
                is_default === true,
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Mantra created successfully.",
            mantra: result.rows[0],
        });
    } catch (err) {
        console.error("Create user mantra error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to create mantra.",
        });
    }
}

// GET /api/auth/mantras/:id - Get a specific mantra
async function getMantra(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            `${MANTRA_SELECT} WHERE id = $1 AND user_id = $2`,
            [id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Mantra not found.",
            });
        }

        return res.json({
            success: true,
            mantra: result.rows[0],
        });
    } catch (err) {
        console.error("Get user mantra error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch mantra.",
        });
    }
}

// PUT /api/auth/mantras/:id - Update a user's custom mantra
async function updateMantra(req, res) {
    const { id } = req.params;
    const {
        name,
        mantra,
        bead_count,
        daily_goal,
        weekly_goal,
        monthly_goal,
        yearly_goal,
        is_default,
    } = req.body || {};

    if (name !== undefined && !name.trim()) {
        return res.status(400).json({
            success: false,
            message: "Title is required.",
        });
    }

    if (mantra !== undefined && !mantra.trim()) {
        return res.status(400).json({
            success: false,
            message: "Mantra text is required.",
        });
    }

    let nextBeadCount;
    if (bead_count !== undefined) {
        nextBeadCount = parseBeadCount(bead_count);
        if (nextBeadCount === null) {
            return res.status(400).json({
                success: false,
                message: `Bead count must be one of ${BEAD_COUNTS.join(", ")}.`,
            });
        }
    }

    try {
        const existing = await query(
            "SELECT id FROM user_naams WHERE id = $1 AND user_id = $2",
            [id, req.user.id]
        );

        if (existing.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Mantra not found.",
            });
        }

        // If this mantra is being set as default, unset any existing default for this user
        if (is_default === true) {
            await query("UPDATE user_naams SET is_default = false WHERE user_id = $1 AND is_default = true AND id != $2", [req.user.id, id]);
        }

        await query(
            `UPDATE user_naams
             SET name = COALESCE($1, name),
                 mantra = COALESCE($2, mantra),
                 bead_count = COALESCE($3, bead_count),
                 daily_goal = COALESCE($4, daily_goal),
                 weekly_goal = COALESCE($5, weekly_goal),
                 monthly_goal = COALESCE($6, monthly_goal),
                 yearly_goal = COALESCE($7, yearly_goal),
                 is_default = COALESCE($8, is_default),
                 updated_at = NOW()
             WHERE id = $9 AND user_id = $10`,
            [
                name === undefined ? null : name.trim(),
                mantra === undefined ? null : mantra.trim(),
                nextBeadCount === undefined ? null : nextBeadCount,
                daily_goal === undefined ? null : parseGoal(daily_goal),
                weekly_goal === undefined ? null : parseGoal(weekly_goal),
                monthly_goal === undefined ? null : parseGoal(monthly_goal),
                yearly_goal === undefined ? null : parseGoal(yearly_goal),
                is_default === undefined ? null : is_default,
                id,
                req.user.id,
            ]
        );

        return res.json({
            success: true,
            message: "Mantra updated successfully.",
        });
    } catch (err) {
        console.error("Update user mantra error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to update mantra.",
        });
    }
}

// DELETE /api/auth/mantras/:id - Delete a user's custom mantra
async function deleteMantra(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            "DELETE FROM user_naams WHERE id = $1 AND user_id = $2 RETURNING id",
            [id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Mantra not found.",
            });
        }

        return res.json({
            success: true,
            message: "Mantra deleted successfully.",
        });
    } catch (err) {
        console.error("Delete user mantra error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to delete mantra.",
        });
    }
}

// PUT /api/auth/mantras/:id/default - Set a mantra as the user's default
async function setDefaultMantra(req, res) {
    const { id } = req.params;

    try {
        const existing = await query(
            "SELECT id FROM user_naams WHERE id = $1 AND user_id = $2",
            [id, req.user.id]
        );

        if (existing.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Mantra not found.",
            });
        }

        // Unset any existing default, then set this one
        await query("UPDATE user_naams SET is_default = false WHERE user_id = $1", [req.user.id]);
        await query("UPDATE user_naams SET is_default = true WHERE id = $1 AND user_id = $2", [id, req.user.id]);

        return res.json({
            success: true,
            message: "Default mantra updated.",
        });
    } catch (err) {
        console.error("Set default mantra error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to set default mantra.",
        });
    }
}

module.exports = {
    listMantras,
    createMantra,
    getMantra,
    updateMantra,
    deleteMantra,
    setDefaultMantra,
};