const Chat = require("../models/Chat");
const User = require("../models/User");

// @route POST /api/chats — Access or create 1-on-1 chat
const accessChat = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: "UserId required" });

  let chat = await Chat.findOne({
    isGroupChat: false,
    users: { $all: [req.user._id, userId] },
  })
    .populate("users", "-__v")
    .populate({ path: "latestMessage", populate: { path: "sender", select: "name avatar email" } });

  if (chat) return res.json(chat);

  const newChat = await Chat.create({ isGroupChat: false, users: [req.user._id, userId] });
  const fullChat = await Chat.findById(newChat._id).populate("users", "-__v");
  res.status(201).json(fullChat);
};

// @route GET /api/chats — Get all chats for logged-in user
const fetchChats = async (req, res) => {
  const chats = await Chat.find({ users: req.user._id })
    .populate("users", "-__v")
    .populate("groupAdmin", "-__v")
    .populate({ path: "latestMessage", populate: { path: "sender", select: "name avatar email" } })
    .sort({ updatedAt: -1 });

  res.json(chats);
};

// @route POST /api/chats/group — Create group chat
const createGroupChat = async (req, res) => {
  const { name, users } = req.body;
  if (!name || !users || users.length < 2)
    return res.status(400).json({ message: "Group needs a name and at least 2 users" });

  const allUsers = [...users, req.user._id];
  const groupChat = await Chat.create({
    chatName: name,
    isGroupChat: true,
    users: allUsers,
    groupAdmin: req.user._id,
  });

  const fullGroup = await Chat.findById(groupChat._id)
    .populate("users", "-__v")
    .populate("groupAdmin", "-__v");

  res.status(201).json(fullGroup);
};

// @route PUT /api/chats/group/add
const addToGroup = async (req, res) => {
  const { chatId, userId } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat) return res.status(404).json({ message: "Chat not found" });
  if (chat.groupAdmin.toString() !== req.user._id.toString())
    return res.status(403).json({ message: "Only admin can add members" });

  if (chat.users.includes(userId))
    return res.status(400).json({ message: "User already in group" });

  chat.users.push(userId);
  await chat.save();
  const updated = await Chat.findById(chatId).populate("users", "-__v").populate("groupAdmin", "-__v");
  res.json(updated);
};

// @route PUT /api/chats/group/remove
const removeFromGroup = async (req, res) => {
  const { chatId, userId } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat) return res.status(404).json({ message: "Chat not found" });

  const isAdmin = chat.groupAdmin.toString() === req.user._id.toString();
  const isSelf = userId === req.user._id.toString();
  if (!isAdmin && !isSelf)
    return res.status(403).json({ message: "Not authorized" });

  chat.users = chat.users.filter((u) => u.toString() !== userId);
  await chat.save();
  const updated = await Chat.findById(chatId).populate("users", "-__v").populate("groupAdmin", "-__v");
  res.json(updated);
};

// @route PUT /api/chats/group/rename
const renameGroup = async (req, res) => {
  const { chatId, chatName } = req.body;
  const chat = await Chat.findByIdAndUpdate(chatId, { chatName }, { new: true })
    .populate("users", "-__v")
    .populate("groupAdmin", "-__v");
  if (!chat) return res.status(404).json({ message: "Chat not found" });
  res.json(chat);
};

module.exports = { accessChat, fetchChats, createGroupChat, addToGroup, removeFromGroup, renameGroup };
