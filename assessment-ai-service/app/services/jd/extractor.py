import re
import spacy
from typing import List, Dict, Tuple, Set, Any, Optional
from pathlib import Path

from app.core.config import settings
from app.domain.schemas import SkillsAnalysis, QuestionRecommendation
from app.services.llm.gemini_client import gemini_client


class JDExtractor:
    """
    JDExtractor = JD → structured SkillsAnalysis + requirements.

    Design:
    - Primary extraction: Gemini (LLM) returns structured JSON.
    - Local layer (spaCy + taxonomies + regex) is used for:
        - fallback when Gemini is unavailable or broken
        - sanity checks
        - experience_level / complexity baseline
        - job_type / education_level / remote_option / department
    - Final SkillsAnalysis is a MERGE of Gemini + local signals,
      with clear precedence rules.
    """

    # Hard caps to keep outputs stable & safe
    MAX_TECH_SKILLS = 40
    MAX_TOOLS = 25
    MAX_DOMAINS = 10
    MAX_SOFT_SKILLS = 20
    MAX_KEY_TECH = 8
    MAX_REQ_ITEMS = 30

    def __init__(self) -> None:
        self.taxonomies_path = Path(__file__).parent / "taxonomies"

        # Optional: taxonomies are helpers, not mandatory
        self.technical_skills_vocab = self._load_taxonomy("skills.txt")
        self.tools_vocab = self._load_taxonomy("tools.txt")
        self.domains_vocab = self._load_taxonomy("domains.txt")
        self.soft_skills_vocab = self._load_taxonomy("soft_skills.txt")

        # Try to load spaCy model (optional, graceful fallback)
        try:
            self.nlp = spacy.load(settings.SPACY_MODEL)
            self.spacy_available = True
        except Exception:
            print(
                f"[JDExtractor] SpaCy model '{settings.SPACY_MODEL}' not found. "
                "Running with regex-only local heuristics."
            )
            self.nlp = None
            self.spacy_available = False

    # =========================
    # Taxonomy loading
    # =========================

    def _load_taxonomy(self, filename: str) -> Set[str]:
        path = self.taxonomies_path / filename
        if not path.exists():
            return set()
        with open(path, "r", encoding="utf-8") as f:
            return {
                line.strip().lower()
                for line in f
                if line.strip() and not line.strip().startswith("#")
            }

    # =========================
    # Local NLP helpers
    # =========================

    def _token_set(self, text_lower: str) -> Set[str]:
        """
        Return a set of normalized tokens (lemmas if spaCy is available).
        """
        if self.spacy_available and self.nlp:
            try:
                doc = self.nlp(text_lower)
                return {
                    token.lemma_.lower()
                    for token in doc
                    if not token.is_stop and not token.is_punct and token.text.strip()
                }
            except Exception:
                pass

        return {
            t.lower()
            for t in re.findall(r"[a-zA-Z0-9\+\#\.]+", text_lower)
            if t.strip()
        }

    def _enhanced_token_matching(self, text: str, vocabulary: Set[str]) -> List[str]:
        if not vocabulary:
            return []
        text_lower = text.lower()
        tokens = self._token_set(text_lower)
        matches: Set[str] = set()
        for term in vocabulary:
            norm = term.lower().strip()
            if not norm:
                continue
            norm_spaces = norm.replace("_", " ")
            if " " in norm_spaces:
                pattern = r"\b" + re.escape(norm_spaces).replace(r"\ ", r"\s+") + r"\b"
                if re.search(pattern, text_lower):
                    matches.add(term)
                    continue
            if norm in tokens or norm_spaces in tokens:
                matches.add(term)
                continue
            norm_clean = re.sub(r"[^a-z0-9]+", "", norm_spaces)
            if norm_clean and any(
                norm_clean == re.sub(r"[^a-z0-9]+", "", tok) for tok in tokens
            ):
                matches.add(term)
        return sorted(matches)

    def _infer_experience_level(self, text: str) -> str:
        text_lower = text.lower()
        years_experience = 0
        year_matches = re.findall(r"(\d+)\+?\s*(?:years|yrs|ans)", text_lower)
        for y in year_matches:
            try:
                years_experience = max(years_experience, int(y))
            except ValueError:
                continue

        # Executive titles win
        if re.search(r"\b(principal|staff|executive|director|head of|vp)\b", text_lower):
            return "executive"

        # Senior ≥5 years or explicit senior wording
        if years_experience >= 5 or re.search(
            r"\b(senior|sr\.?|lead|expert|5\+\s*years)\b", text_lower
        ):
            return "senior"

        # Entry: explicit junior OR <=1 year
        if years_experience <= 1 or re.search(
            r"\b(junior|entry|graduate|0-2\s*years)\b", text_lower
        ):
            return "entry"

        # Otherwise → mid
        return "mid"

    def _infer_complexity(self, skills_count: int, text: str) -> str:
        text_lower = text.lower()
        score = skills_count
        if re.search(
            r"\b(distributed|scalable|high\s*availability|low\s*latency|high\s*traffic)\b",
            text_lower,
        ):
            score += 2
        if re.search(
            r"\b(architecture|system\s*design|microservices|event[-\s]*driven)\b",
            text_lower,
        ):
            score += 2
        if re.search(
            r"\b(ml|machine\s*learning|ai|artificial\s*intelligence|deep\s*learning)\b",
            text_lower,
        ):
            score += 1
        if score >= 8:
            return "high"
        elif score >= 4:
            return "medium"
        return "low"

    def _domain_fallback_from_text(self, text: str) -> str:
        t = text.lower()
        if "full stack" in t or "full-stack" in t or "fullstack" in t:
            return "fullstack"
        if any(k in t for k in ["frontend", "front-end", "front end", "react", "vue", "angular", "javascript"]):
            if any(
                k in t
                for k in ["backend", "api", "microservices", "database", "sql", "python", "java"]
            ):
                return "fullstack"
            return "frontend"
        if any(
            k in t
            for k in [
                "data engineer",
                "data scientist",
                "data science",
                "ml engineer",
                "machine learning",
                "ai engineer",
                "artificial intelligence",
            ]
        ):
            return "data"
        if any(k in t for k in ["devops", "sre", "site reliability", "platform engineer"]):
            return "devops"
        if any(k in t for k in ["mobile", "android", "ios", "react native", "flutter"]):
            return "mobile"
        if any(k in t for k in ["e-commerce", "ecommerce"]):
            return "ecommerce"
        return "general"

    # =========================
    # ✅ CONFIDENCE FUNCTION
    # =========================
    def _calculate_confidence(
        self,
        technical_skills: List[str],
        tools: List[str],
        text: str,
        gemini_conf: Optional[float] = None
    ) -> float:
        """
        Confidence model:
        - If Gemini provided a valid confidence_score → trust Gemini (primary signal).
        - Otherwise fall back to a simple richness score based on local extraction.
        """

        # 1) Use Gemini confidence when available
        if gemini_conf is not None:
            return round(min(0.98, max(0.50, gemini_conf)), 2)

        # 2) Local fallback
        richness = len(technical_skills) + len(tools)

        if richness >= 25:
            return 0.85
        elif richness >= 15:
            return 0.75
        elif richness >= 8:
            return 0.65
        elif richness >= 4:
            return 0.55

        return 0.50

    # =========================
    # Requirements extraction
    # =========================

    def _extract_requirements(self, text: str) -> Dict[str, List[str]]:
        must_have: List[str] = []
        nice_to_have: List[str] = []

        lines = text.split("\n")

        must_section_markers = [
            "responsibilities", "what you'll do", "what you will do",
            "key responsibilities", "duties", "requirements",
            "required qualifications", "minimum qualifications",
            "you have", "you bring", "about you", "must have",
            "this role requires", "required", "require", "expected to",
            "you must be able"
        ]

        nice_section_markers = [
            "preferred qualifications", "preferred skills", "nice to have",
            "nice-to-have", "bonus", "bonus points", "big plus",
            "would be a plus", "good to have"
        ]

        must_inline_markers = [
            "must ", "must-have", "required", "require ", "essential", "mandatory"
        ]

        nice_inline_markers = [
            "preferred", "nice to have", "nice-to-have", "bonus", "plus",
            "would be a plus", "good to have"
        ]

        current_section: Optional[str] = None

        def is_bullet(l: str) -> bool:
            stripped = l.strip()
            return stripped.startswith(("-", "•", "*"))

        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                continue

            line_lower = line.lower()
            is_heading_candidate = (
                not is_bullet(line)
                and (line.endswith(":") or len(line.split()) <= 5)
            )

            if is_heading_candidate:
                heading_no_colon = (
                    line_lower[:-1] if line_lower.endswith(":") else line_lower
                )
                if any(m in heading_no_colon for m in must_section_markers):
                    current_section = "must"
                    must_have.append(line)
                    continue
                if any(m in heading_no_colon for m in nice_section_markers):
                    current_section = "nice"
                    nice_to_have.append(line)
                    continue

            if current_section == "must":
                must_have.append(line)
                continue

            if current_section == "nice":
                nice_to_have.append(line)
                continue

            if any(marker in line_lower for marker in must_inline_markers):
                must_have.append(line)
                continue

            if any(marker in line_lower for marker in nice_inline_markers):
                nice_to_have.append(line)
                continue

            if len(must_have) <= len(nice_to_have):
                must_have.append(line)
            else:
                nice_to_have.append(line)

        return {
            "must_have": must_have[: self.MAX_REQ_ITEMS],
            "nice_to_have": nice_to_have[: self.MAX_REQ_ITEMS],
        }

    # =========================
    # Question recommendations
    # =========================

    def _is_it_profile(self, skills: List[str]) -> bool:
        """
        Very lightweight heuristic to decide if this is an IT / tech profile.

        We only activate CODING questions when we clearly see tech stack signals.
        """
        if not skills:
            return False

        it_markers = {
            "python", "java", "javascript", "typescript", "c#",
            "c++", "php", "ruby", "go", "golang", "node.js",
            "nodejs", "react", "angular", "vue", "django",
            "flask", "fastapi", "spring", "kotlin", "swift",
            "sql", "postgresql", "mysql", "mongodb", "redis",
            "machine learning", "ml", "deep learning", "data science",
            "devops", "kubernetes", "docker", "aws", "gcp", "azure",
        }

        skills_lower = {s.lower() for s in skills if isinstance(s, str)}
        for marker in it_markers:
            for skill in skills_lower:
                if marker in skill:
                    return True
        return False

    def _get_question_recommendations(
        self, experience_level: str, skills: List[str]
    ) -> List[QuestionRecommendation]:
        """
        NEW LOGIC:

        - Only TWO categories are allowed globally:
            * "mcq"    → always present for all domains
            * "coding" → ONLY for IT profiles (software / data / devops ...)
        """

        is_it = self._is_it_profile(skills)
        recommendations: List[QuestionRecommendation] = []

        # 1) MCQ for everyone (always)
        if experience_level == "entry":
            recommendations.append(
                QuestionRecommendation(category="mcq", count=10, difficulty="BEGINNER")
            )
        elif experience_level == "mid":
            recommendations.append(
                QuestionRecommendation(category="mcq", count=8, difficulty="INTERMEDIATE")
            )
        elif experience_level == "senior":
            recommendations.append(
                QuestionRecommendation(category="mcq", count=8, difficulty="ADVANCED")
            )
        elif experience_level == "executive":
            recommendations.append(
                QuestionRecommendation(category="mcq", count=6, difficulty="ADVANCED")
            )
        else:
            # Fallback
            recommendations.append(
                QuestionRecommendation(category="mcq", count=8, difficulty="INTERMEDIATE")
            )

        # 2) CODING only for IT profiles
        if is_it:
            if experience_level == "entry":
                recommendations.append(
                    QuestionRecommendation(
                        category="coding", count=5, difficulty="BEGINNER"
                    )
                )
            elif experience_level == "mid":
                recommendations.append(
                    QuestionRecommendation(
                        category="coding", count=6, difficulty="INTERMEDIATE"
                    )
                )
            elif experience_level == "senior":
                recommendations.append(
                    QuestionRecommendation(
                        category="coding", count=6, difficulty="ADVANCED"
                    )
                )
            elif experience_level == "executive":
                recommendations.append(
                    QuestionRecommendation(
                        category="coding", count=4, difficulty="ADVANCED"
                    )
                )
            else:
                recommendations.append(
                    QuestionRecommendation(
                        category="coding", count=5, difficulty="INTERMEDIATE"
                    )
                )

        # Safety: keep at most 10 items
        return recommendations[:10]

    def _normalize_list(self, items: List[str]) -> List[str]:
        """
        Normalize list of strings:
        - strip whitespace
        - lowercase + normalize spaces/dashes/underscores for dedup key
        - preserve original casing of first occurrence
        """
        seen = set()
        result: List[str] = []
        for item in items:
            if not isinstance(item, str):
                continue
            val = item.strip()
            if not val:
                continue
            key = val.lower()
            key = key.replace("_", " ")
            key = re.sub(r"[\s\-]+", " ", key).strip()
            if key in seen:
                continue
            seen.add(key)
            result.append(val)
        return result

    # -----------------------
    # Extra inferred context
    # -----------------------

    def _infer_job_type(self, text: str) -> Optional[str]:
        t = text.lower()
        # 1) Explicit full-time / CDI first
        if "cdi" in t or "permanent" in t or "full-time" in t or "full time" in t:
            return "full_time"
        # 2) Internships
        if "intern" in t or "internship" in t:
            return "internship"
        # 3) Part-time
        if "part-time" in t or "part time" in t:
            return "part_time"
        # 4) Contract / freelance
        if "contract" in t or "freelance" in t:
            return "contract"
        return None

    def _infer_education_level(self, text: str) -> Optional[str]:
        t = text.lower()
        if "phd" in t or "doctorat" in t:
            return "phd"
        if "master" in t or "msc" in t or "bac+5" in t:
            return "master"
        if "bachelor" in t or "licence" in t or "bac+3" in t:
            return "bachelor"
        if "high school" in t or "baccalauréat" in t:
            return "high_school"
        return None

    def _infer_remote_option(self, text: str) -> Optional[str]:
        t = text.lower()
        # Remote-friendly special case
        if "remote-friendly" in t:
            return "hybrid"
        if "remote" in t:
            return "fully_remote"
        if "hybrid" in t:
            return "hybrid"
        if "on-site" in t or "on site" in t or "office-based" in t:
            return "office_only"
        return None

    def _infer_department(self, text: str) -> Optional[str]:
        t = text.lower()

        # AI / Data
        if any(k in t for k in ["data scientist", "data science", "ml engineer", "ai engineer"]):
            return "AI / Data"

        # Frontend / UI Engineering
        if any(k in t for k in ["frontend", "front-end", "front end", "ui engineer", "frontend developer"]):
            return "Frontend / Engineering"

        # Backend / Full-Stack / General Software Engineering
        if any(k in t for k in ["backend", "software engineer", "full stack", "full-stack"]):
            return "Engineering"

        # DevOps / Platform
        if "devops" in t or "sre" in t or "platform engineer" in t:
            return "DevOps / Platform"

        # Product org (non-engineering)
        if "product manager" in t or "product management" in t:
            return "Product"

        # Product Engineering (mix of product + eng)
        if "product engineering" in t:
            return "Product Engineering"

        return None

    # -----------------------
    # Tools filtering
    # -----------------------

    def _filter_tools_by_text(self, text: str, tools: List[str]) -> List[str]:
        """
        Keep only tools that actually appear (roughly) in the JD text,
        to avoid hallucinated tools like 'AWS S3' on a pure frontend role.
        """
        t = text.lower().replace(" ", "")
        filtered: List[str] = []
        for tool in tools:
            if not isinstance(tool, str):
                continue
            tool_norm = tool.lower().replace(" ", "")
            if tool_norm and tool_norm in t:
                filtered.append(tool)
        return filtered

    # -----------------------
    # Stack booster
    # -----------------------

    def _boost_explicit_stack_signals(
        self,
        text: str,
        technical_skills: List[str],
        tools_platforms: List[str],
    ) -> Tuple[List[str], List[str]]:
        t = text.lower()
        tech_add: List[str] = []
        tools_add: List[str] = []

        def add_tech(name: str) -> None:
            if name not in technical_skills and name not in tech_add:
                tech_add.append(name)

        def add_tool(name: str) -> None:
            if name not in tools_platforms and name not in tools_add:
                tools_add.append(name)

        # Languages / frameworks → technical_skills
        if "python" in t:
            add_tech("Python")
        if "fastapi" in t:
            add_tech("FastAPI")
        if "node.js" in t or "nodejs" in t or "node js" in t:
            add_tech("Node.js")
        if "typescript" in t:
            add_tech("TypeScript")
        if "react" in t:
            add_tech("React")
        if "graphql" in t:
            add_tech("GraphQL")
        if "rest" in t:
            add_tech("REST APIs")

        # ML / data libs
        if "tensorflow" in t:
            add_tech("TensorFlow")
        if "pytorch" in t:
            add_tech("PyTorch")
        if "scikit-learn" in t or "scikit learn" in t:
            add_tech("Scikit-learn")

        # Datastores / infra → tools_platforms
        if "postgresql" in t:
            add_tool("PostgreSQL")
        if "mongodb" in t:
            add_tool("MongoDB")
        if "redis" in t:
            add_tool("Redis")
        if "kafka" in t:
            add_tool("Kafka")
        if "rabbitmq" in t:
            add_tool("RabbitMQ")

        # Cloud & services
        if "aws" in t:
            add_tool("AWS")
        if "ec2" in t:
            add_tool("AWS EC2")
        if "s3" in t:
            add_tool("AWS S3")
        if "lambda" in t:
            add_tool("AWS Lambda")
        if "eks" in t:
            add_tool("AWS EKS")

        # DevOps / MLOps
        if "docker" in t:
            add_tool("Docker")
        if "kubernetes" in t:
            add_tool("Kubernetes")
        if "jenkins" in t:
            add_tool("Jenkins")
        if "github actions" in t:
            add_tool("GitHub Actions")
        if "terraform" in t:
            add_tool("Terraform")
        if "mlflow" in t:
            add_tool("MLflow")
        if "spark" in t:
            add_tool("Spark")
        if "prometheus" in t:
            add_tool("Prometheus")
        if "grafana" in t:
            add_tool("Grafana")
        if " elk" in t or "elk " in t:
            add_tool("ELK")

        # Frontend-specific as technical_skills
        if "next.js" in t or "nextjs" in t or "next js" in t:
            add_tech("Next.js")
        if "tailwindcss" in t or "tailwind css" in t or "tailwind" in t:
            add_tech("Tailwind CSS")
        if "redux" in t:
            add_tech("Redux")
        if "zustand" in t:
            add_tech("Zustand")
        if "recoil" in t:
            add_tech("Recoil")
        if "jest" in t:
            add_tech("Jest")
        if "cypress" in t:
            add_tech("Cypress")
        if "testing library" in t:
            add_tech("Testing Library")
        if "storybook" in t:
            add_tech("Storybook")
        if "material ui" in t or "mui" in t:
            add_tech("Material UI")
        if "chakra ui" in t:
            add_tech("Chakra UI")

        # Frontend dev tooling as tools_platforms
        if "git" in t:
            add_tool("Git")
        if "github" in t:
            add_tool("GitHub")
        if "gitlab" in t:
            add_tool("GitLab")
        if "ci/cd" in t or "ci cd" in t or "ci/cd pipelines" in t or "ci/cd pipeline" in t:
            add_tool("CI/CD pipelines")
        if "storybook" in t:
            add_tool("Storybook")
        if "material ui" in t or "mui" in t:
            add_tool("Material UI")
        if "chakra ui" in t:
            add_tool("Chakra UI")
        if "jest" in t:
            add_tool("Jest")
        if "cypress" in t:
            add_tool("Cypress")
        if "testing library" in t:
            add_tool("Testing Library")
        
        if "express" in t:
            add_tech("Express.js")
        if "nestjs" in t:
            add_tech("NestJS")
        if "microservices" in t:
            add_tech("Microservices")
        if "event-driven" in t or "event driven" in t:
            add_tech("Event-driven architecture")
        if "oauth2" in t:
            add_tech("OAuth2")
        if "jwt" in t:
            add_tech("JWT")


        if tech_add:
            technical_skills = list(dict.fromkeys(technical_skills + tech_add))
        if tools_add:
            tools_platforms = list(dict.fromkeys(tools_platforms + tools_add))

        return technical_skills, tools_platforms

    # -----------------------
    # Key technologies selector
    # -----------------------

    def _select_key_technologies(
        self,
        technical_skills: List[str],
        candidate_keys: Optional[List[str]] = None,
    ) -> List[str]:
        """
        Clean and prioritize key_technologies from candidate list + technical_skills.
        """
        # Things we NEVER want as "key"
        ban = {"agile", "testing", "seo", "git", "github", "gitlab", "rest"}

        def clean_list(lst: List[str]) -> List[str]:
            seen = set()
            out: List[str] = []
            for x in lst:
                if not isinstance(x, str):
                    continue
                v = x.strip()
                if not v:
                    continue
                low = v.lower()
                if low in ban or low in seen:
                    continue
                seen.add(low)
                out.append(v)
            return out

        # Prefer Gemini keys if they exist, but clean them
        if candidate_keys:
            base = clean_list(candidate_keys)
        else:
            base = []

        # If not enough, complete from technical_skills, prioritizing languages/frameworks
        priority_order = [
            "React", "Next.js", "TypeScript", "JavaScript",
            "HTML5", "CSS3", "Tailwind CSS",
            "REST APIs", "GraphQL",
            "Python", "Node.js", "Django", "FastAPI",
        ]
        tech_set = {t for t in technical_skills if isinstance(t, str)}

        for p in priority_order:
            if p in tech_set and p not in base:
                base.append(p)

        return base[: self.MAX_KEY_TECH]

    # =========================
    # Main entry
    # =========================

    async def analyze_job_description(
        self,
        job_description: str,
        job_title: str = None,
        use_gemini: bool = True,
    ) -> Tuple[SkillsAnalysis, Dict[str, List[str]]]:

        full_text = f"{job_title or ''}\n{job_description}".strip()

        # -----------------------------------
        # 1) Local baseline
        # -----------------------------------
        local_tech = self._enhanced_token_matching(full_text, self.technical_skills_vocab)
        local_tools = self._enhanced_token_matching(full_text, self.tools_vocab)
        local_domains = self._enhanced_token_matching(full_text, self.domains_vocab)
        local_soft = self._enhanced_token_matching(full_text, self.soft_skills_vocab)

        base_experience_level = self._infer_experience_level(full_text)
        base_complexity_level = self._infer_complexity(
            len(local_tech) + len(local_tools), full_text
        )

        inferred_job_type = self._infer_job_type(full_text)
        inferred_education = self._infer_education_level(full_text)
        inferred_remote = self._infer_remote_option(full_text)
        inferred_department = self._infer_department(full_text)

        requirements = self._extract_requirements(job_description)

        baseline_questions = self._get_question_recommendations(
            base_experience_level, local_tech
        )

        primary_domain_local: Optional[str] = (
            local_domains[0] if local_domains else self._domain_fallback_from_text(full_text)
        )

        technical_skills: List[str] = list(local_tech)
        tools_platforms: List[str] = list(local_tools)
        domains: List[str] = list(local_domains) if local_domains else []
        key_technologies: List[str] = []
        experience_level = base_experience_level
        complexity_level = base_complexity_level
        question_recommendations = baseline_questions
        primary_domain: Optional[str] = primary_domain_local
        gemini_conf: Optional[float] = None

        # -----------------------------------
        # 2) Gemini enrichment
        # -----------------------------------
        if use_gemini and settings.GOOGLE_API_KEY:
            try:
                gemini_insights: Dict[str, Any] = await gemini_client.extract_skills_advanced(
                    job_description=job_description,
                    job_title=job_title,
                )
                g_tech = gemini_insights.get("technical_skills") or []
                if isinstance(g_tech, list):
                    technical_skills = list(dict.fromkeys(g_tech + technical_skills))

                g_tools = gemini_insights.get("tools_platforms") or []
                if isinstance(g_tools, list):
                    tools_platforms = list(dict.fromkeys(g_tools + tools_platforms))

                g_domains = gemini_insights.get("domains") or []
                if isinstance(g_domains, list):
                    domains = list(dict.fromkeys(g_domains + domains))

                g_exp = gemini_insights.get("experience_level")
                if g_exp in {"entry", "mid", "senior", "executive"}:
                    priority = {"entry": 0, "mid": 1, "senior": 2, "executive": 3}
                    if priority[g_exp] >= priority[base_experience_level]:
                        experience_level = g_exp

                g_complexity = gemini_insights.get("job_complexity")
                if g_complexity in {"low", "medium", "high"}:
                    cpriority = {"low": 0, "medium": 1, "high": 2}
                    if cpriority[g_complexity] >= cpriority[base_complexity_level]:
                        complexity_level = g_complexity

                g_primary_domain = gemini_insights.get("primary_domain")
                if isinstance(g_primary_domain, str) and g_primary_domain.strip():
                    primary_domain = g_primary_domain.strip()
                    domains = list(dict.fromkeys([primary_domain] + domains))

                g_key = gemini_insights.get("key_technologies")
                if isinstance(g_key, list) and g_key:
                    key_technologies = [s for s in g_key if isinstance(s, str) and s.strip()]
                else:
                    key_technologies = technical_skills

                # We IGNORE Gemini's question_recommendations on purpose
                # and always use our local logic to force only [mcq, coding].

                g_conf = gemini_insights.get("confidence_score")
                try:
                    if g_conf is not None:
                        gemini_conf = float(g_conf)
                except Exception:
                    gemini_conf = None

            except Exception as e:
                print(f"[JDExtractor] Gemini enrichment failed: {e}")
                gemini_conf = None

        # -----------------------------------
        # 2.5) Stack booster
        # -----------------------------------
        technical_skills, tools_platforms = self._boost_explicit_stack_signals(
            full_text, technical_skills, tools_platforms
        )

        # -----------------------------------
        # 2.6) Domain reconciliation (fix bad primary domains)
        # -----------------------------------
        local_domain_guess = primary_domain_local or self._domain_fallback_from_text(full_text)

        # If Gemini gave something too generic (like 'design', 'architecture', 'general'), prefer the local guess
        too_generic_primary_tokens = {
            "general", "design", "product", "testing", "ui", "ux",
            "architecture", "architect"
        }
        if primary_domain and any(tok in primary_domain.lower() for tok in too_generic_primary_tokens):
            primary_domain = local_domain_guess

        # Ensure primary_domain is first in domains
        if primary_domain:
            domains = list(dict.fromkeys([primary_domain] + domains))

        # -----------------------------------
        # 3) Final cleanup & confidence
        # -----------------------------------

        if not domains:
            domains = [primary_domain_local or self._domain_fallback_from_text(full_text)]

        if not primary_domain:
            primary_domain = domains[0] if domains else self._domain_fallback_from_text(full_text)

        if not key_technologies:
            key_technologies = technical_skills

        # Final key_technologies selection (clean + prioritize core stack)
        key_technologies = self._select_key_technologies(technical_skills, key_technologies)

        # Filter hallucinated tools using JD text
        tools_platforms = self._filter_tools_by_text(full_text, tools_platforms)

        confidence = self._calculate_confidence(
            technical_skills, tools_platforms, full_text, gemini_conf=gemini_conf
        )

        # Normalize
        technical_skills = self._normalize_list(technical_skills)[: self.MAX_TECH_SKILLS]

        # Remove ultra-generic technical skills
        GENERIC_SKILLS = {"rest", "seo", "testing", "agile"}
        technical_skills = [
            s for s in technical_skills
            if s.lower().strip() not in GENERIC_SKILLS
        ]

        tools_platforms = self._normalize_list(tools_platforms)[: self.MAX_TOOLS]
        domains = self._normalize_list(domains)[: self.MAX_DOMAINS]
        local_soft = self._normalize_list(local_soft)[: self.MAX_SOFT_SKILLS]
        key_technologies = self._normalize_list(key_technologies)[: self.MAX_KEY_TECH]

        # Remove noisy / generic domains (now with substring check, includes architecture)
        generic_domains_tokens = {
            "design", "environment", "team", "company",
            "testing", "ui", "ux", "product", "mobile",
            "architecture", "architect", "system design"
        }
        filtered_domains = [
            d for d in domains
            if not any(tok in d.lower() for tok in generic_domains_tokens)
        ]
        if filtered_domains:
            domains = filtered_domains
        else:
            # If everything got filtered out, fall back again to something useful
            domains = [local_domain_guess or primary_domain or self._domain_fallback_from_text(full_text)]

        # If primary_domain is frontend, compress domains to frontend-only
        if primary_domain and primary_domain.lower() == "frontend":
            frontend_like = [
                d for d in domains
                if "front" in d.lower() or d.lower() == "frontend"
            ]
            if frontend_like:
                domains = frontend_like

        # Keep languages/frameworks out of tools_platforms
        lang_like = {
            "python", "fastapi", "java", "javascript", "typescript",
            "node.js", "nodejs", "go", "golang", "c#", "c++",
            "php", "ruby", "react", "graphql",
        }
        tools_platforms = [
            t for t in tools_platforms
            if t.lower().replace("_", " ") not in lang_like
        ]

        # -----------------------------------
        # 4) Build final SkillsAnalysis
        # -----------------------------------
        analysis = SkillsAnalysis(
            technical_skills=technical_skills,
            experience_level=experience_level,
            domains=domains or ["general"],
            tools_platforms=tools_platforms,
            confidence_score=confidence,
            job_complexity=complexity_level,
            primary_domain=primary_domain,
            key_technologies=key_technologies,
            question_recommendations=question_recommendations,
            job_type=inferred_job_type,
            education_level=inferred_education,
            remote_option=inferred_remote,
            department=inferred_department,
            suggested_department=inferred_department,
        )

        return analysis, requirements


# Singleton
jd_extractor = JDExtractor()
