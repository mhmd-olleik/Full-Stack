const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

// @route GET /api/admin/stats
const getStats = async (req, res) => {
  const [
    totalUsers,
    onlineUsers,
    totalChats,
    groupChats,
    totalMessages,
    newUsersToday,
    bannedUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isOnline: true }),
    Chat.countDocuments(),
    Chat.countDocuments({ isGroupChat: true }),
    Message.countDocuments(),
    User.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
    User.countDocuments({ isBanned: true }),
  ]);

  // Messages in last 7 days (daily chart data)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const messagesPerDay = await Message.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    totalUsers,
    onlineUsers,
    totalChats,
    groupChats,
    totalMessages,
    newUsersToday,
    bannedUsers,
    messagesPerDay,
  });
};

// @route GET /api/admin/users?page=1&limit=20&search=
const getUsers = async (req, res) => {
  const { page = 1, limit = 20, search = "" } = req.query;
  const query = search
    ? { $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }] }
    : {};

  const [users, total] = await Promise.all([
    User.find(query)
      .select("-__v")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit),
    User.countDocuments(query),
  ]);

  res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
};

// @route PUT /api/admin/users/:id/ban
const banUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.isAdmin) return res.status(400).json({ message: "Cannot ban an admin" });
  user.isBanned = !user.isBanned;
  await user.save();
  res.json({ message: user.isBanned ? "User banned" : "User unbanned", isBanned: user.isBanned });
};

// @route PUT /api/admin/users/:id/makeAdmin
const toggleAdmin = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  user.isAdmin = !user.isAdmin;
  await user.save();
  res.json({ message: user.isAdmin ? "Admin granted" : "Admin revoked", isAdmin: user.isAdmin });
};

// @route DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.isAdmin) return res.status(400).json({ message: "Cannot delete an admin account" });
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "User deleted" });
};

// @route GET /api/admin/chats
const getChats = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [chats, total] = await Promise.all([
    Chat.find()
      .populate("users", "name email avatar")
      .populate("groupAdmin", "name email")
      .populate({ path: "latestMessage", populate: { path: "sender", select: "name" } })
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit),
    Chat.countDocuments(),
  ]);
  res.json({ chats, total, page: Number(page), pages: Math.ceil(total / limit) });
};

module.exports = { getStats, getUsers, banUser, toggleAdmin, deleteUser, getChats };
