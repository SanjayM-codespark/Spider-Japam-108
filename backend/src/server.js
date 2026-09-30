const express = require("express");
const cors = require("cors");
require("dotenv").config();

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
const libraryPublicRoutes = require("./routes/libraryPublic.routes");

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Category images. Served from the same origin as the API but outside /api, so
// it sits above the route mounts. Content-Type comes from the file extension,
// and uploads can only be one of the four image formats, so nothing here is
// ever served as HTML.
app.use("/uploads", express.static(UPLOAD_DIR));

// Routes
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin", usersRoutes);
app.use("/api/admin", subscriptionsRoutes);
app.use("/api/admin", helpsRoutes);
app.use("/api", settingsRoutes);
app.use("/api/admin", settingsRoutes);
app.use("/api/admin", sacredLibraryRoutes);
app.use("/api/admin", categoriesRoutes);
// Help page reads for the mobile app, shown under Settings > About & Legal.
// Unauthenticated; the admin write routes stay behind the JWT guard.
app.use("/api", helpsPublicRoutes);
// Sacred Library reads for the mobile app. Unauthenticated, and filtered to
// published content in active categories.
app.use("/api", libraryPublicRoutes);

// Test API
app.get("/api", (req, res) => {
    res.json({
        success: true,
        message: "SpiderFullStack Backend API is running",
    });
});

// Start server
initDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Backend running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("Failed to initialize database:", err.message);
        process.exit(1);
    });