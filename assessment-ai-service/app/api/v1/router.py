from fastapi import APIRouter
from app.api.v1.routes import jd, chatbot, skills, skill_radar

v1_router = APIRouter()

# Include all route modules
v1_router.include_router(jd.router, prefix="/jd", tags=["Job Description Parsing"])
v1_router.include_router(chatbot.router, prefix="/chatbot", tags=["Assessment Chatbot"])
v1_router.include_router(skills.router, prefix="/skills", tags=["Skills Extraction"])
v1_router.include_router(skill_radar.router, prefix="/skill-radar", tags=["Skill Radar"])

# Later : add router for admin or debug routes if needed
# Later : add rate-limiting or API key validation middleware per router
