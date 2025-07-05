const axios = require("axios");
const supabase = require("../config/database");
const {
  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
  LINKEDIN_API_VERSION,
  LINKEDIN_REDIRECT_URI,
} = require("../config/constants");

class LinkedInService {
  // Get LinkedIn OAuth URL
  getAuthUrl() {
    const state = Math.random().toString(36).substring(7);
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${LINKEDIN_REDIRECT_URI}&state=${state}&scope=openid profile w_member_social`;
    return { authUrl, state };
  }

  // Exchange code for access token
  async exchangeCodeForToken(code) {
    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
        redirect_uri: LINKEDIN_REDIRECT_URI,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return tokenResponse.data.access_token;
  }

  // Get LinkedIn profile information
  async getProfile(accessToken) {
    try {
      const profileResponse = await axios.get(
        `https://api.linkedin.com/${LINKEDIN_API_VERSION}/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return profileResponse.data;
    } catch (error) {
      if (error.response?.status === 403) {
        throw new Error("Permission denied - profile access not available");
      }
      throw error;
    }
  }

  // Save LinkedIn connection
  async saveConnection(userId, profileId, accessToken) {
    try {
      console.log(
        "[LinkedInService] Saving LinkedIn connection to database..."
      );
      console.log("[LinkedInService] User ID:", userId);
      console.log("[LinkedInService] LinkedIn Profile ID:", profileId);

      const { data: sourceData, error: sourceError } = await supabase
        .from("connected_sources")
        .insert({
          user_id: userId,
          source: "linkedin",
          source_user_id: profileId,
          access_token: accessToken,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (sourceError) {
        console.error(
          "[LinkedInService] Database error saving connection:",
          sourceError
        );
        throw new Error(
          `Failed to save LinkedIn connection: ${sourceError.message}`
        );
      }

      console.log("[LinkedInService] LinkedIn connection saved successfully");
      return sourceData[0];
    } catch (error) {
      console.error("[LinkedInService] Error saving connection:", error);
      throw error;
    }
  }

  // Save LinkedIn account
  async saveAccount(
    profileId,
    userId,
    firstName,
    lastName,
    profilePicture,
    accessToken
  ) {
    const { error: accountError } = await supabase
      .from("linkedin_accounts")
      .upsert(
        {
          account_id: profileId,
          user_id: userId,
          first_name: firstName || "LinkedIn",
          last_name: lastName || "User",
          profile_picture_url: profilePicture || null,
          access_token: accessToken,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "account_id",
        }
      );

    if (accountError)
      throw new Error("Failed to save LinkedIn account details");
  }

  // Get LinkedIn accounts
  async getAccounts(userId) {
    const { data: accounts, error } = await supabase
      .from("linkedin_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_connected", true);

    if (error) throw new Error("Failed to fetch LinkedIn accounts");
    return accounts;
  }

  // Get LinkedIn account for posting
  async getAccount(accountId, userId) {
    const { data: account, error: accountError } = await supabase
      .from("linkedin_accounts")
      .select("access_token, first_name, last_name")
      .eq("account_id", accountId)
      .eq("user_id", userId)
      .eq("is_connected", true)
      .single();

    if (accountError || !account) throw new Error("LinkedIn account not found");
    return account;
  }

  // Schedule LinkedIn post
  async schedulePost(accountId, content, images, scheduledTime, userId) {
    // Store the scheduled post in database
    const { data: scheduledPost, error: insertError } = await supabase
      .from("scheduled_posts")
      .insert({
        user_id: userId,
        platform: "linkedin",
        account_id: accountId,
        content: content,
        images: images || [],
        scheduled_time: scheduledTime.toISOString(),
        status: "scheduled",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw new Error("Failed to schedule LinkedIn post");
    return scheduledPost;
  }

  // Publish LinkedIn post
  async publishPost(scheduledPost) {
    console.log(
      `[LinkedIn Service] Starting to publish post: ${scheduledPost.id}`
    );

    try {
      // Get LinkedIn account access token
      const account = await this.getAccount(
        scheduledPost.account_id,
        scheduledPost.user_id
      );

      // Upload images if any
      let imageAssets = [];
      if (scheduledPost.images && scheduledPost.images.length > 0) {
        console.log(
          `[LinkedIn Service] Processing ${scheduledPost.images.length} images`
        );

        for (const imageUrl of scheduledPost.images) {
          try {
            console.log(
              `[LinkedIn Service] Fetching image from URL: ${imageUrl}`
            );

            // Fetch the image
            const response = await fetch(imageUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            const imageBuffer = await response.buffer();
            console.log(
              `[LinkedIn Service] Successfully fetched image from ${imageUrl}`
            );

            // Upload image to LinkedIn
            console.log(`[LinkedIn Service] Uploading image to LinkedIn`);

            // Step 1: Register upload
            const registerResponse = await axios.post(
              `https://api.linkedin.com/${LINKEDIN_API_VERSION}/assets?action=registerUpload`,
              {
                registerUploadRequest: {
                  recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
                  owner: `urn:li:person:${scheduledPost.account_id}`,
                  serviceRelationships: [
                    {
                      relationshipType: "OWNER",
                      identifier: "urn:li:userGeneratedContent",
                    },
                  ],
                },
              },
              {
                headers: {
                  Authorization: `Bearer ${account.access_token}`,
                  "Content-Type": "application/json",
                  "X-Restli-Protocol-Version": "2.0.0",
                },
              }
            );

            const {
              value: { uploadMechanism, asset },
            } = registerResponse.data;
            const uploadUrl =
              uploadMechanism[
                "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
              ].uploadUrl;
            const assetId = asset;

            console.log(`[LinkedIn Service] Got upload URL: ${uploadUrl}`);

            // Step 2: Upload the image
            const uploadResponse = await axios.post(uploadUrl, imageBuffer, {
              headers: {
                Authorization: `Bearer ${account.access_token}`,
                "Content-Type": "application/octet-stream",
              },
            });

            if (uploadResponse.status === 201) {
              console.log(
                `[LinkedIn Service] Successfully uploaded image with asset ID: ${assetId}`
              );
              imageAssets.push(assetId);
            } else {
              throw new Error(
                `Upload failed with status: ${uploadResponse.status}`
              );
            }
          } catch (error) {
            console.error(
              `[LinkedIn Service] Error uploading image ${imageUrl}:`,
              error.response?.data || error.message
            );
            // Continue with other images even if one fails
          }
        }
      } else {
        console.log("[LinkedIn Service] No images to process");
      }

      // Prepare the post data
      console.log("[LinkedIn Service] Preparing post data");

      const postData = {
        author: `urn:li:person:${scheduledPost.account_id}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: scheduledPost.content,
            },
            shareMediaCategory: imageAssets.length > 0 ? "IMAGE" : "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      };

      // Add images if we have any
      if (imageAssets.length > 0) {
        postData.specificContent["com.linkedin.ugc.ShareContent"].media =
          imageAssets.map((assetId) => ({
            status: "READY",
            description: {
              text: "Image",
            },
            media: assetId,
            title: {
              text: "Image",
            },
          }));
      }

      // Post to LinkedIn
      console.log("[LinkedIn Service] Posting to LinkedIn");
      const postResponse = await axios.post(
        `https://api.linkedin.com/${LINKEDIN_API_VERSION}/ugcPosts`,
        postData,
        {
          headers: {
            Authorization: `Bearer ${account.access_token}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      );

      console.log(
        "[LinkedIn Service] Post response:",
        JSON.stringify(postResponse.data)
      );

      if (postResponse.status === 201) {
        const postId = postResponse.data.id;
        console.log(
          `[LinkedIn Service] Successfully posted to LinkedIn with ID: ${postId}`
        );

        // Update the scheduled post status to published
        const { error: updateError } = await supabase
          .from("scheduled_posts")
          .update({
            status: "published",
            external_id: postId,
            published_at: new Date().toISOString(),
          })
          .eq("id", scheduledPost.id);

        if (updateError) {
          console.error(
            "[LinkedIn Service] Database update error:",
            updateError
          );
        }

        console.log(
          `[LinkedIn Service] Successfully published scheduled post: ${scheduledPost.id}`
        );
        return { success: true, postId };
      } else {
        throw new Error(`LinkedIn API returned status: ${postResponse.status}`);
      }
    } catch (error) {
      console.error(
        `[LinkedIn Service] Error publishing post ${scheduledPost.id}:`,
        error.response?.data || error.message
      );

      // Update status to failed
      await supabase
        .from("scheduled_posts")
        .update({
          status: "failed",
          error_message: error.response?.data?.message || error.message,
        })
        .eq("id", scheduledPost.id);

      return { success: false, error: error.message };
    }
  }
}

module.exports = new LinkedInService();
