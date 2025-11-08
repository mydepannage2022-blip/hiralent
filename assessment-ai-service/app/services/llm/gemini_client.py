import os
import json
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, SystemMessage
from langchain.memory import ConversationBufferMemory
from langchain.chains import LLMChain
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from app.core.config import settings

class GeminiClient:
    def __init__(self):
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
        
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            temperature=0.7,
            google_api_key=settings.GOOGLE_API_KEY,
            max_tokens=2048
        )
        
        self.memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
        
        self.system_prompt = SystemMessage(content="""
        You are an expert technical assessment creator for Hiralent. Your role is to help employers create 
        comprehensive coding assessments for technical roles.
        
        Guidelines:
        - Extract technical skills, tools, and domains from job descriptions accurately
        - Suggest appropriate question types (coding, MCQ, system design, debugging)
        - Recommend difficulty levels based on experience requirements
        - Provide realistic time estimates and question counts
        - Be professional but conversational and helpful
        
        Always structure your responses clearly and ask clarifying questions when needed.
        """)
        
        self.prompt_template = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt.content),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}")
        ])
        
        self.chain = LLMChain(
            llm=self.llm,
            prompt=self.prompt_template,
            memory=self.memory,
            verbose=settings.SERVICE_ENV == "dev"
        )
    
    async def generate_response(self, user_input: str, context: dict = None) -> str:
        try:
            enhanced_input = user_input
            if context:
                context_str = " | ".join([f"{k}: {v}" for k, v in context.items()])
                enhanced_input = f"Context: {context_str}\n\nUser: {user_input}"
            
            response = await self.chain.arun(input=enhanced_input)
            return response.strip()
            
        except Exception as e:
            return f"I apologize, but I encountered an error: {str(e)}. Please try again."

    async def extract_skills_advanced(self, job_description: str) -> dict:
        extraction_prompt = f"""
        Analyze this job description and extract structured information:
        
        JOB DESCRIPTION:
        {job_description}
        
        Please extract and return as valid JSON with these exact keys:
        - "technical_skills": array of specific technical skills mentioned
        - "experience_level": one of ["entry", "mid", "senior", "executive"]
        - "domains": array of domains/industries mentioned  
        - "key_technologies": array of main technologies to focus on
        - "categories": array of suggested assessment categories
        - "confidence_score": float between 0-1 indicating extraction confidence
        
        Return ONLY valid JSON, no other text.
        """
        
        try:
            response = await self.llm.agenerate([[HumanMessage(content=extraction_prompt)]])
            response_text = response.generations[0][0].text
            
            cleaned_response = self._clean_json_response(response_text)
            return self._parse_json_response(cleaned_response)
            
        except Exception as e:
            print(f"Gemini extraction error: {e}")
            return self._get_fallback_response()

    def _clean_json_response(self, response_text: str) -> str:
        import re
        cleaned = re.sub(r'```json\s*|\s*```', '', response_text).strip()
        json_match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if json_match:
            return json_match.group()
        return cleaned

    def _parse_json_response(self, json_text: str) -> dict:
        try:
            return json.loads(json_text)
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            return self._get_fallback_response()

    def _get_fallback_response(self) -> dict:
        return {
            "technical_skills": [],
            "experience_level": "mid",
            "domains": ["backend"],
            "key_technologies": [],
            "categories": ["coding", "mcq"],
            "confidence_score": 0.5
        }

# Singleton instance
gemini_client = GeminiClient()