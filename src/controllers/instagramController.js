const instagramService = require("../services/instagramService");

class InstagramController {
  // Get Instagram OAuth URL
  getAuthUrl(req, res) {
    try {
      const authUrl = instagramService.getAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error("[Instagram Controller] Error getting auth URL:", error);
      res.status(500).json({ message: "Failed to generate auth URL" });
    }
  }

  // Handle Instagram OAuth callback
  async handleCallback(req, res) {
    const { code, userId } = req.body;

    if (!code) {
      return res
        .status(400)
        .json({ message: "Authorization code is missing." });
    }

    try {
      console.log("[Instagram Controller] Starting authentication process");

      // Exchange code for short-lived token
      const shortLivedToken = await instagramService.exchangeCodeForToken(code);
      console.log("[Instagram Controller] Obtained short-lived token");

      // Exchange for long-lived token
      const longLivedTokenData =
        await instagramService.exchangeForLongLivedToken(shortLivedToken);
      const longLivedToken = longLivedTokenData.access_token;
      console.log("[Instagram Controller] Obtained long-lived token");

      // Get user profile
      const meData = await instagramService.getUserProfile(longLivedToken);
      const instagramUserId = meData.id;
      console.log("[Instagram Controller] Instagram user ID:", instagramUserId);
      console.log(
        "[Instagram Controller] Instagram username:",
        meData.username
      );

      // Get profile picture
      const profilePictureUrl = await instagramService.getProfilePicture(
        longLivedToken
      );

      // Save connection
      const sourceConnection = await instagramService.saveConnection(
        userId,
        instagramUserId,
        longLivedToken
      );
      console.log(
        "[Instagram Controller] Saved connection source with ID:",
        sourceConnection.id
      );

      // Save Instagram account
      await instagramService.saveAccount(
        instagramUserId,
        sourceConnection.id,
        meData.username,
        profilePictureUrl,
        longLivedToken,
        userId
      );

      console.log(
        `[Instagram Controller] Saved Instagram account: ${meData.username}`
      );

      const instagramAccount = {
        id: instagramUserId,
        username: meData.username,
        name: meData.username,
        profile_picture_url: profilePictureUrl,
        account_type: meData.account_type,
        media_count: meData.media_count,
      };

      res.status(200).json({
        status: "success",
        message: "Instagram connected successfully.",
        accounts: [instagramAccount],
      });
    } catch (error) {
      console.error(
        "[Instagram Controller] Error:",
        error.response ? error.response.data : error.message
      );

      if (error.response) {
        console.error(
          "[Instagram Controller] Response status:",
          error.response.status
        );
        console.error(
          "[Instagram Controller] Response data:",
          JSON.stringify(error.response.data, null, 2)
        );
      }

      res.status(500).json({
        message: "An error occurred during Instagram authentication.",
        error: error.response ? error.response.data : "Unknown error",
      });
    }
  }

  // Get Instagram accounts
  async getAccounts(req, res) {
    const { userId } = req.params;
    console.log("[Instagram Controller] Fetching accounts for userId:", userId);

    try {
      const accounts = await instagramService.getAccounts(userId);

      const formattedAccounts = accounts.map((account) => ({
        id: account.account_id,
        username: account.username,
        name: account.name,
        profile_picture_url: account.profile_picture_url,
        created_at: account.created_at,
      }));

      console.log(
        "[Instagram Controller] Returning accounts:",
        formattedAccounts.length
      );
      res.status(200).json(formattedAccounts);
    } catch (error) {
      console.error("[Instagram Controller] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch Instagram accounts",
      });
    }
  }

  // Schedule Instagram post
  async schedulePost(req, res) {
    const { content, images, scheduledTime, accountId, userId } = req.body;

    try {
      console.log("[Instagram Controller] Starting post scheduling process");

      // Validate required fields
      if (!content || !scheduledTime || !accountId || !userId) {
        return res.status(400).json({
          status: "error",
          message:
            "Missing required fields: content, scheduledTime, accountId, and userId are required",
        });
      }

      // Convert scheduled time to UTC
      const scheduledDate = new Date(scheduledTime);
      const scheduledTimeUTC = new Date(
        scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60000
      );

      // Validate scheduled time is in the future
      if (scheduledTimeUTC <= new Date()) {
        return res.status(400).json({
          status: "error",
          message: "Scheduled time must be in the future",
        });
      }

      // Get Instagram account to verify it exists and user has access
      const account = await instagramService.getAccount(accountId, userId);
      console.log(
        `[Instagram Controller] Using account: ${account.username} (${account.account_id})`
      );

      // Schedule the post (stores in database for later publishing)
      const scheduledPost = await instagramService.schedulePost(
        accountId,
        content,
        images,
        scheduledTimeUTC,
        userId
      );

      console.log("[Instagram Controller] Post scheduled:", scheduledPost);

      res.json({
        status: "success",
        postId: scheduledPost.id,
        scheduledTime: scheduledTimeUTC.toISOString(),
        message: "Instagram post scheduled successfully",
        accountName: account.username,
      });
    } catch (error) {
      console.error("[Instagram Controller] Error:", error);
      res.status(500).json({
        status: "error",
        message: `Failed to schedule Instagram post: ${error.message}`,
      });
    }
  }
}

module.exports = new InstagramController();
