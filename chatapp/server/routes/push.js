const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { subscribe, unsubscribe } = require("../controllers/pushController");

router.post("/subscribe", protect, subscribe);
router.delete("/unsubscribe", protect, unsubscribe);

// Public route — return VAPID public key so client can subscribe
router.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;
