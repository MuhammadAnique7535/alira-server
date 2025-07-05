# Social Media Post Generator API

A Node.js-based API that generates and schedules social media posts using OpenAI's GPT model and Facebook Graph API.

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   FACEBOOK_APP_ID=your_facebook_app_id
   FACEBOOK_APP_SECRET=your_facebook_app_secret
   FACEBOOK_REDIRECT_URI=your_redirect_uri
   PORT=8080
   ```

## Facebook Authentication

Before using the Facebook post scheduling features, you need to authenticate:

1. Visit `/auth/facebook` endpoint to start the OAuth flow
2. You'll be redirected to Facebook to grant the following permissions:
   - `pages_read_engagement`: Read page engagement data
   - `pages_manage_posts`: Create and manage page posts
   - `pages_show_list`: View pages you manage
   - `publish_to_groups`: Post to groups (if needed)
3. After authentication, you'll be redirected back to your callback URL
4. The access token will be automatically stored for use in post scheduling

## Running Locally

```bash
npm run dev
```

The server will start on `http://localhost:8080`

## API Endpoints

### Health Check

**Endpoint:** `GET /`

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "social-media-post-generator"
}
```

### Generate Post

**Endpoint:** `POST /generate-post`

**Request Body:**

```json
{
  "prompt": "your prompt text",
  "context": [
    {
      "sender": "user",
      "content": "previous message"
    }
  ]
}
```

**Response:**

```json
{
  "type": "post",
  "platform": "facebook",
  "caption": "Generated post content",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "image": "empty",
  "platform_reason": "Platform selection reason",
  "generated_at": "2024-01-01T12:00:00Z",
  "status": "success"
}
```

### Schedule Facebook Post

**Endpoint:** `POST /schedule-facebook-post`

**Request Body:**

```json
{
  "content": "Post content",
  "images": ["https://example.com/image1.jpg"],
  "scheduledTime": "2024-01-01T12:00:00Z"
}
```

**Response:**

```json
{
  "status": "success",
  "postId": "facebook_post_id",
  "scheduledTime": "2024-01-01T12:00:00Z",
  "message": "Post scheduled successfully"
}
```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `FACEBOOK_APP_ID`: Your Facebook App ID
- `FACEBOOK_APP_SECRET`: Your Facebook App Secret
- `FACEBOOK_REDIRECT_URI`: OAuth callback URL (default: http://localhost:8080/auth/facebook/callback)
- `PORT`: Port number for the server (default: 8080)

## Deploying to Vercel

1. Install Vercel CLI:

   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

The API will be automatically deployed to Vercel with the configuration in `vercel.json`.
