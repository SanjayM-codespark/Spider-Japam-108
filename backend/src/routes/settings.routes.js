const express = require("express");
const settingsController = require("../controllers/settings.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/settings", settingsController.getSettings);
router.put("/settings", requireAuth, settingsController.updateSettings);

module.exports = router;