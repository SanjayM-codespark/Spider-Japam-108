const express = require("express");
const categoriesController = require("../controllers/categories.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { handleImageUpload } = require("../config/uploads");

const router = express.Router();

// The image routes are declared before /categories/:id so the more specific
// path is not swallowed by the id pattern.
router.post(
    "/categories/:id/image",
    requireAuth,
    handleImageUpload,
    categoriesController.uploadCategoryImage
);
router.delete(
    "/categories/:id/image",
    requireAuth,
    categoriesController.removeCategoryImage
);

router.post("/categories", requireAuth, categoriesController.createCategory);
router.get("/categories", requireAuth, categoriesController.listCategories);
router.get("/categories/:id", requireAuth, categoriesController.getCategory);
router.put("/categories/:id", requireAuth, categoriesController.updateCategory);
router.delete("/categories/:id", requireAuth, categoriesController.deleteCategory);

module.exports = router;
