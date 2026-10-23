const express = require("express");
const userCountsController = require("../controllers/userCounts.controller");
const { requireUserAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

// All routes require authentication
router.use(requireUserAuth);

// POST /api/auth/counts - Record beads for a mantra on a date
router.post("/counts", userCountsController.recordCount);

// GET /api/auth/counts - Daily bead counts in a range
router.get("/counts", userCountsController.listCounts);

// GET /api/auth/counts/totals - Lifetime bead total per mantra
router.get("/counts/totals", userCountsController.listCountTotals);

// GET /api/auth/streak - Current streak (consecutive goal-met days) per mantra
router.get("/streak", userCountsController.getStreak);

// POST /api/auth/counts/reset - Clear the caller's counts for a date
router.post("/counts/reset", userCountsController.resetCounts);

// POST /api/auth/sessions - Record a meditation session
router.post("/sessions", userCountsController.recordSession);

// GET /api/auth/sessions - Meditation time per day in a range
router.get("/sessions", userCountsController.listSessions);

module.exports = router;
