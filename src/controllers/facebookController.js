const facebookService = require("../services/facebookService");

class FacebookController {
  // Get Facebook OAuth URL
  getAuthUrl(req, res) {
    try {
      const authUrl = facebookService.getAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error("[Facebook Controller] Error getting auth URL:", error);
      res.status(500).json({ message: "Failed to generate auth URL" });
    }
  }

  // Handle Facebook OAuth callback
  async handleCallback(req, res) {
    const { code, userId } = req.body;

    console.log("code", code);
    console.log("userId", userId);

    if (!code) {
      return res
        .status(400)
        .json({ message: "Authorization code is missing." });
    }

    try {
      console.log("[Facebook Controller] Starting authentication process");

      // Exchange code for short-lived token
      const shortLivedToken = await facebookService.exchangeCodeForToken(code);
      console.log("[Facebook Controller] Obtained short-lived token");

      // Exchange for long-lived token
      const longLivedTokenData =
        await facebookService.exchangeForLongLivedToken(shortLivedToken);
      const longLivedToken = longLivedTokenData.access_token;
      console.log("[Facebook Controller] Obtained long-lived token");

      // Get user profile
      const meData = await facebookService.getUserProfile(longLivedToken);
      const facebookUserId = meData.id;
      console.log("[Facebook Controller] Facebook user ID:", facebookUserId);

      // Save connection
      const sourceConnection = await facebookService.saveConnection(
        userId,
        facebookUserId,
        longLivedToken
      );
      console.log(
        "[Facebook Controller] Saved connection source with ID:",
        sourceConnection.id
      );

      // Get user's pages
      const pagesData = await facebookService.getUserPages(longLivedToken);
      console.log("[Facebook Controller] Retrieved pages:", pagesData.length);

      // Save pages
      await facebookService.savePages(pagesData, sourceConnection.id, userId);

      // Format pages for response
      const pages = pagesData.map((page) => ({
        pageId: page.id,
        name: page.name,
        accessToken: page.access_token,
        pictureUrl: page.picture?.data?.url,
      }));

      res.status(200).json({
        status: "success",
        message: "Facebook connected successfully.",
        pages,
      });
    } catch (error) {
      console.error(
        "[Facebook Controller] Error:",
        error.response ? error.response.data.error : error.message
      );
      res.status(500).json({
        message: "An error occurred during Facebook authentication.",
        error: error.response ? error.response.data.error : "Unknown error",
      });
    }
  }

  // Get Facebook pages for frontend
  async getPages(req, res) {
    const { userId } = req.params;
    console.log("userId", userId);

    try {
      const pages = await facebookService.getPages(userId);

      const formattedPages = pages.map((page) => ({
        page_id: page.page_id,
        name: page.name,
        picture_url: page.picture_url,
      }));

      res.status(200).json(formattedPages);
    } catch (error) {
      console.error("[Facebook Controller] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch Facebook pages",
      });
    }
  }

  // Get Facebook pages with access tokens for posting
  async getPagesWithTokens(req, res) {
    const { userId } = req.params;

    try {
      const pages = await facebookService.getPagesWithTokens(userId);

      if (!pages || pages.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "No Facebook connection found. Please authenticate first.",
        });
      }

      const formattedPages = pages.map((page) => ({
        pageId: page.page_id,
        name: page.name,
        accessToken: page.access_token,
        pictureUrl: page.picture_url,
      }));

      res.json({
        status: "success",
        pages: formattedPages,
      });
    } catch (error) {
      console.error("[Facebook Controller] Error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch Facebook pages",
      });
    }
  }

  // Schedule Facebook post
  async schedulePost(req, res) {
    const { content, images, scheduledTime, pageId, userId } = req.body;

    try {
      console.log("[Facebook Controller] Starting post scheduling process");

      // Validate required fields
      if (!content || !scheduledTime) {
        return res.status(400).json({
          status: "error",
          message:
            "Missing required fields: content and scheduledTime are required",
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

      // Get pages with tokens
      const pages = await facebookService.getPagesWithTokens(userId);

      if (!pages || pages.length === 0) {
        return res.status(401).json({
          status: "error",
          message:
            "No Facebook connection found. Please authenticate first at /auth/facebook",
        });
      }

      // Find the specific page or use the first available page
      const targetPage = pageId
        ? pages.find((page) => page.page_id === pageId)
        : pages[0];

      if (!targetPage) {
        return res.status(400).json({
          status: "error",
          message: "No Facebook pages found or invalid pageId provided.",
          availablePages: pages.map((page) => ({
            id: page.page_id,
            name: page.name,
          })),
        });
      }

      console.log(
        `[Facebook Controller] Using page: ${targetPage.name} (${targetPage.page_id})`
      );

      // Schedule the post
      const result = await facebookService.schedulePost(
        targetPage.page_id,
        content,
        images,
        scheduledTimeUTC,
        targetPage.access_token
      );

      console.log(
        `[Facebook Controller] Successfully scheduled post with ID: ${result.id}`
      );

      res.json({
        status: "success",
        postId: result.id,
        scheduledTime: scheduledTimeUTC.toISOString(),
        message: "Post scheduled successfully",
        pageName: targetPage.name,
      });
    } catch (error) {
      console.error("[Facebook Controller] Error:", error);
      res.status(500).json({
        status: "error",
        message: `Failed to schedule post on Facebook: ${error.message}`,
      });
    }
  }
}

module.exports = new FacebookController();
