const { query } = require("../config/db");

// Slugs become part of a public URL (/privacy, /terms), so they are kept to
// what is safe there: lowercase letters, digits and single dashes.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Normalise the slug an admin typed.
 *
 * Returns an empty string for a blank value, which means "this page has no
 * address", and null when the value cannot be used, so the caller can reject
 * it rather than storing something that can never be linked to.
 */
const normaliseSlug = (value) => {
    if (value === undefined || value === null) {
        return '';
    }
    const slug = String(value).trim().toLowerCase();
    if (!slug) {
        return '';
    }
    return SLUG_PATTERN.test(slug) ? slug : null;
};

async function createHelp(req, res) {
    const { title, content, slug } = req.body || {};

    if (!title || !title.trim()) {
        return res.status(400).json({
            success: false,
            message: "Title is required.",
        });
    }

    if (!content || !content.trim()) {
        return res.status(400).json({
            success: false,
            message: "Content is required.",
        });
    }

    const cleanSlug = normaliseSlug(slug);
    if (cleanSlug === null) {
        return res.status(400).json({
            success: false,
            message: "Key can only use lowercase letters, numbers and single dashes, e.g. privacy-policy.",
        });
    }

    try {
        const result = await query(
            "INSERT INTO helps (title, content, slug) VALUES ($1, $2, $3) RETURNING id",
            [title.trim(), content, cleanSlug || null]
        );

        return res.status(201).json({
            success: true,
            message: "Help added.",
            id: result.rows[0].id,
        });
    } catch (err) {
        // 23505 is the unique index on slug, so the address is already taken.
        if (err.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Another page already uses that key.",
            });
        }
        console.error("Create help error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to add help.",
        });
    }
}

async function listHelps(req, res) {
    try {
        const result = await query(
            "SELECT id, title, slug, created_at FROM helps ORDER BY id DESC"
        );

        return res.json({
            success: true,
            count: result.rowCount,
            helps: result.rows,
        });
    } catch (err) {
        console.error("List helps error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch helps.",
        });
    }
}

async function getHelp(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            "SELECT id, title, content, slug, created_at FROM helps WHERE id = $1",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Help not found.",
            });
        }

        return res.json({
            success: true,
            help: result.rows[0],
        });
    } catch (err) {
        console.error("Get help error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch help.",
        });
    }
}

async function updateHelp(req, res) {
    const { id } = req.params;
    const { title, content, slug } = req.body || {};

    if (!title || !title.trim()) {
        return res.status(400).json({
            success: false,
            message: "Title is required.",
        });
    }

    if (!content || !content.trim()) {
        return res.status(400).json({
            success: false,
            message: "Content is required.",
        });
    }

    const cleanSlug = normaliseSlug(slug);
    if (cleanSlug === null) {
        return res.status(400).json({
            success: false,
            message: "Key can only use lowercase letters, numbers and single dashes, e.g. privacy-policy.",
        });
    }

    try {
        const result = await query(
            "UPDATE helps SET title = $1, content = $2, slug = $3 WHERE id = $4 RETURNING id",
            [title.trim(), content, cleanSlug || null, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Help not found.",
            });
        }

        return res.json({
            success: true,
            message: "Help updated.",
        });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Another page already uses that key.",
            });
        }
        console.error("Update help error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to update help.",
        });
    }
}

async function deleteHelp(req, res) {
    const { id } = req.params;

    try {
        const result = await query("DELETE FROM helps WHERE id = $1 RETURNING id", [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Help not found.",
            });
        }

        return res.json({
            success: true,
            message: "Help deleted.",
        });
    } catch (err) {
        console.error("Delete help error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to delete help.",
        });
    }
}

module.exports = {
    createHelp,
    listHelps,
    getHelp,
    updateHelp,
    deleteHelp,
};