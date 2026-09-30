const { query } = require("../config/db");
const { toStoredPath, removeStoredFile } = require("../config/uploads");

/**
 * Categories used to group Sacred Library content in the admin panel.
 *
 * `status` is the text 'active' or 'inactive'. An inactive category is kept
 * rather than removed, so content already filed under it keeps a valid
 * reference and the category can be switched back on.
 *
 * `icon` is free text, in practice a single emoji. `image_url` is a relative
 * path to an uploaded image, written only by the upload endpoint. Both are
 * optional, and they are meant to be used together: a category can have an
 * image, an emoji, or both, and the app shows the image when there is one and
 * falls back to the emoji.
 */

const STATUSES = ["active", "inactive"];

const CATEGORY_FIELDS =
    "id, name, description, icon, image_url, status, created_at, updated_at";

const normaliseStatus = (value, fallback) =>
    STATUSES.includes(value) ? value : fallback;

const clean = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Points a row at a newly uploaded file and removes whatever it replaced.
 *
 * The old file is only unlinked once the row has been updated, so a failed
 * write leaves the previous image still in place.
 */
const replaceImage = async (id, storedPath) => {
    const existing = await query(
        "SELECT image_url FROM categories WHERE id = $1",
        [id]
    );

    if (existing.rowCount === 0) return null;

    const previous = existing.rows[0].image_url;

    await query(
        "UPDATE categories SET image_url = $1, updated_at = NOW() WHERE id = $2",
        [storedPath, id]
    );

    if (previous && previous !== storedPath) {
        await removeStoredFile(previous);
    }

    return previous;
};


async function createCategory(req, res) {
    const { name, description, icon, status } = req.body || {};

    if (!name || !name.trim()) {
        return res.status(400).json({
            success: false,
            message: "Name is required.",
        });
    }

    try {
        const result = await query(
            `INSERT INTO categories (name, description, icon, status)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [
                name.trim(),
                clean(description),
                clean(icon),
                normaliseStatus(status, "active"),
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Category added.",
            id: result.rows[0].id,
        });
    } catch (err) {
        // 23505 = unique_violation on categories.name
        if (err.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "A category with this name already exists.",
            });
        }
        console.error("Create category error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to add category.",
        });
    }
}

async function listCategories(req, res) {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    // Escapes the LIKE wildcards so a term of "100%" matches a literal percent
    // sign rather than everything.
    const params = [];
    const conditions = [];

    if (search) {
        params.push(`%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`);
        const p = `$${params.length}`;
        // Name and description, the two fields the table shows.
        conditions.push(
            `(name ILIKE ${p} ESCAPE '\\' OR description ILIKE ${p} ESCAPE '\\')`,
        );
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    try {
        const result = await query(
            `SELECT ${CATEGORY_FIELDS} FROM categories ${where} ORDER BY name ASC`,
            params,
        );

        return res.json({
            success: true,
            count: result.rows.length,
            categories: result.rows,
        });
    } catch (err) {
        console.error("List categories error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch categories.",
        });
    }
}

async function getCategory(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            `SELECT ${CATEGORY_FIELDS} FROM categories WHERE id = $1`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found.",
            });
        }

        return res.json({
            success: true,
            category: result.rows[0],
        });
    } catch (err) {
        console.error("Get category error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch category.",
        });
    }
}

async function updateCategory(req, res) {
    const { id } = req.params;
    const { name, description, icon, status } = req.body || {};

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

    try {
        const existing = await query(
            "SELECT id, name, description, icon, status FROM categories WHERE id = $1",
            [id]
        );

        if (existing.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found.",
            });
        }

        // Only the fields present in the body are written, so flipping the
        // status cannot clear the name, icon, or description.
        const current = existing.rows[0];

        await query(
            `UPDATE categories
             SET name = $1, description = $2, icon = $3, status = $4, updated_at = NOW()
             WHERE id = $5`,
            [
                name === undefined ? current.name : name.trim(),
                description === undefined ? current.description : clean(description),
                icon === undefined ? current.icon : clean(icon),
                normaliseStatus(status, current.status),
                id,
            ]
        );

        return res.json({
            success: true,
            message: "Category updated.",
        });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "A category with this name already exists.",
            });
        }
        console.error("Update category error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to update category.",
        });
    }
}

async function deleteCategory(req, res) {
    const { id } = req.params;

    try {
        const result = await query(
            "DELETE FROM categories WHERE id = $1 RETURNING id, image_url",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found.",
            });
        }

        // The row is gone, so the file it pointed at is now unreferenced.
        await removeStoredFile(result.rows[0].image_url);

        return res.json({
            success: true,
            message: "Category deleted.",
        });
    } catch (err) {
        // sacred_library.category_id is ON DELETE RESTRICT, so a category still
        // in use cannot be removed. Postgres reports that as 23001
        // (restrict_violation); 23503 (foreign_key_violation) is the other code
        // a constraint like this can raise, and is handled here too so the
        // guard does not depend on which one fired.
        if (err.code === "23001" || err.code === "23503") {
            return res.status(409).json({
                success: false,
                message:
                    "This category is still used by content. Set it to Inactive instead of deleting it.",
            });
        }
        console.error("Delete category error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to delete category.",
        });
    }
}

/**
 * Attaches an uploaded image to a category, replacing any current one.
 *
 * The file has already been validated and written by handleImageUpload, so
 * there is no format or size check here.
 */
async function uploadCategoryImage(req, res) {
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
                message: "Category not found.",
            });
        }

        return res.json({
            success: true,
            message: "Image uploaded.",
            image_url: storedPath,
        });
    } catch (err) {
        await removeStoredFile(storedPath);
        console.error("Upload category image error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to save the image.",
        });
    }
}

/**
 * Drops a category's image without touching the rest of the row, so the emoji
 * takes over again. Safe to call on a category that never had an image.
 */
async function removeCategoryImage(req, res) {
    const { id } = req.params;

    try {
        const previous = await replaceImage(id, "");

        if (previous === null) {
            return res.status(404).json({
                success: false,
                message: "Category not found.",
            });
        }

        return res.json({
            success: true,
            message: "Image removed.",
        });
    } catch (err) {
        console.error("Remove category image error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to remove the image.",
        });
    }
}

module.exports = {
    createCategory,
    listCategories,
    getCategory,
    updateCategory,
    deleteCategory,
    uploadCategoryImage,
    removeCategoryImage,
};
