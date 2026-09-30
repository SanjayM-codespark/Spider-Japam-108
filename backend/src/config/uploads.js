const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

/**
 * Storage for category images.
 *
 * Files land in backend/uploads and are served as /uploads/<name> by the
 * static route in server.js. Only the relative path is stored in the database
 * so a row is not pinned to one host, and the admin panel builds the absolute
 * URL at display time.
 *
 * Note: local disk is fine for a single server, but files do not survive a
 * redeploy that replaces the container. If the backend is ever scaled to more
 * than one instance, or moved to a platform with an ephemeral filesystem, swap
 * this module for object storage; nothing else needs to change, as the rest of
 * the code only deals in the stored relative path.
 */

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

// The only formats accepted, and the extension each is written with. The
// extension comes from here rather than from the uploaded filename, so a
// request cannot choose what it is stored or served as.
const EXTENSION_BY_MIME = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
};

const ACCEPTED_MIME = Object.keys(EXTENSION_BY_MIME).join(",");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        fs.mkdir(UPLOAD_DIR, { recursive: true }, (err) => cb(err, UPLOAD_DIR));
    },
    filename: (req, file, cb) => {
        // Random name: never reuse the client's filename, which could contain
        // path separators, collide with an existing file, or imply an
        // extension the server does not serve as an image.
        const extension = EXTENSION_BY_MIME[file.mimetype];
        cb(null, `${crypto.randomUUID()}${extension}`);
    },
});

const categoryImageUpload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter: (req, file, cb) => {
        if (!EXTENSION_BY_MIME[file.mimetype]) {
            cb(new Error("Only PNG, JPEG, WEBP or GIF images are allowed."));
            return;
        }
        cb(null, true);
    },
});

/**
 * Runs the multer middleware and turns its errors into the same JSON shape the
 * rest of the API uses, instead of letting them reach the error handler as a
 * generic 500.
 */
const handleImageUpload = (req, res, next) => {
    categoryImageUpload.single("image")(req, res, (err) => {
        if (err) {
            const message =
                err.code === "LIMIT_FILE_SIZE"
                    ? "Image must be 2 MB or smaller."
                    : err.message || "Image upload failed.";
            return res.status(400).json({ success: false, message });
        }
        next();
    });
};

const toStoredPath = (filename) => `/uploads/${filename}`;

/**
 * Deletes a previously stored file, ignoring a row that never had one.
 *
 * path.basename strips any directory component, so a tampered image_url in the
 * database cannot be used to unlink a file outside the upload directory.
 */
const removeStoredFile = async (storedPath) => {
    if (!storedPath) return;

    const target = path.join(UPLOAD_DIR, path.basename(storedPath));

    try {
        await fsp.unlink(target);
    } catch (err) {
        // Already gone, or never written. Nothing to clean up either way.
        if (err.code !== "ENOENT") {
            console.error("Could not remove stored image:", err.message);
        }
    }
};

module.exports = {
    UPLOAD_DIR,
    MAX_FILE_SIZE,
    ACCEPTED_MIME,
    categoryImageUpload,
    handleImageUpload,
    toStoredPath,
    removeStoredFile,
};
