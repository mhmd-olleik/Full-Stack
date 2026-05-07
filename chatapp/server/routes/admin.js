const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { adminOnly } = require("../middleware/admin");
const { getStats, getUsers, banUser, toggleAdmin, deleteUser, getChats } = require("../controllers/adminController");

// All admin routes require JWT + admin flag
router.use(protect, adminOnly);

router.get("/stats", getStats);
router.get("/users", getUsers);
router.put("/users/:id/ban", banUser);
router.put("/users/:id/makeAdmin", toggleAdmin);
router.delete("/users/:id", deleteUser);
router.get("/chats", getChats);

module.exports = router;
