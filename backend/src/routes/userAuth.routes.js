const express = require("express");
const userAuthController = require("../controllers/userAuth.controller");
const userMantrasRouter = require("./userMantras.routes");
const userCountsRouter = require("./userCounts.routes");
const { requireUserAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

// Public endpoints for the mobile app's account screens. Mounted at /api so the
// paths are /api/auth/register, /api/auth/login and /api/auth/me.
router.post("/auth/register", userAuthController.register);
router.post("/auth/login", userAuthController.login);
router.post("/auth/forgot-password", userAuthController.forgotPassword);
router.post("/auth/reset-password", userAuthController.resetPassword);
router.get("/auth/me", requireUserAuth, userAuthController.me);
router.delete("/auth/account", requireUserAuth, userAuthController.deleteAccount);
router.put("/auth/profile", requireUserAuth, userAuthController.updateProfile);
router.put("/auth/change-password", requireUserAuth, userAuthController.changePassword);

// User custom mantras (require auth)
router.use("/auth", userMantrasRouter);

// User bead counts and meditation sessions (require auth)
router.use("/auth", userCountsRouter);

module.exports = router;
