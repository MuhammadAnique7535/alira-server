const postGenerationService = require("../services/postGenerationService");

class PostGenerationController {
  // Generate post content
  async generatePost(req, res) {
    try {
      const { prompt, context } = req.body;

      if (!prompt) {
        return res.status(400).json({
          type: "response",
          caption: "Missing required fields",
          platform: "facebook",
          hashtags: [],
          image: "empty",
          platform_reason: "Default platform due to missing prompt",
          status: "error",
          generated_at: new Date().toISOString(),
        });
      }

      // Generate content using OpenAI with context
      const generatedContent = await postGenerationService.generatePostContent(
        prompt,
        context
      );

      // Add metadata to the response
      const response = {
        ...generatedContent,
        generated_at: new Date().toISOString(),
        status: "success",
      };

      res.json(response);
    } catch (error) {
      console.error("Server Error:", error);
      res.status(500).json({
        type: "response",
        caption: `Error: ${error.message}`,
        platform: "facebook",
        hashtags: [],
        image: "empty",
        platform_reason: "Default platform due to error",
        status: "error",
        generated_at: new Date().toISOString(),
      });
    }
  }
}

module.exports = new PostGenerationController();
