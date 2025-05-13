# Social Media Post Generator API

A Flask-based API that generates social media posts using OpenAI's GPT model.

## Setup

1. Clone the repository
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file based on `.env.example` and add your OpenAI API key

## Running Locally

```bash
python app.py
```

The server will start on `http://localhost:8080`

## API Usage

### Generate Post

**Endpoint:** `POST /generate-post`

**Request Body:**

```json
{
  "platform": "facebook",
  "prompt": "your prompt text"
}
```

**Response:**

```json
{
  "caption": "Generated post content",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "image": "empty",
  "platform": "facebook",
  "generated_at": "2024-01-01T12:00:00Z",
  "status": "success"
}
```

## Deploying to Google Cloud Platform (GCP)

1. Install the Google Cloud SDK
2. Create a new project in GCP
3. Enable the Cloud Run API
4. Build and deploy:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/post-generator
   gcloud run deploy post-generator --image gcr.io/YOUR_PROJECT_ID/post-generator --platform managed
   ```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `PORT`: Port number for the server (default: 8080)
