import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print(" GEMINI_API_KEY not found")
    exit(1)

print("=" * 70)
print("LISTING ALL AVAILABLE GEMINI MODELS")
print("=" * 70)

try:
    genai.configure(api_key=api_key)
    
    print("\n Available models that support 'generateContent':\n")
    
    found_models = []
    for model in genai.list_models():
        if 'generateContent' in model.supported_generation_methods:
            found_models.append(model)
            print(f" Model Name: {model.name}")
            print(f"   Display Name: {model.display_name}")
            print(f"   Description: {model.description[:100]}...")
            print(f"   Supported Methods: {', '.join(model.supported_generation_methods)}")
            print("-" * 70)
    
    if not found_models:
        print(" No models found that support generateContent")
        print("\nThis might mean:")
        print("1. Your API key doesn't have access to Gemini models")
        print("2. You need to enable Gemini API in Google Cloud Console")
        print("3. Your account/region doesn't support Gemini yet")
    else:
        print(f"\n Found {len(found_models)} model(s)")
        print("\n To use a model, update your .env file:")
        print(f"   AI_MODEL={found_models[0].name.split('/')[-1]}")
        
except Exception as e:
    print(f" Error listing models: {e}")
    print("\nPossible issues:")
    print("1. Invalid API key")
    print("2. Gemini API not enabled in your Google Cloud project")
    print("3. Network/firewall blocking the request")
    print("\n To enable Gemini API:")
    print("   1. Go to: https://console.cloud.google.com/")
    print("   2. Select your project")
    print("   3. Enable 'Generative Language API'")
