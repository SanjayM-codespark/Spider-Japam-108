const express = require("express");
const subscriptionsController = require("../controllers/subscriptions.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/subscriptions", requireAuth, subscriptionsController.createSubscription);
router.get("/subscriptions", requireAuth, subscriptionsController.listSubscriptions);
router.get("/subscriptions/:id", requireAuth, subscriptionsController.getSubscription);
router.put("/subscriptions/:id", requireAuth, subscriptionsController.updateSubscription);
router.delete("/subscriptions/:id", requireAuth, subscriptionsController.deleteSubscription);

module.exports = router;