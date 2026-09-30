const { query } = require("../config/db");

/**
 * Public, unauthenticated reads for the help pages the mobile app shows under
 * Settings > About & Legal.
 *
 * Deliberately separate from helps.routes.js: that router sits behind the admin
 * JWT guard, and mounting it here would expose create, update and delete as
 * well. Only the two reads a phone needs live in this file.
 *
 * The list returns titles only. The Settings screen just needs a label for each
 * row, so shipping the body of every page with the list would be wasted bytes on
 * a phone that may not have opened any of them.
 */

const isPositiveInt = (value) => /^\d+$/.test(String(value));

/**
 * GET /api/helps
 *
 * Every help page, newest first, which is the order the admin panel lists them
 * in. An id that is not a positive number returns the same empty shape as a
 * request for a page that does not exist, so the response cannot be used to
 * probe for ids.
 */
const listHelps = async (req, res) => {
    try {
        const result = await query(
            "SELECT id, title FROM helps ORDER BY id DESC"
        );

        return res.json({ success: true, count: result.rows.length, helps: result.rows });
    } catch (err) {
        console.error("listHelps error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Could not load the help pages.",
        });
    }
};

/**
 * GET /api/helps/:id
 *
 * One page including its body, for the screen that renders it. A non numeric id
 * and an id that does not exist both return 404.
 */
const getHelp = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveInt(id)) {
        return res.status(404).json({ success: false, message: "Help not found." });
    }

    try {
        const result = await query(
            "SELECT id, title, content, created_at FROM helps WHERE id = $1",
            [Number(id)]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Help not found." });
        }

        return res.json({ success: true, help: result.rows[0] });
    } catch (err) {
        console.error("getHelp error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Could not load this page.",
        });
    }
};

/**
 * GET /api/helps/slug/:slug
 *
 * One page addressed by its slug, which is how the web routes /privacy and
 * /terms find the page an admin wrote. Declared before the /:id route because
 * "slug" would otherwise be read as an id.
 *
 * A slug that is not set, not in the allowed shape, or not in use all return
 * 404, so the caller cannot tell "no such page" from "no page has that
 * address" and falls back to its own text for both.
 */
const getHelpBySlug = async (req, res) => {
    const { slug } = req.params;

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return res.status(404).json({ success: false, message: "Help not found." });
    }

    try {
        const result = await query(
            "SELECT id, title, content, slug, created_at FROM helps WHERE slug = $1",
            [slug]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Help not found." });
        }

        return res.json({ success: true, help: result.rows[0] });
    } catch (err) {
        console.error("getHelpBySlug error:", err.message);
        return res.status(500).json({
            success: false,
            message: "Could not load this page.",
        });
    }
};

module.exports = { listHelps, getHelp, getHelpBySlug };