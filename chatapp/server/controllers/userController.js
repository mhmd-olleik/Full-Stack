const User = require("../models/User");

// @route GET /api/users?search=query  (search by name, email, OR chatId)
const searchUsers = async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
          { chatId: req.query.search.trim() },
        ],
      }
    : {};

  const users = await User.find(keyword)
    .find({ _id: { $ne: req.user._id } })
    .select("-__v -googleId")
    .limit(20);

  res.json(users);
};

// @route GET /api/users/find/:chatId  — find user by exact Chat ID
const findByChatId = async (req, res) => {
  const user = await User.findOne({ chatId: req.params.chatId })
    .select("-__v -googleId -email");

  if (!user) return res.status(404).json({ message: "No user found with this Chat ID" });
  if (user._id.toString() === req.user._id.toString())
    return res.status(400).json({ message: "That's your own Chat ID!" });

  res.json(user);
};

// @route PUT /api/users/profile  — update name, about, avatar, onboarding
const updateProfile = async (req, res) => {
  const { name, about, avatar, onboardingDone } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (name) user.name = name;
  if (about !== undefined) user.about = about;
  if (avatar) user.avatar = avatar;
  if (onboardingDone !== undefined) user.onboardingDone = onboardingDone;

  const updated = await user.save();
  res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    avatar: updated.avatar,
    about: updated.about,
    chatId: updated.chatId,
    isAdmin: updated.isAdmin,
    onboardingDone: updated.onboardingDone,
  });
};

// @route GET /api/users/me
const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = { searchUsers, findByChatId, updateProfile, getMe };
