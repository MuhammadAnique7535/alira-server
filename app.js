const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: ["https://aliraa.vercel.app", "http://localhost:5173"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
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
async function generatePostContent(prompt, context = []) {
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
            platform: {
              type: "string",
              enum: ["linkedin", "instagram", "facebook"],
              description:
                "The most appropriate platform for this content based on the content type, tone, and target audience",
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
            platform_reason: {
              type: "string",
              description: "Brief explanation of why this platform was chosen",
            },
          },
          required: [
            "type",
            "platform",
            "caption",
            "hashtags",
            "image",
            "platform_reason",
          ],
        },
      },
    ];

    const systemPrompt = `You are a social media expert specializing in content creation and platform strategy.
    Analyze the prompt and determine:
    1. If it's suitable for creating a social media post
    2. The most appropriate platform (LinkedIn, Instagram, or Facebook) based on:
       - Content type and tone
       - Target audience
       - Content length and format
       - Platform-specific best practices
    
    Platform Guidelines:
    - LinkedIn: Professional content, business updates, industry insights
    - Instagram: Visual content, lifestyle, creative, shorter captions
    - Facebook: Community-focused, longer content, personal updates
    
    Always include relevant hashtags for the chosen platform.`;

    // Format context for the conversation
    const contextMessages = context.map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.content,
    }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...contextMessages,
      {
        role: "user",
        content: `Create content based on this prompt: ${prompt}`,
      },
    ];

    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      functions,
      function_call: { name: "generate_social_post" },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const functionCall = response.choices[0].message.function_call;
    if (functionCall && functionCall.name === "generate_social_post") {
      return JSON.parse(functionCall.arguments);
    } else {
      throw new Error("Failed to generate structured response");
    }
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return {
      type: "response",
      caption: `Error generating content: ${error.message}`,
      platform: "Facebook",
      hashtags: [],
      image: "empty",
      platform_reason: "Default platform due to error",
    };
  }
}

// Generate post endpoint
app.post("/generate-post", async (req, res) => {
  try {
    const { prompt, context } = req.body;

    if (!prompt) {
      return res.status(400).json({
        type: "response",
        caption: "Missing required fields",
        platform: "Facebook",
        hashtags: [],
        image: "empty",
        platform_reason: "Default platform due to missing prompt",
        status: "error",
        generated_at: new Date().toISOString(),
      });
    }

    // Generate content using OpenAI with context
    const generatedContent = await generatePostContent(prompt, context);

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
      platform: "Facebook",
      hashtags: [],
      image: "empty",
      platform_reason: "Default platform due to error",
      status: "error",
      generated_at: new Date().toISOString(),
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  res.status(500).json({
    type: "response",
    caption: "Internal server error",
    platform: "Facebook",
    hashtags: [],
    image: "empty",
    platform_reason: "Default platform due to server error",
    status: "error",
    generated_at: new Date().toISOString(),
  });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
