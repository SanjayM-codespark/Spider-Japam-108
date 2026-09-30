const express = require("express");
const helpsController = require("../controllers/helps.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/helps", requireAuth, helpsController.createHelp);
router.get("/helps", requireAuth, helpsController.listHelps);
router.get("/helps/:id", requireAuth, helpsController.getHelp);
router.put("/helps/:id", requireAuth, helpsController.updateHelp);
router.delete("/helps/:id", requireAuth, helpsController.deleteHelp);

module.exports = router;