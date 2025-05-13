from flask import Flask, request, jsonify
from datetime import datetime
import os
from dotenv import load_dotenv
from openai import OpenAI
from dateutil import parser
import httpx
from flask_cors import CORS
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure OpenAI
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    http_client=httpx.Client(
        timeout=30.0,
    )
)

@app.route('/')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'social-media-post-generator'
    })

def generate_post_content(prompt, platform):
    """Generate post content using OpenAI with function calling"""
    try:
        # Define the function schema
        functions = [
            {
                "name": "generate_social_post",
                "description": "Generate a social media post or response based on the prompt",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "enum": ["post", "response"],
                            "description": "Type of content: 'post' for social media posts, 'response' for other content. Make it post only if user provide details for real estate or any post content by make response if user asking questions"
                        },
                        "caption": {
                            "type": "string",
                            "description": "The main content of the post or response message do not add #hashtags in caption"
                        },
                        "hashtags": {
                            "type": "array",
                            "items": {
                                "type": "string"
                            },
                            "description": "Array of hashtags for the post"
                        },
                        "image": {
                            "type": "string",
                            "description": "'empty' if no image"
                        }
                    },
                    "required": ["type", "caption", "hashtags", "image"]
                }
            }
        ]

        system_prompt = f"""You are a social media expert specializing in {platform} content creation.
        Analyze the prompt and determine if it's suitable for creating a social media post.
        If the prompt is not relevant for creating a post, return a response type.
        Always include relevant hashtags for the content."""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Create content based on this prompt: {prompt}"}
            ],
            functions=functions,
            function_call={"name": "generate_social_post"}
        )
        
        # Extract the function call arguments
        function_call = response.choices[0].message.function_call
        if function_call and function_call.name == "generate_social_post":
            return json.loads(function_call.arguments)
        else:
            raise Exception("Failed to generate structured response")
            
    except Exception as e:
        return {
            "type": "response",
            "caption": f"Error generating content: {str(e)}",
            "hashtags": [],
            "image": "empty"
        }

@app.route('/generate-post', methods=['POST'])
def generate_post():
    try:
        data = request.get_json()
        
        if not data or 'platform' not in data or 'prompt' not in data:
            return jsonify({
                'type': 'response',
                'caption': 'Missing required fields',
                'hashtags': [],
                'image': 'empty',
                'status': 'error',
                'generated_at': datetime.now().isoformat()
            }), 400

        platform = data['platform']
        prompt = data['prompt']

        # Generate content using OpenAI
        generated_content = generate_post_content(prompt, platform)
        
        # Add metadata to the response
        response = {
            **generated_content,
            'platform': platform,
            'generated_at': datetime.now().isoformat(),
            'status': 'success'
        }

        return jsonify(response), 200

    except Exception as e:
        return jsonify({
            'type': 'response',
            'caption': f'Error: {str(e)}',
            'hashtags': [],
            'image': 'empty',
            'status': 'error',
            'generated_at': datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080))) 