const express = require("express");
const linkedinController = require("../controllers/linkedinController");

const router = express.Router();

// Get LinkedIn OAuth URL
router.get("/auth/linkedin", linkedinController.getAuthUrl);

// Handle LinkedIn OAuth callback
router.post(
  "/api/integrations/linkedin/callback",
  linkedinController.handleCallback
);

// Get LinkedIn accounts for user
router.get(
  "/api/integrations/linkedin/accounts/:userId",
  linkedinController.getAccounts
);

// Schedule LinkedIn post
router.post("/schedule-linkedin-post", linkedinController.schedulePost);

module.exports = router;
