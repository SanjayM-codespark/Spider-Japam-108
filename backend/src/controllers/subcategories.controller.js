const { query } = require("../config/db");
const { toStoredPath, removeStoredFile } = require("../config/uploads");

/**
 * Subcategories group Sacred Library content within a single category, giving
 * the app a second level to browse: Category -> Subcategory -> Content.
 *
 * They mirror categories: `status` is 'active' or 'inactive' (an inactive
 * subcategory is kept so content already filed under it stays valid), `icon` is
 * free text (in practice a single emoji), and `image_url` is a relative path
 * written only by the upload endpoint.
 *
 * A subcategory always belongs to a category. The name only has to be unique
 * within its category, so two categories can each have their own "Stotras".
 */

const STATUSES = ["active", "inactive"];

// Joins the owning category so the admin table can show which category a
// subcategory belongs to without a second request.
const SUBCATEGORY_SELECT = `
    SELECT s.id,
           s.category_id,
           c.name AS category_name,
           s.name,
           s.description,
           s.icon,
           s.image_url,
           s.status,
           s.created_at,
           s.updated_at
    FROM subcategories s
    JOIN categories c ON c.id = s.category_id
`;

const normaliseStatus = (value, fallback) =>
    STATUSES.includes(value) ? value : fallback;

const clean = (value) => (typeof value === "string" ? value.trim() : "");

/** Coerces a submitted category id to a positive integer, or null. */
const parseCategoryId = (value) => {
    if (value === null || value === undefined || value === "") return null;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;

    return parsed;
};

/** Rejects a category id that does not exist, with a clear message. */
const assertCategoryExists = async (categoryId) => {
    const result = await query("SELECT id FROM categories WHERE id = $1", [categoryId]);

    if (result.rowCount === 0) {
        return "That category does not exist.";
    }

    return null;
};

/**
 * Points a row at a newly uploaded file and removes whatever it replaced.
 *
 * The old file is only unlinked once the row has been updated, so a failed
 * write leaves the previous image still in place.
 */
const replaceImage = async (id, storedPath) => {
    const existing = await query(
        "SELECT image_url FROM subcategories WHERE id = $1",
        [id]
    );

    if (existing.rowCount === 0) return null;

    const previous = existing.rows[0].image_url;

    await query(
        "UPDATE subcategories SET image_url = $1, updated_at = NOW() WHERE id = $2",
        [storedPath, id]
    );

    if (previous && previous !== storedPath) {
        await removeStoredFile(previous);
    }

    return previous;
};

async function createSubcategory(req, res) {
    const { category_id, name, description, icon, status } = req.body || {};

    if (!name || !name.trim()) {
        return res.status(400).json({
            success: false,
            message: "Name is required.",
        });
    }

    const categoryId = parseCategoryId(category_id);
    if (categoryId === null) {
        return res.status(400).json({
            success: false,
            message: "Category is required.",
        });
    }

    try {
        const categoryError = await assertCategoryExists(categoryId);
        if (categoryError) {
            return res.status(400).json({ success: false, message: categoryError });
        }

        const result = await query(
            `INSERT INTO subcategories (category_id, name, description, icon, status)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [
                categoryId,
                name.trim(),
                clean(description),
                clean(icon),
                normaliseStatus(status, "active"),
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Subcategory added.",
            id: result.rows[0].id,
        });
    } catch (err) {
        // 23505 = unique_violation on subcategories (category_id, name)
        if (err.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "A subcategory with this name already exists in that category.",
            });
        }
        console.error("Create subcategory error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to add subcategory.",
        });
    }
}

async function listSubcategories(req, res) {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const categoryId = parseCategoryId(req.query.category_id);

    const params = [];
    const conditions = [];

    // Optional, so an unfiltered call lists every subcategory. Present but not a
    // number is ignored rather than treated as "all".
    if (categoryId !== null) {
        params.push(categoryId);
        conditions.push(`s.category_id = $${params.length}`);
    }

    if (search) {
        params.push(`%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`);
        const p = `$${params.length}`;
        conditions.push(
            `(s.name ILIKE ${p} ESCAPE '\\' OR s.description ILIKE ${p} ESCAPE '\\')`,
        );
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    try {
        const result = await query(
            `${SUBCATEGORY_SELECT}${where} ORDER BY s.category_id ASC, s.id ASC`,
            params,
        );

        return res.json({
            success: true,
            count: result.rows.length,
            subcategories: result.rows,
        });
    } catch (err) {
        console.error("List subcategories error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch subcategories.",
        });
    }
}

async function getSubcategory(req, res) {
    const { id } = req.params;

    try {
        const result = await query(`${SUBCATEGORY_SELECT} WHERE s.id = $1`, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Subcategory not found.",
            });
        }

        return res.json({
            success: true,
            subcategory: result.rows[0],
        });
    } catch (err) {
        console.error("Get subcategory error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch subcategory.",
        });
    }
}

async function updateSubcategory(req, res) {
    const { id } = req.params;
    const { category_id, name, description, icon, status } = req.body || {};

    if (name !== undefined && !name.trim()) {
        return res.status(400).json({
            success: false,
            message: "Name is required.",
        });
    }

    if (status !== undefined && !STATUSES.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Status must be active or inactive.",
        });
    }

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

    try {
        const existing = await query(
            "SELECT id, category_id, name, description, icon, status FROM subcategories WHERE id = $1",
            [id]
        );

        if (existing.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Subcategory not found.",
            });
        }

        if (nextCategoryId !== undefined) {
            const categoryError = await assertCategoryExists(nextCategoryId);
            if (categoryError) {
                return res.status(400).json({ success: false, message: categoryError });
            }
        }

        // Only the fields present in the body are written, so flipping the
        // status cannot clear the name, icon, or description.
        const current = existing.rows[0];

        await query(
            `UPDATE subcategories
             SET category_id = $1, name = $2, description = $3, icon = $4, status = $5, updated_at = NOW()
             WHERE id = $6`,
            [
                nextCategoryId === undefined ? current.category_id : nextCategoryId,
                name === undefined ? current.name : name.trim(),
                description === undefined ? current.description : clean(description),
                icon === undefined ? current.icon : clean(icon),
                normaliseStatus(status, current.status),
                id,
            ]
        );

        return res.json({
            success: true,
            message: "Subcategory updated.",
        });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "A subcategory with this name already exists in that category.",
            });
        }
        console.error("Update subcategory error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to update subcategory.",
        });
    }
}

async function deleteSubcategory(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            "DELETE FROM subcategories WHERE id = $1 RETURNING id, image_url",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Subcategory not found.",
            });
        }

        // The row is gone, so the file it pointed at is now unreferenced.
        await removeStoredFile(result.rows[0].image_url);

        return res.json({
            success: true,
            message: "Subcategory deleted.",
        });
    } catch (err) {
        // sacred_library.subcategory_id is ON DELETE RESTRICT, so a subcategory
        // still in use cannot be removed. Postgres reports that as 23001
        // (restrict_violation); 23503 (foreign_key_violation) is the other code
        // a constraint like this can raise, and is handled here too so the guard
        // does not depend on which one fired.
        if (err.code === "23001" || err.code === "23503") {
            return res.status(409).json({
                success: false,
                message:
                    "This subcategory is still used by content. Set it to Inactive instead of deleting it.",
            });
        }
        console.error("Delete subcategory error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to delete subcategory.",
        });
    }
}

/**
 * Attaches an uploaded image to a subcategory, replacing any current one.
 *
 * The file has already been validated and written by handleImageUpload, so there
 * is no format or size check here.
 */
async function uploadSubcategoryImage(req, res) {
    const { id } = req.params;

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "No image was uploaded.",
        });
    }

    const storedPath = toStoredPath(req.file.filename);

    try {
        const previous = await replaceImage(id, storedPath);

        // A file was written to disk for a row that does not exist, so the
        // upload is undone rather than left behind as an orphan.
        if (previous === null) {
            await removeStoredFile(storedPath);
            return res.status(404).json({
                success: false,
                message: "Subcategory not found.",
            });
        }

        return res.json({
            success: true,
            message: "Image uploaded.",
            image_url: storedPath,
        });
    } catch (err) {
        await removeStoredFile(storedPath);
        console.error("Upload subcategory image error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to save the image.",
        });
    }
}

/**
 * Drops a subcategory's image without touching the rest of the row, so the emoji
 * takes over again. Safe to call on a subcategory that never had an image.
 */
async function removeSubcategoryImage(req, res) {
    const { id } = req.params;

    try {
        const previous = await replaceImage(id, "");

        if (previous === null) {
            return res.status(404).json({
                success: false,
                message: "Subcategory not found.",
            });
        }

        return res.json({
            success: true,
            message: "Image removed.",
        });
    } catch (err) {
        console.error("Remove subcategory image error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to remove the image.",
        });
    }
}

module.exports = {
    createSubcategory,
    listSubcategories,
    getSubcategory,
    updateSubcategory,
    deleteSubcategory,
    uploadSubcategoryImage,
    removeSubcategoryImage,
};
