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
                "Type of content: 'post' only if user explicitly asks to generate/create a post. 'response' for all other cases including questions, general queries, or when post generation is not explicitly requested.",
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
                "The main content of the post or response message. For posts: Use proper formatting with line breaks, emojis, and bullet points. For real estate posts: Include property details, features, and call-to-action in a structured format. Do not include hashtags in the caption.",
            },
            hashtags: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Array of relevant hashtags for the post",
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
    IMPORTANT RULES:
    1. ONLY generate a post (type: "post") when the user EXPLICITLY asks to:
       - "create a post"
       - "generate a post"
       - "make a post"
       - "write a post"
       - "need a post"
    2. For ALL other cases, including:
       - Questions
       - General queries
       - Advice requests
       - Comments
       - Discussions
       - When post generation is not explicitly requested
       Return type: "response" with a helpful, conversational reply
    
    Platform Selection Guidelines:
    - LinkedIn: Professional content, business updates, industry insights
    - Instagram: Visual content, lifestyle, creative, shorter captions
    - Facebook: Community-focused, longer content, personal updates
    
    Post Structure Guidelines (ONLY for type: "post"):
    1. Always use proper formatting:
       - Line breaks for readability
       - Emojis strategically placed
       - Bullet points for lists
       - Clear sections with headers
    
    2. Real Estate Post Structure:
       - Property title/headline
       - Key features in bullet points
       - Location highlights
       - Price and availability
       - Contact information
       - Clear call-to-action
    
    3. General Post Structure:
       - Engaging opening line
       - Main content with proper spacing
       - Supporting points or details
       - Call-to-action or conclusion
    
    For type: "response":
    - Provide helpful, conversational answers
    - Include relevant information and context
    - Be professional but friendly
    - No need for post formatting or hashtags
    
    Always include relevant hashtags ONLY for type: "post".`;

    // Format context for the conversation
    console.log(context);
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
      platform: "facebook",
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
        platform: "facebook",
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
      platform: "facebook",
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
    platform: "facebook",
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
