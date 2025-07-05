const OpenAI = require("openai");
const { OPENAI_API_KEY } = require("../config/constants");

class PostGenerationService {
  constructor() {
    this.client = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }

  // Generate post content using OpenAI
  async generatePostContent(prompt, context = []) {
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
                description:
                  "Brief explanation of why this platform was chosen",
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
         - "tweak the previous post"
         - "modify the last post"
      2. For ALL other cases, including:
         - Questions
         - General queries
         - Advice requests
         - Comments
         - Discussions
         - When post generation is not explicitly requested
         Return type: "response" with a helpful, conversational reply
      
      Image Handling Rules:
      1. When tweaking or modifying a previous post:
         - ALWAYS check the previous message's image URLs
         - If previous message had image URLs, include them in the response
         - If no previous images, return "empty" for the image field
      2. For new posts:
         - Return "empty" for the image field unless explicitly provided
      
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

      // Extract image URLs from previous messages
      let previousImageUrls = "empty";
      if (context && context.length > 0) {
        const lastMessage = context[context.length - 1];
        if (lastMessage.image && lastMessage.image !== "empty") {
          previousImageUrls = lastMessage.image;
        }
      }

      const contextMessages = context.map((msg) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      }));

      console.log("Context Messages:", contextMessages);

      const messages = [
        { role: "system", content: systemPrompt },
        ...contextMessages,
        {
          role: "user",
          content: `Create content based on this prompt: ${prompt}. Previous image URLs: ${previousImageUrls}`,
        },
      ];

      const response = await this.client.chat.completions.create({
        model: "gpt-4",
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
}

module.exports = new PostGenerationService();
