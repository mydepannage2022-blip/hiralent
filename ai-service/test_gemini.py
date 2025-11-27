import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

print("=" * 60)
print("GEMINI API KEY TEST")
print("=" * 60)

if not api_key:
    print("❌ GEMINI_API_KEY not found in .env")
    print("   Create .env file with: GEMINI_API_KEY=your_key_here")
    exit(1)

print(f"✅ API Key found: {api_key[:10]}...{api_key[-5:]}")
print(f"   Length: {len(api_key)} characters")

# Try to configure Gemini
try:
    genai.configure(api_key=api_key)
    print("✅ Gemini configured successfully")
except Exception as e:
    print(f"❌ Failed to configure Gemini: {e}")
    exit(1)

# Try to create a model
try:
    model = genai.GenerativeModel('gemini-2.5-flash')  # ← CHANGED: from 'gemini-1.5-flash' to 'gemini-pro'
    print("✅ Model created successfully: gemini-2.5-flash")
except Exception as e:
    print(f"❌ Failed to create model: {e}")
    exit(1)

# Try to generate content
try:
    print("\n📝 Testing content generation...")
    prompt = "Say 'Hello from Gemini!' and nothing else."
    response = model.generate_content(prompt)
    print(f"✅ API Response: {response.text}")
    print("\n" + "=" * 60)
    print("SUCCESS! Gemini API is working!")
    print("=" * 60)
except Exception as e:
    print(f"❌ Failed to generate content: {e}")
    print("\nPossible reasons:")
    print("1. Invalid API key")
    print("2. API quota exceeded")
    print("3. Network/firewall issues")
    print("4. Region restrictions")
    exit(1)