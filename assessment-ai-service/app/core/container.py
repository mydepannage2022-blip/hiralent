from app.services.jd.extractor import jd_extractor
from app.services.chatbot.engine import chatbot_engine
from app.services.skill_radar.service import skill_radar_service
from app.services.llm.gemini_client import gemini_client

class Container:
    def __init__(self):
        self.jd_extractor = jd_extractor
        self.chatbot_engine = chatbot_engine
        self.skill_radar_service = skill_radar_service
        self.gemini_client = gemini_client

# Global container instance
container = Container()

def get_container() -> Container:
    return container