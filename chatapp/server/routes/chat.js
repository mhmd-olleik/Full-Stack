const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  accessChat, fetchChats, createGroupChat,
  addToGroup, removeFromGroup, renameGroup
} = require("../controllers/chatController");

router.post("/", protect, accessChat);
router.get("/", protect, fetchChats);
router.post("/group", protect, createGroupChat);
router.put("/group/add", protect, addToGroup);
router.put("/group/remove", protect, removeFromGroup);
router.put("/group/rename", protect, renameGroup);

module.exports = router;
