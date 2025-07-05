// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Facebook API configuration
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_SCOPES =
  process.env.FACEBOOK_SCOPES ||
  "pages_read_engagement,pages_manage_posts,pages_show_list,publish_to_groups";
const FACEBOOK_API_VERSION = process.env.FACEBOOK_API_VERSION || "v19.0";

// Instagram API configuration
const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const INSTAGRAM_SCOPES =
  process.env.INSTAGRAM_SCOPES ||
  "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments,pages_read_engagement,pages_manage_posts,pages_show_list";
const INSTAGRAM_API_VERSION = process.env.INSTAGRAM_API_VERSION || "v12.0";
const INSTAGRAM_DEFAULT_IMAGE =
  process.env.INSTAGRAM_DEFAULT_IMAGE ||
  "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

// LinkedIn API configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_SCOPES =
  process.env.LINKEDIN_SCOPES || "openid profile w_member_social";
const LINKEDIN_API_VERSION = process.env.LINKEDIN_API_VERSION || "v2";

// Frontend URL for redirects
const FRONTEND_URL = process.env.FRONTEND_URL || "https://localhost:3000";

// Redirect URIs
const REDIRECT_URI = `${FRONTEND_URL}/facebook-callback`;
const INSTAGRAM_REDIRECT_URI = `${FRONTEND_URL}/instagram-callback`;
const LINKEDIN_REDIRECT_URI = `${FRONTEND_URL}/linkedin-callback`;

// OpenAI configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// CORS origins
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [
      "https://aliraa.vercel.app",
      "https://localhost:3000",
      "http://localhost:3000",
      "https://alira.vercel.app",
      "http://alira.vercel.app",
      "https://localhost:3001",
    ];

module.exports = {
  // Supabase
  SUPABASE_URL,
  SUPABASE_ANON_KEY,

  // Facebook
  FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET,
  FACEBOOK_SCOPES,
  FACEBOOK_API_VERSION,
  REDIRECT_URI,

  // Instagram
  INSTAGRAM_APP_ID,
  INSTAGRAM_APP_SECRET,
  INSTAGRAM_SCOPES,
  INSTAGRAM_API_VERSION,
  INSTAGRAM_REDIRECT_URI,
  INSTAGRAM_DEFAULT_IMAGE,

  // LinkedIn
  LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET,
  LINKEDIN_SCOPES,
  LINKEDIN_API_VERSION,
  LINKEDIN_REDIRECT_URI,

  // OpenAI
  OPENAI_API_KEY,

  // CORS
  ALLOWED_ORIGINS,

  // Frontend
  FRONTEND_URL,
};
