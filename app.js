const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: "*",
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Configure OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "social-media-post-generator",
  });
});

// Generate post content using OpenAI
async function generatePostContent(prompt, platform) {
  try {
    const functions = [
      {
        name: "generate_social_post",
        description:
          "Generate a social media post or response based on the prompt",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["post", "response"],
              description:
                "Type of content: 'post' for social media posts, 'response' for other content. Make it post only if user provide details for real estate or any post content by make response if user asking questions",
            },
            caption: {
              type: "string",
              description:
                "The main content of the post or response message do not add #hashtags in caption",
            },
            hashtags: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Array of hashtags for the post",
            },
            image: {
              type: "string",
              description: "'empty' if no image",
            },
          },
          required: ["type", "caption", "hashtags", "image"],
        },
      },
    ];

    const systemPrompt = `You are a social media expert specializing in ${platform} content creation.
        Analyze the prompt and determine if it's suitable for creating a social media post.
        If the prompt is not relevant for creating a post, return a response type.
        Always include relevant hashtags for the content.`;

    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Create content based on this prompt: ${prompt}`,
        },
      ],
      functions: functions,
      function_call: { name: "generate_social_post" },
    });

    const functionCall = response.choices[0].message.function_call;
    if (functionCall && functionCall.name === "generate_social_post") {
      return JSON.parse(functionCall.arguments);
    } else {
      throw new Error("Failed to generate structured response");
    }
  } catch (error) {
    return {
      type: "response",
      caption: `Error generating content: ${error.message}`,
      hashtags: [],
      image: "empty",
    };
  }
}

// Generate post endpoint
app.post("/generate-post", async (req, res) => {
  try {
    const { platform, prompt } = req.body;

    if (!platform || !prompt) {
      return res.status(400).json({
        type: "response",
        caption: "Missing required fields",
        hashtags: [],
        image: "empty",
        status: "error",
        generated_at: new Date().toISOString(),
      });
    }

    // Generate content using OpenAI
    const generatedContent = await generatePostContent(prompt, platform);

    // Add metadata to the response
    const response = {
      ...generatedContent,
      platform,
      generated_at: new Date().toISOString(),
      status: "success",
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      type: "response",
      caption: `Error: ${error.message}`,
      hashtags: [],
      image: "empty",
      status: "error",
      generated_at: new Date().toISOString(),
    });
  }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
