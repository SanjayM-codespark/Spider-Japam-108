const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const { signToken } = require("../utils/jwt");

async function login(req, res) {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: "Username and password are required.",
        });
    }

    try {
        const result = await query(
            "SELECT id, username, password_hash, email, full_name, role FROM admins WHERE username = $1",
            [username]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password.",
            });
        }

        const admin = result.rows[0];
        const passwordMatches = await bcrypt.compare(password, admin.password_hash);

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password.",
            });
        }

        const { password_hash, ...safeAdmin } = admin;
        const token = signToken({ id: admin.id, username: admin.username, role: admin.role });

        return res.json({
            success: true,
            message: "Login successful.",
            token,
            admin: safeAdmin,
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({
            success: false,
            message: "Login failed. Try again later.",
        });
    }
}

async function me(req, res) {
    try {
        const result = await query(
            "SELECT id, username, email, full_name, role, created_at FROM admins WHERE id = $1",
            [req.admin.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found.",
            });
        }

        return res.json({
            success: true,
            admin: result.rows[0],
        });
    } catch (err) {
        console.error("Get admin error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch admin.",
        });
    }
}

module.exports = { login, me };