const express = require("express");
const helpsPublicController = require("../controllers/helpsPublic.controller");

const router = express.Router();

// Kept separate from helps.routes.js so the admin JWT guard on /api/admin/helps
// cannot be bypassed by mounting that router here.
router.get("/helps", helpsPublicController.listHelps);
// Before /:id, otherwise Express would read "slug" as an id and 404.
router.get("/helps/slug/:slug", helpsPublicController.getHelpBySlug);
router.get("/helps/:id", helpsPublicController.getHelp);

module.exports = router;
