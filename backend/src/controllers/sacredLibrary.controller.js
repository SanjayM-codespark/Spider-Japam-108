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
// null category name, rather than disappearing from the table. The subcategory
// join is left too, since a subcategory is optional.
const CONTENT_SELECT = `
    SELECT sl.id,
           sl.title,
           sl.category_id,
           c.name AS category_name,
           sl.subcategory_id,
           sc.name AS subcategory_name,
           sl.deity,
           sl.short_description,
           sl.content,
           sl.meaning,
           sl.source,
           sl.status,
           sl.bead_count,
           sl.is_default,
           sl.created_at,
           sl.updated_at
    FROM sacred_library sl
    LEFT JOIN categories c ON c.id = sl.category_id
    LEFT JOIN subcategories sc ON sc.id = sl.subcategory_id
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

/** Coerces a submitted subcategory id to a positive integer, or null. */
const parseSubcategoryId = (value) => {
    if (value === null || value === undefined || value === "") return null;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;

    return parsed;
};

/**
 * A subcategory has to belong to the content's own category, so content cannot
 * be filed under a subcategory from an unrelated category. Returns an error
 * message, or null when the pair is valid.
 */
const assertSubcategoryInCategory = async (subcategoryId, categoryId) => {
    const result = await query(
        "SELECT id FROM subcategories WHERE id = $1 AND category_id = $2",
        [subcategoryId, categoryId]
    );

    if (result.rowCount === 0) {
        return "That subcategory does not exist in the selected category.";
    }

    return null;
};

async function createContent(req, res) {
    const {
        title,
        category_id,
        subcategory_id,
        deity,
        short_description,
        content,
        meaning,
        source,
        status,
        bead_count,
        is_default,
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

    const subcategoryId = parseSubcategoryId(subcategory_id);
    if (subcategoryId === null) {
        return res.status(400).json({
            success: false,
            message: "Subcategory is required.",
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

        if (subcategoryId !== null) {
            const subcategoryError = await assertSubcategoryInCategory(subcategoryId, categoryId);
            if (subcategoryError) {
                return res.status(400).json({ success: false, message: subcategoryError });
            }
        }

        // If this content is being set as default, unset any existing default
        if (is_default === true) {
            await query("UPDATE sacred_library SET is_default = false WHERE is_default = true");
        }

        const result = await query(
            `INSERT INTO sacred_library
                 (title, category_id, subcategory_id, deity, short_description, content, meaning, source, status, bead_count, is_default)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              RETURNING id`,
            [
                title.trim(),
                categoryId,
                subcategoryId,
                clean(deity),
                clean(short_description),
                content.trim(),
                clean(meaning),
                clean(source),
                status === undefined ? "draft" : status,
                submittedBeadCount === null ? DEFAULT_BEAD_COUNT : submittedBeadCount,
                is_default === true,
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
        const result = await query(`${CONTENT_SELECT}${where} ORDER BY sl.id ASC`, params);

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
        subcategory_id,
        deity,
        short_description,
        content,
        meaning,
        source,
        status,
        bead_count,
        is_default,
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

    // undefined = leave the current subcategory; if provided, it must be a
    // positive integer (cannot be cleared). Subcategory is mandatory.
    let nextSubcategoryId;
    if (subcategory_id !== undefined) {
        nextSubcategoryId = parseSubcategoryId(subcategory_id);
        if (nextSubcategoryId === null) {
            return res.status(400).json({
                success: false,
                message: "Subcategory is required.",
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
            "SELECT id, category_id, subcategory_id FROM sacred_library WHERE id = $1",
            [id]
        );

        if (existing.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Content not found.",
            });
        }

        const current = existing.rows[0];

        if (nextCategoryId !== undefined) {
            const categoryError = await assertCategoryExists(nextCategoryId);
            if (categoryError) {
                return res.status(400).json({ success: false, message: categoryError });
            }
        }

        // The category and the subcategory have to agree: a subcategory belongs
        // to exactly one category. Work out the pair that will result, so moving
        // content to another category cannot leave it filed under a subcategory
        // from its old one.
        const effectiveCategoryId =
            nextCategoryId === undefined ? current.category_id : nextCategoryId;
        const effectiveSubcategoryId =
            nextSubcategoryId === undefined ? current.subcategory_id : nextSubcategoryId;

        if (effectiveSubcategoryId === null) {
            return res.status(400).json({ success: false, message: "Subcategory is required." });
        }

        const subcategoryError = await assertSubcategoryInCategory(
            effectiveSubcategoryId,
            effectiveCategoryId
        );
        if (subcategoryError) {
            return res.status(400).json({ success: false, message: subcategoryError });
        }

        // If this content is being set as default, unset any existing default
        if (is_default === true) {
            await query("UPDATE sacred_library SET is_default = false WHERE is_default = true AND id != $1", [id]);
        }

        // Only overwrite the fields the request actually carries, so saving a
        // meaning from the submenu page cannot blank the title or content. The
        // subcategory is written from the resolved value rather than COALESCE,
        // because null is meaningful here: it clears the subcategory.
        await query(
            `UPDATE sacred_library
             SET title = COALESCE($1, title),
                 category_id = $2,
                 subcategory_id = $3,
                 deity = COALESCE($4, deity),
                 short_description = COALESCE($5, short_description),
                 content = COALESCE($6, content),
                 meaning = COALESCE($7, meaning),
                 source = COALESCE($8, source),
                 status = COALESCE($9, status),
                 bead_count = COALESCE($10, bead_count),
                 is_default = COALESCE($11, is_default),
                 updated_at = NOW()
             WHERE id = $12`,
            [
                title === undefined ? null : title.trim(),
                effectiveCategoryId,
                effectiveSubcategoryId,
                deity === undefined ? null : clean(deity),
                short_description === undefined ? null : clean(short_description),
                content === undefined ? null : content.trim(),
                meaning === undefined ? null : clean(meaning),
                source === undefined ? null : clean(source),
                status === undefined ? null : status,
                nextBeadCount === undefined ? null : nextBeadCount,
                is_default === undefined ? null : is_default,
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
