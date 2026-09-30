const express = require("express");
const adminAuthController = require("../controllers/adminAuth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/login", adminAuthController.login);
router.get("/me", requireAuth, adminAuthController.me);

module.exports = router;