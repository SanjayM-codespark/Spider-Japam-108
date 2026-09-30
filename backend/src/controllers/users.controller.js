const { query } = require("../config/db");

const USER_COLUMNS = "id, name, email, premium, premium_start, premium_end, created_at";

async function listUsers(req, res) {
    const plan = req.query.plan || "all";
    const search = (req.query.search || "").trim();

    const conditions = [];
    const params = [];

    if (plan === "premium") {
        conditions.push("premium = true");
    } else if (plan === "non-premium") {
        conditions.push("premium = false");
    }

    if (search) {
        params.push(`%${search}%`);
        conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT ${USER_COLUMNS} FROM users ${where} ORDER BY id`;

    try {
        const result = await query(sql, params);
        return res.json({
            success: true,
            plan,
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
    const { name, email, premium_end } = req.body || {};

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
        const wasPremium = existing.rows[0].premium;

        if (premium_end) {
            const parsed = new Date(premium_end);
            if (Number.isNaN(parsed.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid premium end date.",
                });
            }

            params.push(parsed.toISOString());
            if (wasPremium) {
                fields.push(`premium_end = $${params.length}`);
            } else {
                fields.push("premium = true", "premium_start = NOW()", `premium_end = $${params.length}`);
            }
        } else if (premium_end === null && wasPremium) {
            fields.push("premium_end = NULL");
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
        const result = await query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.json({
            success: true,
            message: "User deleted.",
        });
    } catch (err) {
        console.error("Delete user error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to delete user.",
        });
    }
}

module.exports = { listUsers, getUser, updateUser, deleteUser };
