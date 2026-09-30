const { query } = require("../config/db");

/**
 * Public, unauthenticated read-only endpoints for the mobile app's Sacred
 * Library.
 *
 * This router is deliberately separate from sacredLibrary.routes.js: that one
 * sits behind the admin JWT guard, and mounting it here would expose the write
 * endpoints as well. Only the reads a phone needs live in this file.
 *
 * Everything here is filtered to published content inside active categories.
 * A draft or an inactive category is admin-only bookkeeping and must never
 * reach a phone, so a draft that is later published appears on its own without
 * the app needing an update.
 */

const CONTENT_SELECT = `
    SELECT sl.id,
           sl.title,
           sl.category_id,
           c.name AS category_name,
           c.icon AS category_icon,
           c.image_url AS category_image_url,
           sl.deity,
           sl.short_description,
           sl.content,
           sl.meaning,
           sl.source,
           sl.bead_count
    FROM sacred_library sl
    JOIN categories c ON c.id = sl.category_id
    WHERE sl.status = 'published'
      AND c.status = 'active'
`;

/**
 * Escapes the LIKE wildcards in a user supplied search term, so a query of
 * "100%" matches a literal percent sign instead of everything.
 */
const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

const isPositiveInt = (value) => /^\d+$/.test(String(value));

/**
 * GET /api/library
 *
 * One call for the library landing screen: the category tiles plus the reading
 * of the day, so the screen does not need a second round trip to render.
 */
const getLibrary = async (req, res) => {
    try {
        const categoriesResult = await query(
            `SELECT id, name, description, icon, image_url
             FROM categories
             WHERE status = 'active'
             ORDER BY name ASC`,
        );

        // The reading of the day rotates once per day and stays put for the
        // whole day. Days since the epoch is used rather than a formatted date
        // so the choice never depends on the server's timezone.
        const dayIndex = Math.floor(Date.now() / 86400000);
        const totalResult = await query(
            `SELECT count(*)::int AS total
             FROM sacred_library sl
             JOIN categories c ON c.id = sl.category_id
             WHERE sl.status = 'published' AND c.status = 'active'`,
        );
        const total = totalResult.rows[0].total;

        let daily = null;
        if (total > 0) {
            const dailyResult = await query(
                `${CONTENT_SELECT} ORDER BY sl.id ASC LIMIT 1 OFFSET $1`,
                [dayIndex % total],
            );
            daily = dailyResult.rows[0] || null;
        }

        return res.json({
            success: true,
            categories: categoriesResult.rows,
            daily,
        });
    } catch (err) {
        console.error("getLibrary error:", err.message);
        return res.status(500).json({ success: false, message: "Could not load the sacred library." });
    }
};

/**
 * GET /api/library/contents?category_id=1&q=mantra
 *
 * Backs both the category list and the search box on the landing screen. The
 * category and the search term are both optional; with neither, this returns
 * every published entry, which is what the landing search wants.
 *
 * The term is matched case insensitively against the title, deity, short
 * description, mantra text, meaning and source, so anything readable on the app
 * is findable by it.
 */
const listContents = async (req, res) => {
    const { category_id: categoryId, q } = req.query;
    const search = typeof q === "string" ? q.trim() : "";

    if (categoryId !== undefined && !isPositiveInt(categoryId)) {
        return res.status(400).json({ success: false, message: "category_id must be a number." });
    }

    try {
        const params = [];
        const conditions = [];

        if (categoryId !== undefined) {
            params.push(Number(categoryId));
            conditions.push(`sl.category_id = $${params.length}`);
        }

        if (search) {
            params.push(`%${escapeLike(search)}%`);
            const p = `$${params.length}`;
            // Every field the app shows on a content card or detail screen is
            // searchable. Searching only the title meant a reader could see a
            // line on the detail screen, type a word from it, and be told
            // nothing matched.
            conditions.push(
                `(sl.title ILIKE ${p} ESCAPE '\\' OR sl.deity ILIKE ${p} ESCAPE '\\' OR sl.short_description ILIKE ${p} ESCAPE '\\' OR sl.content ILIKE ${p} ESCAPE '\\' OR sl.meaning ILIKE ${p} ESCAPE '\\' OR sl.source ILIKE ${p} ESCAPE '\\')`,
            );
        }

        const where = conditions.length ? ` AND ${conditions.join(" AND ")}` : "";
        const result = await query(
            `${CONTENT_SELECT}${where} ORDER BY sl.title ASC`,
            params,
        );

        return res.json({ success: true, contents: result.rows });
    } catch (err) {
        console.error("listContents error:", err.message);
        return res.status(500).json({ success: false, message: "Could not load the content list." });
    }
};

/**
 * GET /api/library/contents/:id
 *
 * One entry for the detail screen. A draft, an entry in an inactive category,
 * or an id that does not exist all return the same 404, so the response cannot
 * be used to probe for content that is not public.
 */
const getContent = async (req, res) => {
    const { id } = req.params;

    if (!isPositiveInt(id)) {
        return res.status(404).json({ success: false, message: "Content not found." });
    }

    try {
        const result = await query(`${CONTENT_SELECT} AND sl.id = $1`, [Number(id)]);

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: "Content not found." });
        }

        return res.json({ success: true, content: result.rows[0] });
    } catch (err) {
        console.error("getContent error:", err.message);
        return res.status(500).json({ success: false, message: "Could not load this content item." });
    }
};

module.exports = { getLibrary, listContents, getContent };
