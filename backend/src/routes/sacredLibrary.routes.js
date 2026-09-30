const express = require("express");
const sacredLibraryController = require("../controllers/sacredLibrary.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/library-contents", requireAuth, sacredLibraryController.createContent);
router.get("/library-contents", requireAuth, sacredLibraryController.listContents);
router.get("/library-contents/:id", requireAuth, sacredLibraryController.getContent);
router.put("/library-contents/:id", requireAuth, sacredLibraryController.updateContent);
router.delete("/library-contents/:id", requireAuth, sacredLibraryController.deleteContent);

module.exports = router;
