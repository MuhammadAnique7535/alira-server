const axios = require("axios");
const supabase = require("../config/database");
const {
  FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET,
  FACEBOOK_API_VERSION,
  REDIRECT_URI,
} = require("../config/constants");

class FacebookService {
  constructor() {
    this.userTokens = new Map();
  }

  // Get Facebook OAuth URL
  getAuthUrl() {
    console.log("[FacebookService] Generating OAuth URL with config:", {
      FACEBOOK_API_VERSION,
      FACEBOOK_APP_ID,
      REDIRECT_URI,
      scope:
        "pages_read_engagement,pages_manage_posts,pages_show_list,publish_to_groups",
    });

    const authUrl = `https://www.facebook.com/${FACEBOOK_API_VERSION}/dialog/oauth?client_id=${FACEBOOK_APP_ID}&redirect_uri=${REDIRECT_URI}&scope=pages_read_engagement,pages_manage_posts,pages_show_list,publish_to_groups`;

    console.log("[FacebookService] Generated OAuth URL:", authUrl);
    return authUrl;
  }

  // Exchange code for short-lived token
  async exchangeCodeForToken(code) {
    try {
      console.log("code", code);

      console.log("FACEBOOK_APP_ID", FACEBOOK_APP_ID);
      console.log("REDIRECT_URI", REDIRECT_URI);
      console.log("FACEBOOK_APP_SECRET", FACEBOOK_APP_SECRET);
      console.log("FACEBOOK_API_VERSION", FACEBOOK_API_VERSION);

      console.log(
        "[FacebookService] Making token exchange request to Facebook API..."
      );
      console.log(
        "[FacebookService] Request URL:",
        `https://graph.facebook.com/${FACEBOOK_API_VERSION}/oauth/access_token`
      );
      console.log("[FacebookService] Request params:", {
        client_id: FACEBOOK_APP_ID,
        redirect_uri: REDIRECT_URI,
        client_secret: "***HIDDEN***",
        code: code ? `${code.substring(0, 10)}...` : "undefined",
      });

      const { data: tokenData, error } = await axios.get(
        `https://graph.facebook.com/${FACEBOOK_API_VERSION}/oauth/access_token`,
        {
          params: {
            client_id: FACEBOOK_APP_ID,
            redirect_uri: REDIRECT_URI,
            client_secret: FACEBOOK_APP_SECRET,
            code,
          },
        }
      );

      console.log("tokenData", tokenData);

      return tokenData.access_token;
    } catch (error) {
      console.error("Error exchanging code for token:", error);
      if (error.response) {
        console.error("Facebook API Error:", error.response.data);
        throw new Error(
          `Facebook API error: ${
            error.response.data.error?.message || error.response.statusText
          }`
        );
      } else if (error.request) {
        console.error("Network Error:", error.request);
        throw new Error("Network error: Unable to reach Facebook API");
      } else {
        console.error("Error:", error.message);
        throw new Error(`Token exchange failed: ${error.message}`);
      }
    }
  }

  // Exchange short-lived token for long-lived token
  async exchangeForLongLivedToken(shortLivedToken) {
    try {
      console.log(
        "[FacebookService] Exchanging short-lived token for long-lived token..."
      );
      console.log(
        "[FacebookService] Request URL:",
        `https://graph.facebook.com/${FACEBOOK_API_VERSION}/oauth/access_token`
      );

      const { data: longLivedTokenData } = await axios.get(
        `https://graph.facebook.com/${FACEBOOK_API_VERSION}/oauth/access_token`,
        {
          params: {
            grant_type: "fb_exchange_token",
            client_id: FACEBOOK_APP_ID,
            client_secret: FACEBOOK_APP_SECRET,
            fb_exchange_token: shortLivedToken,
          },
        }
      );

      console.log("[FacebookService] Long-lived token exchange successful");
      return longLivedTokenData;
    } catch (error) {
      console.error(
        "[FacebookService] Error exchanging for long-lived token:",
        error
      );
      if (error.response) {
        console.error(
          "[FacebookService] Facebook API Error:",
          error.response.data
        );
        throw new Error(
          `Facebook API error: ${
            error.response.data.error?.message || error.response.statusText
          }`
        );
      } else if (error.request) {
        console.error("[FacebookService] Network Error:", error.request);
        throw new Error("Network error: Unable to reach Facebook API");
      } else {
        console.error("[FacebookService] Error:", error.message);
        throw new Error(`Long-lived token exchange failed: ${error.message}`);
      }
    }
  }

  // Get user profile
  async getUserProfile(accessToken) {
    try {
      console.log("[FacebookService] Getting user profile...");
      console.log(
        "[FacebookService] Request URL:",
        `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me`
      );

      const { data: meData } = await axios.get(
        `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me`,
        {
          params: { access_token: accessToken, fields: "id" },
        }
      );

      console.log("[FacebookService] User profile retrieved successfully");
      return meData;
    } catch (error) {
      console.error("[FacebookService] Error getting user profile:", error);
      if (error.response) {
        console.error(
          "[FacebookService] Facebook API Error:",
          error.response.data
        );
        throw new Error(
          `Facebook API error: ${
            error.response.data.error?.message || error.response.statusText
          }`
        );
      } else if (error.request) {
        console.error("[FacebookService] Network Error:", error.request);
        throw new Error("Network error: Unable to reach Facebook API");
      } else {
        console.error("[FacebookService] Error:", error.message);
        throw new Error(`Get user profile failed: ${error.message}`);
      }
    }
  }

  // Get user's pages
  async getUserPages(accessToken) {
    try {
      console.log("[FacebookService] Getting user's Facebook pages...");
      console.log(
        "[FacebookService] Request URL:",
        `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me/accounts`
      );

      const { data: pagesData } = await axios.get(
        `https://graph.facebook.com/${FACEBOOK_API_VERSION}/me/accounts`,
        {
          params: {
            access_token: accessToken,
            fields: "id,name,access_token,picture{url}",
          },
        }
      );

      console.log(
        `[FacebookService] Retrieved ${
          pagesData.data?.length || 0
        } Facebook pages`
      );
      return pagesData.data;
    } catch (error) {
      console.error("[FacebookService] Error getting user pages:", error);
      if (error.response) {
        console.error(
          "[FacebookService] Facebook API Error:",
          error.response.data
        );
        throw new Error(
          `Facebook API error: ${
            error.response.data.error?.message || error.response.statusText
          }`
        );
      } else if (error.request) {
        console.error("[FacebookService] Network Error:", error.request);
        throw new Error("Network error: Unable to reach Facebook API");
      } else {
        console.error("[FacebookService] Error:", error.message);
        throw new Error(`Get user pages failed: ${error.message}`);
      }
    }
  }

  // Save connection to database
  async saveConnection(userId, facebookUserId, accessToken) {
    try {
      console.log(
        "[FacebookService] Saving Facebook connection to database..."
      );
      console.log("[FacebookService] User ID:", userId);
      console.log("[FacebookService] Facebook User ID:", facebookUserId);

      const { data: sourceData, error: sourceError } = await supabase
        .from("connected_sources")
        .insert({
          user_id: userId,
          source: "facebook",
          source_user_id: facebookUserId,
          access_token: accessToken,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (sourceError) {
        console.error(
          "[FacebookService] Database error saving connection:",
          sourceError
        );
        throw new Error(
          `Failed to save connection source: ${sourceError.message}`
        );
      }

      console.log("[FacebookService] Facebook connection saved successfully");
      return sourceData[0];
    } catch (error) {
      console.error("[FacebookService] Error saving connection:", error);
      throw error;
    }
  }

  // Save Facebook pages
  async savePages(pages, sourceConnectionId, userId) {
    for (const page of pages) {
      const { error: pageError } = await supabase.from("facebook_pages").upsert(
        {
          page_id: page.id,
          source_connection_id: sourceConnectionId,
          name: page.name,
          access_token: page.access_token,
          picture_url: page.picture?.data?.url || null,
          user_id: userId,
        },
        {
          onConflict: "page_id",
        }
      );

      if (pageError) {
        console.error(`Error saving page ${page.name}:`, pageError);
      } else {
        console.log(`Saved page: ${page.name}`);
      }
    }
  }

  // Get Facebook pages from database
  async getPages(userId) {
    const { data: pages, error } = await supabase
      .from("facebook_pages")
      .select(
        `
        page_id,
        name,
        picture_url,
        connected_sources!inner(user_id)
      `
      )
      .eq("connected_sources.user_id", userId)
      .eq("is_connected", true);

    if (error) throw new Error("Failed to fetch Facebook pages");
    return pages;
  }

  // Get Facebook pages with access tokens
  async getPagesWithTokens(userId) {
    const { data: pages, error } = await supabase
      .from("facebook_pages")
      .select(
        `
        page_id,
        name,
        access_token,
        picture_url,
        connected_sources!inner(user_id, access_token)
      `
      )
      .eq("connected_sources.user_id", userId)
      .eq("is_connected", true);

    if (error) throw new Error("Failed to fetch Facebook pages from database");
    return pages;
  }

  // Schedule Facebook post
  async schedulePost(pageId, content, images, scheduledTime, accessToken) {
    // Upload images if any
    let imageIds = [];
    if (images && images.length > 0) {
      for (const imageUrl of images) {
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          const imageBuffer = await response.buffer();

          // Upload image to Facebook
          const formData = new FormData();
          formData.append("source", imageBuffer);
          formData.append("access_token", accessToken);

          const uploadResponse = await fetch(
            `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${pageId}/photos`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(
              `Facebook API error: ${
                errorData.error?.message || "Unknown error"
              }`
            );
          }

          const uploadData = await uploadResponse.json();
          if (uploadData.id) {
            imageIds.push(uploadData.id);
          }
        } catch (error) {
          console.error(`Error uploading image ${imageUrl}:`, error);
          // Continue with other images even if one fails
        }
      }
    }

    // Prepare the post data
    const postData = {
      message: content,
      published: false,
      scheduled_publish_time: Math.floor(scheduledTime.getTime() / 1000),
      access_token: accessToken,
    };

    // If we have images, add them to the post
    if (imageIds.length > 0) {
      postData.attached_media = imageIds.map((id) => ({ media_fbid: id }));
    }

    // Schedule the post
    const response = await fetch(
      `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${pageId}/feed`,
      {
        method: "POST",
        body: JSON.stringify(postData),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Facebook API error: ${errorData.error?.message || "Unknown error"}`
      );
    }

    const data = await response.json();
    return data;
  }
}

module.exports = new FacebookService();
