const express = require("express");
const subcategoriesController = require("../controllers/subcategories.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { handleImageUpload } = require("../config/uploads");

const router = express.Router();

// The image routes are declared before /subcategories/:id so the more specific
// path is not swallowed by the id pattern.
router.post(
    "/subcategories/:id/image",
    requireAuth,
    handleImageUpload,
    subcategoriesController.uploadSubcategoryImage
);
router.delete(
    "/subcategories/:id/image",
    requireAuth,
    subcategoriesController.removeSubcategoryImage
);

router.post("/subcategories", requireAuth, subcategoriesController.createSubcategory);
router.get("/subcategories", requireAuth, subcategoriesController.listSubcategories);
router.get("/subcategories/:id", requireAuth, subcategoriesController.getSubcategory);
router.put("/subcategories/:id", requireAuth, subcategoriesController.updateSubcategory);
router.delete("/subcategories/:id", requireAuth, subcategoriesController.deleteSubcategory);

module.exports = router;
