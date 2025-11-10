from uuid import uuid4
from datetime import datetime
from typing import Dict, Tuple
from app.domain.schemas import (
    ChatbotSession, ChatbotMessage, ChatbotResponse, ChatbotStartRequest
)
from app.services.jd.extractor import jd_extractor
from app.services.llm.gemini_client import gemini_client

class ChatbotEngine:
    def __init__(self):
        self.sessions: Dict[str, ChatbotSession] = {}
        
    def _create_assistant_message(self, content: str, message_type: str = "assistant") -> ChatbotMessage:
        return ChatbotMessage(
            id=str(uuid4()),
            type=message_type,
            content=content,
            timestamp=datetime.utcnow()
        )
    
    async def start_session(self, request: ChatbotStartRequest) -> ChatbotSession:
        session_id = f"chat_{uuid4().hex[:8]}"
        
        welcome_message = self._create_assistant_message(
            "👋 Welcome to the Hiralent Assessment Creator!\n\n"
            "I'll help you create a comprehensive technical assessment step by step. "
            "I can analyze job descriptions, suggest skills to test, and recommend "
            "the perfect question mix.\n\n"
            "Let's start with the basics:\n\n"
            "**What's the job title for this position?**"
        )
        
        session = ChatbotSession(
            session_id=session_id,
            company_id=request.company_id,
            job_id=request.job_id,
            messages=[welcome_message],
            current_step="welcome",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            assessment_data=request.initial_data or {}
        )
        
        self.sessions[session_id] = session
        return session
    
    async def process_message(self, session_id: str, user_message: str) -> ChatbotResponse:
        if session_id not in self.sessions:
            raise ValueError("Session not found")
            
        session = self.sessions[session_id]
        
        user_msg = self._create_assistant_message(user_message, "user")
        session.messages.append(user_msg)
        
        reply, is_completed = await self._handle_step_with_ai(session, user_message)
        
        assistant_msg = self._create_assistant_message(reply)
        session.messages.append(assistant_msg)
        session.updated_at = datetime.utcnow()
        
        return ChatbotResponse(
            session=session,
            reply=reply,
            is_completed=is_completed
        )
    
    async def _handle_step_with_ai(self, session: ChatbotSession, user_message: str) -> Tuple[str, bool]:
        if session.current_step == "welcome":
            session.current_step = "job_details"
            ai_response = await gemini_client.generate_response(
                f"The user provided this job title: '{user_message}'. "
                "Ask them for the job description in a friendly, professional way."
            )
            return ai_response, False
            
        elif session.current_step == "job_details":
            try:
                analysis, requirements = await jd_extractor.analyze_job_description(user_message)
                
                session.current_step = "skills_identification"
                session.assessment_data["analysis"] = analysis.dict()
                session.assessment_data["requirements"] = requirements
                
                context = {
                    "skills": ", ".join(analysis.technical_skills[:8]) or "No specific skills detected",
                    "experience_level": analysis.experience_level,
                    "domain": analysis.primary_domain,
                    "confidence": f"{analysis.confidence_score * 100}%"
                }
                
                ai_response = await gemini_client.generate_response(
                    f"I analyzed a job description and found these key points: {context}. "
                    "Present these findings to the user and ask if they want to add/remove any skills.",
                    context
                )
                
                return ai_response, False
                
            except Exception as e:
                error_response = await gemini_client.generate_response(
                    f"The JD analysis failed with error: {str(e)}. "
                    "Ask the user to provide a clearer job description."
                )
                return error_response, False
                
        elif session.current_step == "skills_identification":
            if user_message.lower().strip() in ['ok', 'continue', 'next', 'yes', 'proceed']:
                session.current_step = "assessment_type"
                ai_response = await gemini_client.generate_response(
                    "The user confirmed the skills analysis. "
                    "Now present assessment type options: QUICK_CHECK (screening), COMPREHENSIVE (in-depth), "
                    "CERTIFICATION (formal), COMPANY_SPECIFIC (custom). Ask which type they prefer."
                )
                return ai_response, False
            else:
                ai_response = await gemini_client.generate_response(
                    f"The user provided this input about skills: '{user_message}'. "
                    "Acknowledge their input and ask if they're ready to continue."
                )
                return ai_response, False
                
        elif session.current_step == "assessment_type":
            session.current_step = "difficulty_level"
            ai_response = await gemini_client.generate_response(
                f"The user selected this assessment type: '{user_message}'. "
                "Now present difficulty levels: BEGINNER (entry-level), INTERMEDIATE (mid-level), "
                "ADVANCED (senior-level), EXPERT (architecture/lead). Ask which difficulty level they want."
            )
            return ai_response, False
            
        elif session.current_step == "difficulty_level":
            session.current_step = "review"
            
            summary_context = {
                "assessment_type": "From previous step",
                "difficulty": user_message,
                "status": "Ready for final review"
            }
            
            ai_response = await gemini_client.generate_response(
                "Present a comprehensive assessment summary to the user and ask for final confirmation.",
                summary_context
            )
            return ai_response, False
            
        elif session.current_step == "review":
            if user_message.lower() in ['confirm', 'yes', 'create', 'generate']:
                session.current_step = "completed"
                
                final_response = await gemini_client.generate_response(
                    "The user confirmed the assessment creation. "
                    "Provide a celebratory completion message that thanks the user, "
                    "summarizes what was created, and explains next steps."
                )
                return final_response, True
            else:
                session.current_step = "welcome"
                restart_response = await gemini_client.generate_response(
                    "The user wants to start over. Politely restart the conversation."
                )
                return restart_response, False
                
        else:
            reset_response = await gemini_client.generate_response(
                "The conversation reached an unknown state. Reset and ask for the job title."
            )
            session.current_step = "welcome"
            return reset_response, False

# Singleton instance
chatbot_engine = ChatbotEngine()