const express = require("express");
const adminUserMantrasController = require("../controllers/adminUserMantras.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

// All routes require admin authentication
router.use(requireAuth);

// GET /admin/user-mantras - List all user-created mantras
router.get("/user-mantras", adminUserMantrasController.listUserMantras);

module.exports = router;