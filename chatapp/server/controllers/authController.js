const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// @route POST /api/auth/google
const googleAuth = async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        googleId,
        name,
        email,
        avatar: picture,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.avatar = picture;
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      about: user.about,
      chatId: user.chatId,
      isAdmin: user.isAdmin,
      onboardingDone: user.onboardingDone,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Google Auth Error:", error.message);
    res.status(401).json({ message: "Invalid Google token" });
  }
};

module.exports = { googleAuth };
