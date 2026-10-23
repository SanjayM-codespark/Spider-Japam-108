const { query } = require("../config/db");

const USER_COLUMNS = "id, name, email, phone, premium, premium_start, premium_end, created_at, deleted_at";

async function listUsers(req, res) {
    const plan = req.query.plan || "all";
    const search = (req.query.search || "").trim();

    const conditions = [];
    const params = [];

    if (plan === "deleted") {
        conditions.push("deleted_at IS NOT NULL");
    } else {
        // Default: only active users
        conditions.push("deleted_at IS NULL");
    }

    if (search) {
        params.push(`%${search}%`);
        conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `
        SELECT ${USER_COLUMNS},
               (SELECT COUNT(*) FROM user_naams un WHERE un.user_id = u.id) AS mantra_count
        FROM users u
        ${where}
        ORDER BY u.id
    `;

    try {
        const result = await query(sql, params);
        return res.json({
            success: true,
            search,
            count: result.rows.length,
            users: result.rows,
        });
    } catch (err) {
        console.error("List users error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch users.",
        });
    }
}

async function getUser(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.json({
            success: true,
            user: result.rows[0],
        });
    } catch (err) {
        console.error("Get user error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user.",
        });
    }
}

async function updateUser(req, res) {
    const { id } = req.params;
    const { name, email, phone } = req.body || {};

    if (!name || !name.trim()) {
        return res.status(400).json({
            success: false,
            message: "Name is required.",
        });
    }

    if (!email || !email.trim()) {
        return res.status(400).json({
            success: false,
            message: "Email is required.",
        });
    }

    try {
        const existing = await query("SELECT premium FROM users WHERE id = $1", [id]);

        if (existing.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const fields = ["name = $1", "email = $2"];
        const params = [name.trim(), email.trim()];

        if (phone !== undefined) {
            params.push(phone.trim() || null);
            fields.push(`phone = $${params.length}`);
        }

        params.push(id);
        const result = await query(
            `UPDATE users SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING ${USER_COLUMNS}`,
            params
        );

        return res.json({
            success: true,
            message: "User updated.",
            user: result.rows[0],
        });
    } catch (err) {
        console.error("Update user error:", err);
        if (err.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists.",
            });
        }
        return res.status(500).json({
            success: false,
            message: "Failed to update user.",
        });
    }
}

async function deleteUser(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            `UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING ${USER_COLUMNS}`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found or already deleted.",
            });
        }

        return res.json({
            success: true,
            message: "User deleted.",
            user: result.rows[0],
        });
    } catch (err) {
        console.error("Delete user error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to delete user.",
        });
    }
}

// List soft-deleted users for admin review
async function listDeletedUsers(req, res) {
    const search = (req.query.search || "").trim();

    const conditions = ["deleted_at IS NOT NULL"];
    const params = [];

    if (search) {
        params.push(`%${search}%`);
        conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const sql = `SELECT ${USER_COLUMNS} FROM users ${where} ORDER BY deleted_at DESC`;

    try {
        const result = await query(sql, params);
        return res.json({
            success: true,
            count: result.rows.length,
            users: result.rows,
        });
    } catch (err) {
        console.error("List deleted users error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch deleted users.",
        });
    }
}

// Get total user count for dashboard
async function getUserCount(req, res) {
    try {
        const result = await query(
            `SELECT
                COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total,
                COUNT(*) FILTER (WHERE deleted_at IS NULL AND premium = true) AS premium,
                COUNT(*) FILTER (WHERE deleted_at IS NULL AND premium = false) AS non_premium,
                COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS deleted
             FROM users`
        );
        return res.json({
            success: true,
            counts: result.rows[0],
        });
    } catch (err) {
        console.error("Get user count error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user counts.",
        });
    }
}

// Restore a soft-deleted user (undo delete)
async function restoreUser(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            `UPDATE users SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING ${USER_COLUMNS}`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found or not deleted.",
            });
        }

        return res.json({
            success: true,
            message: "User restored successfully.",
            user: result.rows[0],
        });
    } catch (err) {
        console.error("Restore user error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to restore user.",
        });
    }
}

module.exports = { listUsers, getUser, updateUser, deleteUser, listDeletedUsers, getUserCount, restoreUser };
