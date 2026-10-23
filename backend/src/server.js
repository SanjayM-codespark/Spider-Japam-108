require('iconv-lite/encodings');
process.chdir(__dirname);

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

// Load .env from the backend folder (one level above src). Without an explicit
// path dotenv looks in the current folder, which is src after the chdir above,
// so none of the DB_* or JWT_* values would be loaded.
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { logInfo, logError } = require("./utils/logger");
const initDb = require("./config/initDb");
const { UPLOAD_DIR } = require("./config/uploads");
const adminAuthRoutes = require("./routes/adminAuth.routes");
const usersRoutes = require("./routes/users.routes");
const subscriptionsRoutes = require("./routes/subscriptions.routes");
const helpsRoutes = require("./routes/helps.routes");
const helpsPublicRoutes = require("./routes/helpsPublic.routes");
const settingsRoutes = require("./routes/settings.routes");
const sacredLibraryRoutes = require("./routes/sacredLibrary.routes");
const categoriesRoutes = require("./routes/categories.routes");
const subcategoriesRoutes = require("./routes/subcategories.routes");
const libraryPublicRoutes = require("./routes/libraryPublic.routes");
const userAuthRoutes = require("./routes/userAuth.routes");
const adminUserMantrasRoutes = require("./routes/adminUserMantras.routes");

const app = express();

const PORT = process.env.PORT || 5000;

const BASE_PATH = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const dbState = { ready: false, error: null };

function resolveFrontendDir() {
    const candidates = [
        process.env.FRONTEND_DIR,
        path.join(__dirname, "..", "..", "frontend", "dist"),
        path.join(__dirname, "..", "public"),
    ].filter(Boolean);

    for (const dir of candidates) {
        if (fs.existsSync(path.join(dir, "index.html"))) {
            return dir;
        }
    }
    return null;
}

app.use(cors());
app.use(express.json());

// Console log for every request, so you can see in the logs whether a request
// (for example the login POST) actually reaches Node.
app.use((req, res, next) => {
    const started = Date.now();
    console.log(`[req] ${req.method} ${req.originalUrl}`);
    res.on("finish", () => {
        console.log(`[res] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`);
    });
    next();
});


app.use("/uploads", express.static(UPLOAD_DIR));
if (BASE_PATH) {
    app.use(`${BASE_PATH}/uploads`, express.static(UPLOAD_DIR));
}


const api = express.Router();

api.use("/admin", adminAuthRoutes);
api.use("/admin", usersRoutes);
api.use("/admin", subscriptionsRoutes);
api.use("/admin", helpsRoutes);
api.use("/admin", settingsRoutes);
api.use("/admin", sacredLibraryRoutes);
api.use("/admin", categoriesRoutes);
api.use("/admin", subcategoriesRoutes);
api.use("/admin", adminUserMantrasRoutes);
// Help page reads for the mobile app, shown under Settings > About & Legal.
// Unauthenticated; the admin write routes stay behind the JWT guard.
api.use("/", helpsPublicRoutes);
// Sacred Library reads for the mobile app. Unauthenticated, and filtered to
// published content in active categories.
api.use("/", libraryPublicRoutes);
// Public settings, served as /api/settings (the frontend calls this one).
api.use("/", settingsRoutes);
// App account endpoints for the mobile app: register, login and me.
api.use("/", userAuthRoutes);

// Health / test endpoint. Also reports whether the database came up, so a
// failing deploy can be diagnosed from the browser instead of guessing.
// cwd and pid show which process and folder is answering.
api.get("/", (req, res) => {
    res.json({
        success: true,
        message: "SpiderFullStack Backend API is running",
        cwd: process.cwd(),
        pid: process.pid,
        basePath: BASE_PATH || "/",
        envLoaded: Boolean(process.env.DB_NAME),
        database: dbState.ready ? "connected" : "unavailable",
        databaseError: dbState.error ? dbState.error.message : null,
    });
});

app.use("/api", api);
if (BASE_PATH) {
    app.use(`${BASE_PATH}/api`, api);
}

// Any unmatched /api request is answered with JSON, never the SPA. Without this
// the static-site fallback below (or nginx on the server) would return HTML and
// hide the real 404/error.
function isApiRequest(req) {
    return req.path === "/api" || req.path.startsWith("/api/") ||
        (BASE_PATH && (req.path === `${BASE_PATH}/api` || req.path.startsWith(`${BASE_PATH}/api/`)));
}

app.use((req, res, next) => {
    if (isApiRequest(req)) {
        return res.status(404).json({
            success: false,
            message: `API route not found: ${req.method} ${req.originalUrl}`,
        });
    }
    next();
});

// Serve the built frontend, if it was deployed alongside the backend.
const FRONTEND_DIR = resolveFrontendDir();

if (FRONTEND_DIR) {
    logInfo(`Serving frontend from ${FRONTEND_DIR} under ${BASE_PATH || "/"}`);
    app.use(BASE_PATH || "/", express.static(FRONTEND_DIR));

    // SPA fallback: deep links such as /admin/dashboard resolve to
    // index.html, but only for non-API GETs, so API errors keep returning JSON.
    app.get(`${BASE_PATH}/*path`, (req, res, next) => {
        if (isApiRequest(req)) return next();
        res.sendFile(path.join(FRONTEND_DIR, "index.html"));
    });
} else {
    logInfo("No frontend build found; serving API only.");
    const homePath = BASE_PATH || "/";
    app.get(homePath, (req, res) => {
        res.json({
            success: true,
            message: "Backend is running. Frontend build not found on this server.",
        });
    });
}

// Central error handler. Any failure in a route ends up here and is returned as
// JSON (with the real message) and written to logs/error.log, so it is visible
// even when the live site would otherwise show the landing page.
app.use((err, req, res, next) => {
    console.log(`[error] ${req.method} ${req.originalUrl}:`, err.code || "", err.message);
    logError(err, `${req.method} ${req.originalUrl}`);
    if (res.headersSent) return next(err);
    res.status(err.status || err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal server error",
    });
});

// Start the HTTP server first, then bring the database up. Starting first means
// a database problem no longer kills the process (which used to hand the site
// back to nginx's static fallback); instead /api answers with a clear error.
app.listen(PORT, () => {
    console.log(`[server] listening on port ${PORT}, cwd=${process.cwd()}, pid=${process.pid}`);
    console.log(`[server] env loaded: DB_HOST=${process.env.DB_HOST}, DB_NAME=${process.env.DB_NAME}, DB_USER=${process.env.DB_USER}`);
    logInfo(`Backend running on port ${PORT} (base path "${BASE_PATH || "/"}")`);

    console.log("[db] connecting...");
    initDb()
        .then(() => {
            dbState.ready = true;
            console.log("[db] CONNECTED, database ready");
            logInfo("Database ready.");
        })
        .catch((err) => {
            dbState.error = err;
            console.log("[db] FAILED:", err.code || "", err.message);
            logError(err, "initDb");
        });
});

process.on("unhandledRejection", (reason) => {
    console.log("[unhandledRejection]", reason);
    logError(reason, "unhandledRejection");
});
process.on("uncaughtException", (err) => {
    console.log("[uncaughtException]", err);
    logError(err, "uncaughtException");
});