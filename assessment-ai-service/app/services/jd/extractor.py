import re
import spacy
from typing import List, Dict, Tuple
from pathlib import Path
from app.core.config import settings
from app.domain.schemas import SkillsAnalysis, QuestionRecommendation
from app.services.llm.gemini_client import gemini_client

class JDExtractor:
    def __init__(self):
        self.taxonomies_path = Path(__file__).parent / "taxonomies"
        self.technical_skills = self._load_taxonomy("skills.txt")
        self.tools_platforms = self._load_taxonomy("tools.txt")
        self.domains = self._load_taxonomy("domains.txt")
        self.soft_skills = self._load_taxonomy("soft_skills.txt")
        
        try:
            self.nlp = spacy.load(settings.SPACY_MODEL)
            self.spacy_available = True
        except OSError:
            print(f"SpaCy model {settings.SPACY_MODEL} not found. Running without NLP.")
            self.nlp = None
            self.spacy_available = False

    def _load_taxonomy(self, filename: str) -> set:
        path = self.taxonomies_path / filename
        if not path.exists():
            return set()
        with open(path, 'r', encoding='utf-8') as f:
            return {line.strip().lower() for line in f if line.strip() and not line.startswith('#')}

    def _enhanced_token_matching(self, text: str, vocabulary: set) -> List[str]:
        text_lower = text.lower()
        
        if self.spacy_available and self.nlp:
            doc = self.nlp(text_lower)
            tokens = {token.lemma_ for token in doc if not token.is_stop and not token.is_punct}
        else:
            tokens = set(re.findall(r'[a-zA-Z\+\#\.]+', text_lower))
        
        matches = []
        for term in vocabulary:
            term_clean = re.sub(r'[^a-zA-Z]', '', term.lower())
            if term_clean in tokens or any(term_clean in token for token in tokens):
                matches.append(term)
                
        return sorted(set(matches))

    def _infer_experience_level(self, text: str) -> str:
        text_lower = text.lower()
        
        years_experience = 0
        if self.spacy_available:
            doc = self.nlp(text)
            for ent in doc.ents:
                if ent.label_ == "CARDINAL":
                    if ent.end < len(doc) and "year" in doc[ent.end].text.lower():
                        try:
                            years = int(ent.text.replace('+', '').strip())
                            years_experience = max(years_experience, years)
                        except:
                            pass
        
        if re.search(r'\b(principal|staff|executive|director|head of)\b', text_lower):
            return 'executive'
        elif years_experience >= 5 or re.search(r'\b(senior|sr\.?|lead|5\+\s*years)\b', text_lower):
            return 'senior'
        elif years_experience <= 2 or re.search(r'\b(junior|entry|graduate|0-2\s*years)\b', text_lower):
            return 'entry'
        else:
            return 'mid'

    def _infer_complexity(self, skills_count: int, text: str) -> str:
        text_lower = text.lower()
        score = skills_count
        
        if re.search(r'\b(distributed|scalable|high\s*availability|low\s*latency)\b', text_lower):
            score += 2
        if re.search(r'\b(architecture|system\s*design|microservices)\b', text_lower):
            score += 2
        if re.search(r'\b(ml|machine\s*learning|ai|artificial\s*intelligence)\b', text_lower):
            score += 1
            
        if score >= 8:
            return "high"
        elif score >= 4:
            return "medium"
        else:
            return "low"

    def _calculate_confidence(self, technical_skills: List[str], tools: List[str], text: str) -> float:
        total_tokens = len(re.findall(r'\w+', text))
        skill_density = (len(technical_skills) + len(tools)) / max(1, total_tokens / 5)
        
        base_confidence = min(0.95, max(0.3, skill_density))
        
        if self.spacy_available:
            base_confidence = min(0.98, base_confidence + 0.1)
            
        return base_confidence

    def _extract_requirements(self, text: str) -> Dict[str, List[str]]:
        must_have = []
        nice_to_have = []
        
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            line_lower = line.lower()
            if any(keyword in line_lower for keyword in ['must', 'required', 'require', 'essential', 'mandatory']):
                must_have.append(line)
            elif any(keyword in line_lower for keyword in ['preferred', 'nice to have', 'bonus', 'plus']):
                nice_to_have.append(line)
            elif len(must_have) <= len(nice_to_have):
                must_have.append(line)
            else:
                nice_to_have.append(line)
                
        return {
            "must_have": must_have[:10],
            "nice_to_have": nice_to_have[:10]
        }

    def _get_question_recommendations(self, experience_level: str, skills: List[str]) -> List[QuestionRecommendation]:
        base_recommendations = {
            "entry": [
                QuestionRecommendation(category="mcq", count=10, difficulty="BEGINNER"),
                QuestionRecommendation(category="coding", count=6, difficulty="BEGINNER"),
                QuestionRecommendation(category="debugging", count=2, difficulty="BEGINNER"),
            ],
            "mid": [
                QuestionRecommendation(category="coding", count=8, difficulty="INTERMEDIATE"),
                QuestionRecommendation(category="mcq", count=6, difficulty="INTERMEDIATE"),
                QuestionRecommendation(category="debugging", count=4, difficulty="INTERMEDIATE"),
                QuestionRecommendation(category="system_design", count=2, difficulty="INTERMEDIATE"),
            ],
            "senior": [
                QuestionRecommendation(category="system_design", count=6, difficulty="ADVANCED"),
                QuestionRecommendation(category="coding", count=6, difficulty="ADVANCED"),
                QuestionRecommendation(category="debugging", count=4, difficulty="ADVANCED"),
                QuestionRecommendation(category="architecture", count=2, difficulty="ADVANCED"),
            ],
            "executive": [
                QuestionRecommendation(category="architecture", count=6, difficulty="EXPERT"),
                QuestionRecommendation(category="system_design", count=4, difficulty="EXPERT"),
                QuestionRecommendation(category="leadership", count=4, difficulty="ADVANCED"),
                QuestionRecommendation(category="coding", count=2, difficulty="ADVANCED"),
            ]
        }
        
        recommendations = base_recommendations.get(experience_level, base_recommendations["mid"])
        
        if any(skill in skills for skill in ["docker", "kubernetes", "aws", "gcp", "azure"]):
            recommendations.append(QuestionRecommendation(category="devops", count=2, difficulty="INTERMEDIATE"))
            
        return recommendations

    async def analyze_job_description(self, job_description: str, job_title: str = None, use_gemini: bool = True) -> Tuple[SkillsAnalysis, Dict[str, List[str]]]:
        full_text = f"{job_title or ''} {job_description}"
        
        technical_skills = self._enhanced_token_matching(full_text, self.technical_skills)
        tools_platforms = self._enhanced_token_matching(full_text, self.tools_platforms)
        domains = self._enhanced_token_matching(full_text, self.domains)
        soft_skills = self._enhanced_token_matching(full_text, self.soft_skills)
        
        gemini_insights = {}
        if use_gemini and settings.GOOGLE_API_KEY:
            try:
                gemini_insights = await gemini_client.extract_skills_advanced(job_description)
                
                if "technical_skills" in gemini_insights:
                    technical_skills = list(set(technical_skills + gemini_insights.get("technical_skills", [])))
                if "domains" in gemini_insights:
                    domains = list(set(domains + gemini_insights.get("domains", [])))
                if "key_technologies" in gemini_insights:
                    key_techs = gemini_insights.get("key_technologies", [])
                    if key_techs:
                        technical_skills = key_techs + [s for s in technical_skills if s not in key_techs]
                    
            except Exception as e:
                print(f"Gemini extraction failed: {e}")

        experience_level = self._infer_experience_level(full_text)
        complexity_level = self._infer_complexity(len(technical_skills) + len(tools_platforms), full_text)
        
        confidence = self._calculate_confidence(technical_skills, tools_platforms, full_text)
        
        question_recommendations = self._get_question_recommendations(experience_level, technical_skills)
        
        requirements = self._extract_requirements(job_description)
        
        analysis = SkillsAnalysis(
            technical_skills=technical_skills,
            experience_level=experience_level,
            domains=domains or ["backend"],
            soft_skills=list(soft_skills),
            tools_platforms=tools_platforms,
            confidence_score=round(confidence, 2),
            job_complexity=complexity_level,
            primary_domain=domains[0] if domains else "backend",
            key_technologies=technical_skills[:8],
            question_recommendations=question_recommendations
        )
        
        return analysis, requirements

# Singleton instance
jd_extractor = JDExtractor()