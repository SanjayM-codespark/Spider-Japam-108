const express = require("express");
const userMantrasController = require("../controllers/userMantras.controller");
const { requireUserAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

// All routes require authentication
router.use(requireUserAuth);

// GET /api/auth/mantras - List all custom mantras for the authenticated user
router.get("/mantras", userMantrasController.listMantras);

// POST /api/auth/mantras - Create a new custom mantra
router.post("/mantras", userMantrasController.createMantra);

// GET /api/auth/mantras/:id - Get a specific mantra
router.get("/mantras/:id", userMantrasController.getMantra);

// PUT /api/auth/mantras/:id - Update a custom mantra
router.put("/mantras/:id", userMantrasController.updateMantra);

// DELETE /api/auth/mantras/:id - Delete a custom mantra
router.delete("/mantras/:id", userMantrasController.deleteMantra);

// PUT /api/auth/mantras/:id/default - Set a mantra as default
router.put("/mantras/:id/default", userMantrasController.setDefaultMantra);

module.exports = router;