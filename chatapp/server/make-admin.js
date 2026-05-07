/**
 * make-admin.js
 * Run this script ONCE after someone signs in for the first time
 * to grant them admin access.
 *
 * Usage:
 *   cd server
 *   node make-admin.js your@email.com
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const email = process.argv[2];
if (!email) {
  console.error("❌  Usage: node make-admin.js your@email.com");
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { isAdmin: true },
      { new: true }
    );

    if (!user) {
      console.error(`❌  No user found with email: ${email}`);
      console.error("   Make sure they have signed in at least once first.");
    } else {
      console.log(`✅  Admin granted to: ${user.name} (${user.email})`);
      console.log("   They will see the 🛡️ Admin Dashboard next time they log in.");
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌  Error:", err.message);
    process.exit(1);
  }
})();
