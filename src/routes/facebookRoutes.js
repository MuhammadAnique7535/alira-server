const express = require("express");
const facebookController = require("../controllers/facebookController");

const router = express.Router();

// Get Facebook OAuth URL
router.get("/auth/facebook", facebookController.getAuthUrl);

// Handle Facebook OAuth callback
router.post("/auth/facebook/callback", facebookController.handleCallback);

// Get Facebook pages for frontend
router.get(
  "/api/integrations/facebook/pages/:userId",
  facebookController.getPages
);

// Get Facebook pages with access tokens for posting
router.get("/facebook/pages/:userId", facebookController.getPagesWithTokens);

// Schedule Facebook post
router.post("/schedule-facebook-post", facebookController.schedulePost);

module.exports = router;
