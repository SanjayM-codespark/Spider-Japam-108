const { query } = require("../config/db");

/**
 * Sacred Library content items, for the admin panel only.
 *
 * Each row is one entry an admin creates, edits and publishes. The mobile app
 * reads the published ones through the separate, unauthenticated router in
 * routes/libraryPublic.routes.js.
 *
 * `status` is 'draft' or 'published'. A draft stays invisible to the app; only
 * `published` rows are served publicly.
 *
 * `bead_count` is how many beads make up one round of japa for this content, so
 * the mobile app can size the counter. It is a fixed choice rather than a free
 * number: the traditional malas, and nothing else, so a typo cannot create a
 * round that is impossible to count.
 *
 * `category_id` points at a category row and is required by the API, but the
 * column is nullable so this migration also applies to a database that already
 * held content from before categories existed. Deleting a category that content
 * still references is refused by the foreign key, which is deliberate: the
 * alternative, clearing the reference, would leave content in a state the form
 * cannot represent. Set the category inactive instead.
 */

const STATUSES = ["draft", "published"];

// One round of japa, in beads. Mirrored by BEAD_COUNTS in the admin panel's
// src/pages/library/constants.js, so the dropdown and this check stay in step.
const BEAD_COUNTS = [108, 1008, 10008];

const DEFAULT_BEAD_COUNT = 108;

// Left join so a row whose category was somehow removed still lists, with a
// null category name, rather than disappearing from the table.
const CONTENT_SELECT = `
    SELECT sl.id,
           sl.title,
           sl.category_id,
           c.name AS category_name,
           sl.deity,
           sl.short_description,
           sl.content,
           sl.meaning,
           sl.source,
           sl.status,
           sl.bead_count,
           sl.created_at,
           sl.updated_at
    FROM sacred_library sl
    LEFT JOIN categories c ON c.id = sl.category_id
`;

const clean = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Accepts one of the traditional bead counts, or null when the field was left
 * out so the caller can keep the current value.
 *
 * A submitted value outside the list is an error rather than something to
 * coerce, because a silent fallback would save a bead count the admin did not
 * pick.
 */
const parseBeadCount = (value) => {
    if (value === null || value === undefined || value === "") return null;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || !BEAD_COUNTS.includes(parsed)) return null;

    return parsed;
};

/**
 * Rejects a category id that does not exist, so a typo produces a clear message
 * instead of a foreign key violation further down.
 */
const assertCategoryExists = async (categoryId) => {
    const result = await query("SELECT id FROM categories WHERE id = $1", [categoryId]);

    if (result.rowCount === 0) {
        return "That category does not exist.";
    }

    return null;
};

/** Coerces a submitted category id to a positive integer, or null. */
const parseCategoryId = (value) => {
    if (value === null || value === undefined || value === "") return null;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;

    return parsed;
};

async function createContent(req, res) {
    const {
        title,
        category_id,
        deity,
        short_description,
        content,
        meaning,
        source,
        status,
        bead_count,
    } = req.body || {};

    if (!title || !title.trim()) {
        return res.status(400).json({
            success: false,
            message: "Title is required.",
        });
    }

    const categoryId = parseCategoryId(category_id);
    if (categoryId === null) {
        return res.status(400).json({
            success: false,
            message: "Category is required.",
        });
    }

    if (!content || !content.trim()) {
        return res.status(400).json({
            success: false,
            message: "Content is required.",
        });
    }

    if (status !== undefined && !STATUSES.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Status must be draft or published.",
        });
    }

    // Absent means "use the default"; present but not a traditional count is a
    // mistake worth reporting.
    const submittedBeadCount = parseBeadCount(bead_count);
    if (submittedBeadCount === null && bead_count !== undefined && bead_count !== null && bead_count !== "") {
        return res.status(400).json({
            success: false,
            message: `Bead count must be one of ${BEAD_COUNTS.join(", ")}.`,
        });
    }

    try {
        const categoryError = await assertCategoryExists(categoryId);
        if (categoryError) {
            return res.status(400).json({ success: false, message: categoryError });
        }

        const result = await query(
            `INSERT INTO sacred_library
                 (title, category_id, deity, short_description, content, meaning, source, status, bead_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [
                title.trim(),
                categoryId,
                clean(deity),
                clean(short_description),
                content.trim(),
                clean(meaning),
                clean(source),
                status === undefined ? "draft" : status,
                submittedBeadCount === null ? DEFAULT_BEAD_COUNT : submittedBeadCount,
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Content added.",
            id: result.rows[0].id,
        });
    } catch (err) {
        // 23505 = unique_violation on sacred_library.title
        if (err.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "A content item with this title already exists.",
            });
        }
        if (err.code === "23503") {
            return res.status(400).json({
                success: false,
                message: "That category does not exist.",
            });
        }
        console.error("Create content error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to add content.",
        });
    }
}

async function listContents(req, res) {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    // Escapes the LIKE wildcards so a term of "100%" matches a literal percent
    // sign rather than everything.
    const params = [];
    const conditions = [];

    if (search) {
        params.push(`%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`);
        const p = `$${params.length}`;
        // Every text field the admin panel shows, so a term typed from any column
        // of the table finds the row. The body and the meaning are included
        // because those are the fields most likely to hold the word being looked
        // for.
        conditions.push(
            `(sl.title ILIKE ${p} ESCAPE '\\' OR sl.deity ILIKE ${p} ESCAPE '\\' OR sl.short_description ILIKE ${p} ESCAPE '\\' OR sl.content ILIKE ${p} ESCAPE '\\' OR sl.meaning ILIKE ${p} ESCAPE '\\' OR sl.source ILIKE ${p} ESCAPE '\\')`,
        );
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    try {
        const result = await query(`${CONTENT_SELECT}${where} ORDER BY sl.title ASC`, params);

        return res.json({
            success: true,
            count: result.rows.length,
            contents: result.rows,
        });
    } catch (err) {
        console.error("List contents error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch contents.",
        });
    }
}

async function getContent(req, res) {
    const { id } = req.params;

    try {
        const result = await query(`${CONTENT_SELECT} WHERE sl.id = $1`, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Content not found.",
            });
        }

        return res.json({
            success: true,
            content: result.rows[0],
        });
    } catch (err) {
        console.error("Get content error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch content.",
        });
    }
}

async function updateContent(req, res) {
    const { id } = req.params;
    const {
        title,
        category_id,
        deity,
        short_description,
        content,
        meaning,
        source,
        status,
        bead_count,
    } = req.body || {};

    if (title !== undefined && !title.trim()) {
        return res.status(400).json({
            success: false,
            message: "Title is required.",
        });
    }

    if (content !== undefined && !content.trim()) {
        return res.status(400).json({
            success: false,
            message: "Content is required.",
        });
    }

    if (status !== undefined && !STATUSES.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Status must be draft or published.",
        });
    }

    // Present but unusable, as opposed to absent, which means leave it alone.
    let nextCategoryId;
    if (category_id !== undefined) {
        nextCategoryId = parseCategoryId(category_id);
        if (nextCategoryId === null) {
            return res.status(400).json({
                success: false,
                message: "Category is required.",
            });
        }
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
            "SELECT id FROM sacred_library WHERE id = $1",
            [id]
        );

        if (existing.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Content not found.",
            });
        }

        if (nextCategoryId !== undefined) {
            const categoryError = await assertCategoryExists(nextCategoryId);
            if (categoryError) {
                return res.status(400).json({ success: false, message: categoryError });
            }
        }

        // Only overwrite the fields the request actually carries, so saving a
        // meaning from the submenu page cannot blank the title or content.
        await query(
            `UPDATE sacred_library
             SET title = COALESCE($1, title),
                 category_id = COALESCE($2, category_id),
                 deity = COALESCE($3, deity),
                 short_description = COALESCE($4, short_description),
                 content = COALESCE($5, content),
                 meaning = COALESCE($6, meaning),
                 source = COALESCE($7, source),
                 status = COALESCE($8, status),
                 bead_count = COALESCE($9, bead_count),
                 updated_at = NOW()
             WHERE id = $10`,
            [
                title === undefined ? null : title.trim(),
                nextCategoryId,
                deity === undefined ? null : clean(deity),
                short_description === undefined ? null : clean(short_description),
                content === undefined ? null : content.trim(),
                meaning === undefined ? null : clean(meaning),
                source === undefined ? null : clean(source),
                status === undefined ? null : status,
                nextBeadCount === undefined ? null : nextBeadCount,
                id,
            ]
        );

        return res.json({
            success: true,
            message: "Content updated.",
        });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "A content item with this title already exists.",
            });
        }
        if (err.code === "23503") {
            return res.status(400).json({
                success: false,
                message: "That category does not exist.",
            });
        }
        console.error("Update content error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to update content.",
        });
    }
}

async function deleteContent(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            "DELETE FROM sacred_library WHERE id = $1 RETURNING id",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Content not found.",
            });
        }

        return res.json({
            success: true,
            message: "Content deleted.",
        });
    } catch (err) {
        console.error("Delete content error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to delete content.",
        });
    }
}

module.exports = {
    createContent,
    listContents,
    getContent,
    updateContent,
    deleteContent,
};
