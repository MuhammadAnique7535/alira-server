const supabase = require("../config/database");
const linkedinService = require("./linkedinService");
const instagramService = require("./instagramService");
const facebookService = require("./facebookService");

class CronJobService {
  // Process scheduled posts
  async processScheduledPosts() {
    console.log("[Cron Job] Starting scheduled posts processing...");

    try {
      // Get all scheduled posts that are due to be published
      const now = new Date();
      console.log(`[Cron Job] Current time (UTC): ${now.toISOString()}`);

      const { data: scheduledPosts, error } = await supabase
        .from("scheduled_posts")
        .select("*")
        .eq("status", "scheduled");

      if (error) {
        console.error("[Cron Job] Error fetching scheduled posts:", error);
        return;
      }

      if (!scheduledPosts || scheduledPosts.length === 0) {
        console.log("[Cron Job] No scheduled posts found");
        return;
      }

      console.log(
        `[Cron Job] Found ${scheduledPosts.length} total scheduled posts`
      );

      // Filter posts that are due to be published using UTC time
      const duePosts = scheduledPosts.filter((post) => {
        const scheduledTime = new Date(post.scheduled_time);
        const isDue = scheduledTime <= now;

        console.log(`[Cron Job] Post ${post.id} (${post.platform}):`);
        console.log(`  - Raw scheduled_time: ${post.scheduled_time}`);
        console.log(
          `  - Parsed scheduledTime (UTC): ${scheduledTime.toISOString()}`
        );
        console.log(`  - Current time (UTC): ${now.toISOString()}`);
        console.log(
          `  - Time difference (minutes): ${Math.round(
            (scheduledTime - now) / (1000 * 60)
          )}`
        );
        console.log(`  - Is due: ${isDue}`);

        return isDue;
      });

      if (duePosts.length === 0) {
        console.log("[Cron Job] No posts are due for publishing");
        return;
      }

      console.log(`[Cron Job] Found ${duePosts.length} posts to process`);

      // Process each scheduled post based on platform
      for (const post of duePosts) {
        try {
          console.log(
            `[Cron Job] Processing ${post.platform} post: ${post.id} (scheduled for: ${post.scheduled_time})`
          );

          let result;
          switch (post.platform) {
            case "linkedin":
              result = await linkedinService.publishPost(post);
              break;
            case "instagram":
              result = await instagramService.publishPost(post);
              break;
            case "facebook":
              result = await facebookService.publishPost(post);
              break;
            default:
              console.error(`[Cron Job] Unknown platform: ${post.platform}`);
              continue;
          }

          if (result.success) {
            console.log(
              `[Cron Job] Successfully published ${post.platform} post: ${post.id}`
            );
          } else {
            console.error(
              `[Cron Job] Failed to publish ${post.platform} post: ${post.id}`,
              result.error
            );
          }
        } catch (error) {
          console.error(
            `[Cron Job] Error processing ${post.platform} post ${post.id}:`,
            error
          );
        }
      }

      console.log("[Cron Job] Finished processing scheduled posts");
    } catch (error) {
      console.error("[Cron Job] Error in scheduled posts processing:", error);
    }
  }

  // Start the cron job
  startCronJob() {
    // Run every minute
    setInterval(() => {
      this.processScheduledPosts();
    }, 60 * 1000);

    // Also run once on startup to catch any missed posts
    setTimeout(() => {
      this.processScheduledPosts();
    }, 5000);

    console.log("[Cron Job] Cron job started - running every minute");
  }
}

module.exports = new CronJobService();
