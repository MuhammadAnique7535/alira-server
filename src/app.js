const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import routes
const facebookRoutes = require("./routes/facebookRoutes");
const instagramRoutes = require("./routes/instagramRoutes");
const linkedinRoutes = require("./routes/linkedinRoutes");
const postGenerationRoutes = require("./routes/postGenerationRoutes");

// Import services
const cronJobService = require("./services/cronJobService");

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : [
        "https://aliraa.vercel.app",
        "https://localhost:3000",
        "http://localhost:3000",
        "https://alira.vercel.app",
        "http://alira.vercel.app",
        "https://localhost:3001",
      ],
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "social-media-post-generator",
  });
});

// Use routes
app.use("/", facebookRoutes);
app.use("/", instagramRoutes);
app.use("/", linkedinRoutes);
app.use("/", postGenerationRoutes);

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

  // Start the cron job for processing scheduled posts
  cronJobService.startCronJob();
});

module.exports = app;
