const User = require("../models/User");

// Simple admin middleware — checks isAdmin flag on user
const adminOnly = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (!req.user.isAdmin) return res.status(403).json({ message: "Admin access required" });
  next();
};

module.exports = { adminOnly };
