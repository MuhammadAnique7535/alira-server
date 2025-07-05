const express = require("express");
const postGenerationController = require("../controllers/postGenerationController");

const router = express.Router();

// Generate post content
router.post("/generate-post", postGenerationController.generatePost);

module.exports = router;
