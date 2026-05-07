const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { searchUsers, findByChatId, updateProfile, getMe } = require("../controllers/userController");

router.get("/me", protect, getMe);
router.get("/find/:chatId", protect, findByChatId);   // 🆔 Find by Chat ID
router.get("/", protect, searchUsers);
router.put("/profile", protect, updateProfile);

module.exports = router;
