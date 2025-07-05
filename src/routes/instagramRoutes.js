const express = require("express");
const instagramController = require("../controllers/instagramController");

const router = express.Router();

// Get Instagram OAuth URL
router.get("/auth/instagram", instagramController.getAuthUrl);

// Handle Instagram OAuth callback
router.post("/auth/instagram/callback", instagramController.handleCallback);

// Get Instagram accounts for user
router.get(
  "/api/integrations/instagram/accounts/:userId",
  instagramController.getAccounts
);

// Schedule Instagram post
router.post("/schedule-instagram-post", instagramController.schedulePost);

module.exports = router;
