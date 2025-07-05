const linkedinService = require("../services/linkedinService");

class LinkedInController {
  // Get LinkedIn OAuth URL
  getAuthUrl(req, res) {
    try {
      const { authUrl, state } = linkedinService.getAuthUrl();
      res.json({ authUrl, state });
    } catch (error) {
      console.error("[LinkedIn Controller] Error getting auth URL:", error);
      res.status(500).json({ message: "Failed to generate auth URL" });
    }
  }

  // Handle LinkedIn OAuth callback
  async handleCallback(req, res) {
    try {
      const { code, state, userId } = req.body;

      console.log("[LinkedIn Controller] Starting authentication process");

      // Exchange code for access token
      const accessToken = await linkedinService.exchangeCodeForToken(code);
      console.log("[LinkedIn Controller] Obtained access token");

      // Get LinkedIn profile information
      try {
        const profile = await linkedinService.getProfile(accessToken);
        console.log("[LinkedIn Controller] Retrieved profile:", profile.sub);

        // Save connection
        await linkedinService.saveConnection(userId, profile.sub, accessToken);

        // Save LinkedIn account details
        await linkedinService.saveAccount(
          profile.sub,
          userId,
          profile.given_name,
          profile.family_name,
          profile.picture,
          accessToken
        );

        console.log(
          "[LinkedIn Controller] Successfully saved LinkedIn account"
        );

        res.json({
          status: "success",
          message: "LinkedIn account connected successfully",
          account: {
            id: profile.sub,
            first_name: profile.given_name || "Unknown",
            last_name: profile.family_name || "User",
            profile_picture_url: profile.picture || null,
          },
        });
      } catch (profileError) {
        console.error(
          "[LinkedIn Controller] Profile fetch error:",
          profileError.message
        );

        // Check if it's a scope/permission issue
        if (profileError.message.includes("Permission denied")) {
          console.log(
            "[LinkedIn Controller] Permission denied - using fallback connection"
          );

          // If we can't get profile info due to permissions, still save the connection with basic info
          const basicProfileId = `linkedin_${Date.now()}`;

          await linkedinService.saveConnection(
            userId,
            basicProfileId,
            accessToken
          );

          // Store basic LinkedIn account details
          await linkedinService.saveAccount(
            basicProfileId,
            userId,
            "LinkedIn",
            "User",
            null,
            accessToken
          );

          console.log(
            "[LinkedIn Controller] Successfully saved basic LinkedIn account"
          );

          res.json({
            status: "success",
            message:
              "LinkedIn account connected successfully (basic access - profile info not available due to app permissions)",
            account: {
              id: basicProfileId,
              first_name: "LinkedIn",
              last_name: "User",
              profile_picture_url: null,
            },
          });
        } else {
          // For other errors, return the error
          return res.status(500).json({
            status: "error",
            message: "Failed to connect LinkedIn account",
            error: profileError.message,
          });
        }
      }
    } catch (error) {
      console.error(
        "[LinkedIn Controller] Error:",
        error.response ? error.response.data : error.message
      );
      res.status(500).json({
        status: "error",
        message: "Failed to connect LinkedIn account",
        error: error.response ? error.response.data : "Unknown error",
      });
    }
  }

  // Get LinkedIn accounts
  async getAccounts(req, res) {
    try {
      const { userId } = req.params;
      console.log(
        "[LinkedIn Controller] Fetching accounts for userId:",
        userId
      );

      const accounts = await linkedinService.getAccounts(userId);

      const formattedAccounts = accounts.map((account) => ({
        id: account.account_id,
        first_name: account.first_name,
        last_name: account.last_name,
        profile_picture_url: account.profile_picture_url,
        created_at: account.created_at,
      }));

      console.log(
        "[LinkedIn Controller] Returning accounts:",
        formattedAccounts
      );
      res.json(formattedAccounts || []);
    } catch (error) {
      console.error("[LinkedIn Controller] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch LinkedIn accounts",
      });
    }
  }

  // Schedule LinkedIn post
  async schedulePost(req, res) {
    const { content, images, scheduledTime, accountId, userId } = req.body;

    try {
      console.log("[LinkedIn Controller] Starting post scheduling process");

      // Validate required fields
      if (!content || !scheduledTime || !accountId) {
        return res.status(400).json({
          status: "error",
          message:
            "Missing required fields: content, scheduledTime, and accountId are required",
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

      // Schedule the post
      const scheduledPost = await linkedinService.schedulePost(
        accountId,
        content,
        images,
        scheduledTimeUTC,
        userId
      );

      // Get account details for response
      const account = await linkedinService.getAccount(accountId, userId);

      console.log(
        `[LinkedIn Controller] Successfully scheduled post with ID: ${scheduledPost.id}`
      );

      res.json({
        status: "success",
        message: "LinkedIn post scheduled successfully",
        postId: scheduledPost.id,
        scheduledTime: scheduledTimeUTC.toISOString(),
        accountName: `${account.first_name} ${account.last_name}`,
        willPublishAt: scheduledTimeUTC.toISOString(),
      });
    } catch (error) {
      console.error(
        "[LinkedIn Controller] Error:",
        error.response?.data || error.message
      );

      res.status(500).json({
        status: "error",
        message: `Failed to schedule LinkedIn post: ${
          error.response?.data?.message || error.message
        }`,
      });
    }
  }
}

module.exports = new LinkedInController();
