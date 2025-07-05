const axios = require("axios");
const supabase = require("../config/database");
const {
  INSTAGRAM_APP_ID,
  INSTAGRAM_APP_SECRET,
  INSTAGRAM_API_VERSION,
  INSTAGRAM_REDIRECT_URI,
  INSTAGRAM_DEFAULT_IMAGE,
} = require("../config/constants");

class InstagramService {
  // Get Instagram OAuth URL
  getAuthUrl() {
    return `https://www.facebook.com/${INSTAGRAM_API_VERSION}/dialog/oauth?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${INSTAGRAM_REDIRECT_URI}&scope=instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments,pages_read_engagement,pages_manage_posts,pages_show_list`;
  }

  // Exchange code for short-lived token
  async exchangeCodeForToken(code) {
    const tokenUrl = "https://api.instagram.com/oauth/access_token";
    const tokenPayload = new URLSearchParams({
      client_id: INSTAGRAM_APP_ID,
      client_secret: INSTAGRAM_APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: INSTAGRAM_REDIRECT_URI,
      code: code,
    });

    const tokenResponse = await axios.post(tokenUrl, tokenPayload, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return tokenResponse.data.access_token;
  }

  // Exchange short-lived token for long-lived token
  async exchangeForLongLivedToken(shortLivedToken) {
    const longLivedTokenUrl = "https://graph.instagram.com/access_token";
    const longLivedTokenPayload = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: INSTAGRAM_APP_SECRET,
      access_token: shortLivedToken,
    });

    const longLivedTokenResponse = await axios.get(
      `${longLivedTokenUrl}?${longLivedTokenPayload.toString()}`
    );

    return longLivedTokenResponse.data;
  }

  // Get user profile
  async getUserProfile(accessToken) {
    const { data: meData } = await axios.get("https://graph.instagram.com/me", {
      params: {
        access_token: accessToken,
        fields: "id,username,account_type,media_count",
      },
    });
    return meData;
  }

  // Get profile picture
  async getProfilePicture(accessToken) {
    let profilePictureUrl = null;

    // Try to get profile picture from user info
    try {
      const { data: userInfo } = await axios.get(
        "https://graph.instagram.com/me",
        {
          params: {
            access_token: accessToken,
            fields: "id,username,account_type,media_count,profile_picture_url",
          },
        }
      );

      if (userInfo.profile_picture_url) {
        profilePictureUrl = userInfo.profile_picture_url;
      }
    } catch (error) {
      console.log("Profile picture not available in user info");
    }

    // Try to get from recent media
    if (!profilePictureUrl) {
      try {
        const { data: mediaData } = await axios.get(
          `https://graph.instagram.com/me/media`,
          {
            params: {
              access_token: accessToken,
              fields: "media_type,media_url,thumbnail_url",
              limit: 1,
            },
          }
        );

        if (mediaData.data && mediaData.data.length > 0) {
          const latestMedia = mediaData.data[0];
          profilePictureUrl =
            latestMedia.thumbnail_url || latestMedia.media_url;
        }
      } catch (error) {
        console.log(
          "Could not fetch profile picture from media:",
          error.message
        );
      }
    }

    // Use default image if no picture found
    if (!profilePictureUrl) {
      profilePictureUrl = INSTAGRAM_DEFAULT_IMAGE;
    }

    return profilePictureUrl;
  }

  // Save connection to database
  async saveConnection(userId, instagramUserId, accessToken) {
    try {
      console.log(
        "[InstagramService] Saving Instagram connection to database..."
      );
      console.log("[InstagramService] User ID:", userId);
      console.log("[InstagramService] Instagram User ID:", instagramUserId);

      const { data: sourceData, error: sourceError } = await supabase
        .from("connected_sources")
        .insert({
          user_id: userId,
          source: "instagram",
          source_user_id: instagramUserId,
          access_token: accessToken,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (sourceError) {
        console.error(
          "[InstagramService] Database error saving connection:",
          sourceError
        );
        throw new Error(
          `Failed to save connection source: ${sourceError.message}`
        );
      }

      console.log("[InstagramService] Instagram connection saved successfully");
      return sourceData[0];
    } catch (error) {
      console.error("[InstagramService] Error saving connection:", error);
      throw error;
    }
  }

  // Save Instagram account
  async saveAccount(
    instagramUserId,
    sourceConnectionId,
    username,
    profilePictureUrl,
    accessToken,
    userId
  ) {
    const { error: accountError } = await supabase
      .from("instagram_accounts")
      .upsert(
        {
          account_id: instagramUserId,
          source_connection_id: sourceConnectionId,
          username: username,
          name: username,
          profile_picture_url: profilePictureUrl,
          page_access_token: accessToken,
          page_id: instagramUserId,
          user_id: userId,
        },
        {
          onConflict: "account_id",
        }
      );

    if (accountError) throw new Error("Failed to save Instagram account");
  }

  // Get Instagram accounts from database
  async getAccounts(userId) {
    const { data: accounts, error } = await supabase
      .from("instagram_accounts")
      .select(
        `
        account_id,
        username,
        name,
        profile_picture_url,
        created_at,
        connected_sources!inner(user_id)
      `
      )
      .eq("connected_sources.user_id", userId)
      .eq("is_connected", true);

    if (error) throw new Error("Failed to fetch Instagram accounts");
    return accounts;
  }

  // Get Instagram account for posting
  async getAccount(accountId, userId) {
    const { data: account, error } = await supabase
      .from("instagram_accounts")
      .select("*")
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .eq("is_connected", true)
      .single();

    if (error || !account) throw new Error("Instagram account not found");
    return account;
  }

  // Schedule Instagram post
  async schedulePost(accountId, content, images, scheduledTime, userId) {
    try {
      console.log("[InstagramService] Scheduling Instagram post...");
      console.log("[InstagramService] Account ID:", accountId);
      console.log("[InstagramService] Scheduled Time:", scheduledTime);

      // Store the scheduled post in database
      const { data: scheduledPost, error: insertError } = await supabase
        .from("scheduled_posts")
        .insert({
          user_id: userId,
          platform: "instagram",
          account_id: accountId,
          content: content,
          images: images || [],
          scheduled_time: scheduledTime.toISOString(),
          status: "scheduled",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error(
          "[InstagramService] Database error scheduling post:",
          insertError
        );
        throw new Error(
          `Failed to schedule Instagram post: ${insertError.message}`
        );
      }

      console.log("[InstagramService] Instagram post scheduled successfully");
      return scheduledPost;
    } catch (error) {
      console.error("[InstagramService] Error scheduling post:", error);
      throw error;
    }
  }

  // Publish Instagram post
  async publishPost(scheduledPost) {
    console.log(
      `[InstagramService] Starting to publish post: ${scheduledPost.id}`
    );

    try {
      // Get Instagram account access token
      const account = await this.getAccount(
        scheduledPost.account_id,
        scheduledPost.user_id
      );

      console.log("[InstagramService] Account:", account);

      // Create media container
      const mediaData = {
        image_url:
          scheduledPost.images && scheduledPost.images.length > 0
            ? scheduledPost.images[0]
            : INSTAGRAM_DEFAULT_IMAGE,
        caption: scheduledPost.content,
        access_token: account.page_access_token,
      };

      console.log("[InstagramService] Media Data:", mediaData);

      console.log("[InstagramService] Creating media container...");
      const mediaResponse = await fetch(
        `https://graph.instagram.com/${INSTAGRAM_API_VERSION}/${scheduledPost.account_id}/media`,
        {
          method: "POST",
          body: JSON.stringify(mediaData),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!mediaResponse.ok) {
        const errorData = await mediaResponse.json();
        throw new Error(
          `Instagram API error: ${errorData.error?.message || "Unknown error"}`
        );
      }

      const mediaResult = await mediaResponse.json();
      console.log(
        "[InstagramService] Media container created:",
        mediaResult.id
      );

      // Publish the media
      const publishData = {
        creation_id: mediaResult.id,
        access_token: account.page_access_token,
      };

      console.log("[InstagramService] Publishing media...");
      const publishResponse = await fetch(
        `https://graph.instagram.com/${INSTAGRAM_API_VERSION}/${scheduledPost.account_id}/media_publish`,
        {
          method: "POST",
          body: JSON.stringify(publishData),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!publishResponse.ok) {
        const errorData = await publishResponse.json();
        throw new Error(
          `Instagram API error: ${errorData.error?.message || "Unknown error"}`
        );
      }

      const publishResult = await publishResponse.json();
      console.log(
        "[InstagramService] Post published successfully:",
        publishResult.id
      );

      // Update the scheduled post status to published
      const { error: updateError } = await supabase
        .from("scheduled_posts")
        .update({
          status: "published",
          external_id: publishResult.id,
          published_at: new Date().toISOString(),
        })
        .eq("id", scheduledPost.id);

      if (updateError) {
        console.error("[InstagramService] Database update error:", updateError);
      }

      console.log(
        `[InstagramService] Successfully published scheduled post: ${scheduledPost.id}`
      );
      return { success: true, postId: publishResult.id };
    } catch (error) {
      console.error(
        `[InstagramService] Error publishing post ${scheduledPost.id}:`,
        error.message
      );

      // Update status to failed
      await supabase
        .from("scheduled_posts")
        .update({
          status: "failed",
          error_message: error.message,
        })
        .eq("id", scheduledPost.id);

      return { success: false, error: error.message };
    }
  }
}

module.exports = new InstagramService();
