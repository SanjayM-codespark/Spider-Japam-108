const express = require("express");
const usersController = require("../controllers/users.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/users", requireAuth, usersController.listUsers);
router.get("/users/:id", requireAuth, usersController.getUser);
router.put("/users/:id", requireAuth, usersController.updateUser);
router.delete("/users/:id", requireAuth, usersController.deleteUser);

module.exports = router;
