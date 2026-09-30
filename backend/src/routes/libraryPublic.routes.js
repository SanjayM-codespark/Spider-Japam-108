const express = require("express");
const libraryController = require("../controllers/libraryPublic.controller");

const router = express.Router();

// Public read-only endpoints for the mobile app's Sacred Library.
// Kept in their own router, mounted at /api, so the admin JWT guard on
// /api/admin/sacred-library cannot be bypassed by reusing that router here.
router.get("/library", libraryController.getLibrary);
router.get("/library/contents", libraryController.listContents);
router.get("/library/contents/:id", libraryController.getContent);

module.exports = router;
