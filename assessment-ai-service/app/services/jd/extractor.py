"""
JDExtractor - Gemini-First Multi-Domain Version
======================================================
Works for ALL industries: Tech, Finance, Healthcare, Marketing, HR, Legal, etc.

Strategy:
- Gemini is PRIMARY source for skill extraction (works for any domain)
- Local extraction is FALLBACK only (when Gemini fails or is unavailable)
- Local logic still handles: experience level, difficulty alignment, requirements structure

Taxonomy:
- Uses ONLY:
    - skills.txt        (unified: languages, tools, platforms, concepts, methods)
    - soft_skills.txt   (behavioral / human skills)
    - domains.txt       (job families / domains)
- tools.txt is NO LONGER USED
"""

import re
import logging
from typing import List, Dict, Tuple, Set, Any, Optional
from pathlib import Path
from datetime import datetime, timezone

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("JDExtractor")

# Import schemas
from app.domain.schemas import (
    SkillsAnalysis,
    StructuredRequirements,
    AtomicRequirement,
    QuestionRecommendation,
)

# Import Gemini client
from app.services.llm.gemini_client import gemini_client
from app.core.config import settings


# =========================================================
# SKILLS NORMALIZATION (Used for both Gemini and local)
# =========================================================

SKILLS_NORMALIZATION: Dict[str, str] = {
    # ========== TECH - APIs ==========
    "rest": "REST APIs",
    "rest api": "REST APIs",
    "rest apis": "REST APIs",
    "restful": "REST APIs",
    "restful api": "REST APIs",
    "restful apis": "REST APIs",
    "api": "APIs",
    "graphql": "GraphQL",
    "grpc": "gRPC",

    # ========== TECH - Languages ==========
    "javascript": "JavaScript",
    "js": "JavaScript",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "python": "Python",
    "python3": "Python",
    "java": "Java",
    "golang": "Go",
    "go": "Go",

    # ========== TECH - Node.js Ecosystem ==========
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "node js": "Node.js",
    "express": "Express.js",
    "expressjs": "Express.js",
    "express.js": "Express.js",
    "nestjs": "NestJS",
    "nest.js": "NestJS",
    "nest": "NestJS",

    # ========== TECH - Frontend ==========
    "react": "React",
    "reactjs": "React",
    "react.js": "React",
    "next": "Next.js",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "vue": "Vue.js",
    "vuejs": "Vue.js",
    "angular": "Angular",

    # ========== TECH - Patterns ==========
    "microservices": "Microservices",
    "microservice": "Microservices",
    "event-driven": "Event-Driven Architecture",
    "event driven": "Event-Driven Architecture",

    # ========== TECH - Auth ==========
    "oauth": "OAuth 2.0",
    "oauth2": "OAuth 2.0",
    "oauth 2": "OAuth 2.0",
    "oauth 2.0": "OAuth 2.0",
    "jwt": "JWT",
    "json web token": "JWT",
    "authentication": "Authentication",

    # ========== TECH - Data ==========
    "sql": "SQL",
    "nosql": "NoSQL",
    "no-sql": "NoSQL",

    # ========== TECH - ML/AI ==========
    "ml": "Machine Learning",
    "machine learning": "Machine Learning",
    "ai": "Artificial Intelligence",
    "deep learning": "Deep Learning",
    "nlp": "NLP",

    # ========== TOOLS - Databases ==========
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "psql": "PostgreSQL",
    "mongo": "MongoDB",
    "mongodb": "MongoDB",
    "mysql": "MySQL",
    "redis": "Redis",
    "elasticsearch": "Elasticsearch",

    # ========== TOOLS - Cloud ==========
    "aws": "AWS",
    "amazon web services": "AWS",
    "gcp": "GCP",
    "google cloud": "GCP",
    "google cloud platform": "GCP",
    "azure": "Azure",
    "microsoft azure": "Azure",

    # ========== TOOLS - DevOps ==========
    "docker": "Docker",
    "containerization": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "ci/cd": "CI/CD",
    "ci cd": "CI/CD",
    "cicd": "CI/CD",
    "jenkins": "Jenkins",
    "terraform": "Terraform",
    "github actions": "GitHub Actions",
    "gitlab ci": "GitLab CI",

    # ========== TOOLS - Message Brokers ==========
    "kafka": "Apache Kafka",
    "apache kafka": "Apache Kafka",
    "rabbitmq": "RabbitMQ",
    "rabbit mq": "RabbitMQ",

    # ========== TOOLS - Testing ==========
    "jest": "Jest",
    "cypress": "Cypress",
    "supertest": "Supertest",
    "selenium": "Selenium",

    # ========== TOOLS - Version Control ==========
    "git": "Git",
    "github": "GitHub",
    "gitlab": "GitLab",

    # ========== Finance ==========
    "gaap": "GAAP",
    "ifrs": "IFRS",
    "cpa": "CPA",
    "excel": "Microsoft Excel",
    "quickbooks": "QuickBooks",
    "sap": "SAP",

    # ========== Marketing ==========
    "seo": "SEO",
    "sem": "SEM",
    "ppc": "PPC",
    "google analytics": "Google Analytics",
    "hubspot": "HubSpot",
    "salesforce": "Salesforce",
    "crm": "CRM",

    # ========== Design ==========
    "figma": "Figma",
    "sketch": "Sketch",
    "adobe xd": "Adobe XD",
    "photoshop": "Adobe Photoshop",

    # ========== Project Management ==========
    "jira": "Jira",
    "asana": "Asana",
    "trello": "Trello",
    "pmp": "PMP",
}


# =========================================================
# HIGH-LEVEL DOMAIN MARKERS (fallback only)
# =========================================================

DOMAIN_MARKERS = {
    "tech": {
        "keywords": [
            "software",
            "developer",
            "engineer",
            "programming",
            "code",
            "api",
            "database",
            "cloud",
        ],
        "skills": ["python", "java", "javascript", "react", "node.js", "aws", "docker"],
    },
    "finance": {
        "keywords": [
            "accountant",
            "financial",
            "finance",
            "banking",
            "investment",
            "audit",
            "tax",
        ],
        "skills": ["excel", "gaap", "ifrs", "quickbooks", "sap", "financial modeling"],
    },
    "healthcare": {
        "keywords": [
            "nurse",
            "doctor",
            "medical",
            "clinical",
            "patient",
            "hospital",
            "healthcare",
        ],
        "skills": ["hipaa", "emr", "epic", "cerner", "patient care", "clinical"],
    },
    "marketing": {
        "keywords": [
            "marketing",
            "seo",
            "content",
            "digital",
            "campaign",
            "brand",
            "social media",
        ],
        "skills": [
            "google analytics",
            "hubspot",
            "seo",
            "sem",
            "ppc",
            "content strategy",
        ],
    },
    "sales": {
        "keywords": [
            "sales",
            "account manager",
            "business development",
            "revenue",
            "quota",
        ],
        "skills": ["salesforce", "crm", "negotiation", "lead generation", "cold calling"],
    },
    "hr": {
        "keywords": [
            "hr",
            "human resources",
            "recruiter",
            "talent",
            "payroll",
            "benefits",
        ],
        "skills": ["ats", "hris", "workday", "adp", "employee relations"],
    },
    "design": {
        "keywords": ["designer", "ui", "ux", "graphic", "visual", "creative"],
        "skills": ["figma", "sketch", "adobe", "photoshop", "illustrator"],
    },
    "legal": {
        "keywords": [
            "lawyer",
            "attorney",
            "legal",
            "paralegal",
            "compliance",
            "contract",
        ],
        "skills": ["contract law", "litigation", "compliance", "legal research"],
    },
    "operations": {
        "keywords": [
            "operations",
            "supply chain",
            "logistics",
            "procurement",
            "inventory",
        ],
        "skills": ["supply chain", "logistics", "erp", "lean", "six sigma"],
    },
    "data": {
        "keywords": [
            "data analyst",
            "data scientist",
            "analytics",
            "business intelligence",
            "bi",
        ],
        "skills": ["sql", "python", "tableau", "power bi", "machine learning"],
    },
}


# =========================================================
# LOCAL FALLBACK MARKERS (Basic, used when Gemini fails)
# =========================================================

SOFT_SKILL_MARKERS = {
    "communication",
    "teamwork",
    "leadership",
    "problem solving",
    "critical thinking",
    "time management",
    "adaptability",
    "collaboration",
    "mentoring",
    "presentation",
    "negotiation",
    "conflict resolution",
    "decision making",
    "creativity",
    "attention to detail",
    "analytical thinking",
    "project management",
    "agile",
    "scrum",
    "stakeholder management",
    "customer service",
    "interpersonal skills",
    "organizational skills",
    "multitasking",
}


class JDExtractor:
    """
    JDExtractor v2.2.0 - Gemini-First Multi-Domain Version

    Works for ALL industries by using Gemini as primary skill extractor.
    Local extraction is fallback only.

    Taxonomy:
        - skills.txt        (unified hard skills: tools + tech)
        - soft_skills.txt   (behavioral)
        - domains.txt       (job families)
        -> tools.txt is not used anymore.
    """

    VERSION = "2.2.0"

    MAX_TECH_SKILLS = 20
    MAX_TOOLS = 15
    MAX_SOFT_SKILLS = 10
    MAX_KEY_TECH = 5
    MAX_DOMAINS = 5
    MAX_REQ_ITEMS = 20

    # =========================================================
    # TAXONOMY LOADING
    # =========================================================

    def _load_taxonomy_file(self, filename: str) -> Set[str]:
        """
        Load a taxonomy file from taxonomies/<filename>.
        One term per line, '#' lines are comments.
        Values are stored lowercased with single spaces.
        """
        path = self.taxonomies_path / filename
        if not path.exists():
            logger.warning(f"[JDExtractor] Taxonomy file not found: {path}")
            return set()

        try:
            content = path.read_text(encoding="utf-8")
        except Exception as e:
            logger.error(f"[JDExtractor] Failed to read taxonomy file {path}: {e}")
            return set()

        values: Set[str] = set()
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            key = re.sub(r"\s+", " ", line).lower()
            values.add(key)

        logger.info(f"[JDExtractor] Loaded {len(values)} items from {filename}")
        return values

    def __init__(self) -> None:
        self.taxonomies_path = Path(__file__).parent / "taxonomies"

        # Load taxonomies (all lowercase)
        # Unified hard skills: includes tools, platforms, languages, concepts…
        self.taxonomy_skills = self._load_taxonomy_file("skills.txt")
        self.taxonomy_soft_skills = self._load_taxonomy_file("soft_skills.txt")
        self.taxonomy_domains = self._load_taxonomy_file("domains.txt")  # optional

        # Check if Gemini is available
        self.gemini_available = bool(settings.GOOGLE_API_KEY)
        if not self.gemini_available:
            logger.warning("Gemini API key not configured - using local extraction only")

    # =========================================================
    # SKILL NORMALIZATION
    # =========================================================

    def _normalize_skill(self, skill: str) -> str:
        """Normalize skill name using dictionary (defensive)."""
        if not isinstance(skill, str):
            return ""
        raw = skill.strip()
        if not raw:
            return ""
        key = raw.lower()
        key = re.sub(r"[\s\-_]+", " ", key)
        return SKILLS_NORMALIZATION.get(key, raw)

    def _normalize_and_dedupe(self, skills: List[str]) -> List[str]:
        """Normalize all skills and remove duplicates."""
        seen: Set[str] = set()
        result: List[str] = []

        for skill in skills:
            if not isinstance(skill, str) or not skill.strip():
                continue

            # Skip very short skills that are usually noise (keep "C" as exception)
            if len(skill.strip()) <= 2 and skill.strip().lower() not in {"c"}:
                continue

            # Skip generic terms (keep SQL / NoSQL now)
            skip_terms = {"api", "apis", "rest", "restful", "authentication"}
            if skill.lower().strip() in skip_terms:
                continue

            normalized = self._normalize_skill(skill)
            if not normalized:
                continue

            key = normalized.lower()
            if key not in seen:
                seen.add(key)
                result.append(normalized)

        return result

    # =========================================================
    # DOMAIN DETECTION (high-level)
    # =========================================================

    def _detect_high_level_domain(self, text: str) -> str:
        """
        Fallback high-level domain (tech, finance, ...), based on DOMAIN_MARKERS.
        Used for department + coding vs non-coding, but not for fine-grained domains.
        """
        text_lower = text.lower()
        domain_scores: Dict[str, int] = {}

        for domain, markers in DOMAIN_MARKERS.items():
            score = 0

            # Check keywords
            for keyword in markers["keywords"]:
                if keyword in text_lower:
                    score += 2

            # Check skills
            for skill in markers["skills"]:
                if skill in text_lower:
                    score += 1

            domain_scores[domain] = score

        if domain_scores:
            best_domain = max(domain_scores, key=domain_scores.get)
            if domain_scores[best_domain] > 0:
                return best_domain

        return "general"

    # =========================================================
    # DOMAIN INFERENCE (taxonomy-first with scoring)
    # =========================================================

    def _infer_domains(
        self,
        text: str,
        technical_skills: List[str],
        tools_platforms: List[str],
    ) -> List[str]:
        """
        Infer fine-grained domains, prioritising taxonomy domains with scoring.
        Example: backend, frontend, data, devops, cloud, etc.
        Fallback: high-level domains if taxonomy doesn't match.
        """
        text_lower = text.lower()
        first_line = text_lower.split("\n", 1)[0]

        all_skills_lower = [s.lower() for s in (technical_skills + tools_platforms)]

        domain_scores: Dict[str, float] = {}

        # Heuristic markers for some common tech subdomains
        subdomain_markers: Dict[str, Set[str]] = {
            "backend": {
                "node.js",
                "nodejs",
                "express.js",
                "express",
                "nestjs",
                "django",
                "spring boot",
                "fastapi",
                "microservices",
                "rest api",
                "rest apis",
            },
            "frontend": {
                "react",
                "react.js",
                "vue.js",
                "angular",
                "next.js",
                "html",
                "css",
            },
            "devops": {
                "docker",
                "kubernetes",
                "k8s",
                "ci/cd",
                "terraform",
                "ansible",
            },
            "cloud": {
                "aws",
                "gcp",
                "azure",
                "lambda",
                "s3",
                "ec2",
                "cloud",
            },
            "data": {
                "pandas",
                "numpy",
                "machine learning",
                "ml",
                "nlp",
                "spark",
                "sql",
            },
        }

        for dom in self.taxonomy_domains:
            dom_norm = dom.strip()
            if not dom_norm:
                continue
            dom_lower = dom_norm.lower()

            # Special handling: avoid "design" for system design in backend roles
            if dom_lower == "design":
                if not any(
                    kw in text_lower
                    for kw in [" ui ", " ux ", "user interface", "product designer", "figma"]
                ):
                    # Skip "design" domain unless it's clearly UI/UX/product design
                    continue

            score = 0.0

            # Strong bonus if domain appears in first line (title / header)
            if re.search(r"\b" + re.escape(dom_lower) + r"\b", first_line):
                score += 6.0

            # Bonus if domain appears anywhere in description
            if re.search(r"\b" + re.escape(dom_lower) + r"\b", text_lower):
                score += 2.0

            # Extra points if skills or markers indicate this subdomain
            markers = subdomain_markers.get(dom_lower, set())
            for marker in markers:
                marker_lower = marker.lower()
                if any(marker_lower in s for s in all_skills_lower) or marker_lower in text_lower:
                    score += 1.0

            if score > 0:
                domain_scores[dom_norm] = score

        # Sort domains by score descending
        if domain_scores:
            sorted_domains = sorted(
                domain_scores.items(), key=lambda kv: kv[1], reverse=True
            )
            candidates = [d for d, _ in sorted_domains]
        else:
            candidates = []

        # If we still have nothing, fall back to a single high-level domain
        if not candidates:
            high = self._detect_high_level_domain(text)
            candidates = [high]

        # Dedupe and cap
        seen: Set[str] = set()
        unique_domains: List[str] = []
        for d in candidates:
            d_norm = d.strip()
            key = d_norm.lower()
            if d_norm and key not in seen:
                seen.add(key)
                unique_domains.append(d_norm)

        return unique_domains[: self.MAX_DOMAINS]

    # =========================================================
    # GEMINI EXTRACTION (PRIMARY)
    # =========================================================

    async def _extract_with_gemini(
        self, job_description: str, job_title: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """
        Use Gemini to extract skills from ANY domain.
        Returns structured data or None if failed.
        """
        if not self.gemini_available:
            logger.warning("[Gemini] API key not configured, skipping Gemini extraction")
            return None

        try:
            logger.info(
                f"[Gemini] Calling extract_skills_advanced for: {job_title or 'Unknown'}"
            )

            # Call Gemini for advanced skill extraction
            result = await gemini_client.extract_skills_advanced(
                job_description=job_description,
                job_title=job_title,
            )

            if result:
                tech_count = len(result.get("technical_skills", []))
                tools_count = len(result.get("tools_platforms", []))
                logger.info(
                    f"[Gemini] SUCCESS - tech_skills={tech_count}, tools={tools_count}"
                )
                return result
            else:
                logger.warning("[Gemini] Returned empty result")

        except Exception as e:
            logger.error(f"[Gemini] Extraction failed with error: {type(e).__name__}: {e}")

        return None

    # =========================================================
    # LOCAL FALLBACK EXTRACTION
    # =========================================================

    def _extract_local_fallback(self, text: str) -> Tuple[List[str], List[str], List[str]]:
        """
        Local fallback extraction when Gemini is unavailable or returns nothing.
        Uses hard-coded markers + unified skills taxonomy.

        Returns: (technical_skills, tools_platforms, soft_skills)
        Even though taxonomy is unified, we still split into technical vs tools
        using simple heuristics (cloud/devops/db -> tools, the rest -> technical).
        """
        text_lower = text.lower()

        technical_skills: List[str] = []
        tools_platforms: List[str] = []
        soft_skills: List[str] = []

        # ---------- 1) Base markers for technical concepts ----------
        tech_markers: Set[str] = {
            # Languages
            "python",
            "java",
            "javascript",
            "typescript",
            "c#",
            "c++",
            "php",
            "ruby",
            "go",
            "golang",
            "rust",
            "scala",
            "kotlin",
            "swift",
            # Frontend
            "react",
            "angular",
            "vue",
            "svelte",
            "next.js",
            "nextjs",
            "nuxt",
            "html",
            "css",
            "sass",
            "tailwind",
            # Backend
            "node.js",
            "nodejs",
            "express",
            "express.js",
            "nestjs",
            "nest.js",
            "django",
            "flask",
            "fastapi",
            "spring",
            "spring boot",
            ".net",
            "rails",
            "laravel",
            # APIs
            "rest",
            "rest api",
            "rest apis",
            "restful",
            "graphql",
            "grpc",
            "api",
            "microservices",
            "event-driven",
            # Data / ML
            "sql",
            "nosql",
            "data modeling",
            "etl",
            "machine learning",
            "deep learning",
            "nlp",
            "tensorflow",
            "pytorch",
            # Auth
            "oauth",
            "oauth2",
            "jwt",
            "authentication",
        }

        # Add unified taxonomy skills as additional markers
        tech_markers.update(self.taxonomy_skills)

        # ---------- 2) Heuristic markers for tools/platforms ----------
        # (we no longer read tools.txt, this is all in-code)
        tool_markers: Set[str] = {
            # Databases
            "postgresql",
            "postgres",
            "mysql",
            "mongodb",
            "mongo",
            "redis",
            "elasticsearch",
            "dynamodb",
            "cassandra",
            "neo4j",
            "sqlite",
            # Cloud
            "aws",
            "gcp",
            "azure",
            "heroku",
            "digitalocean",
            "cloudflare",
            "ec2",
            "s3",
            "lambda",
            "eks",
            "ecs",
            # DevOps
            "docker",
            "kubernetes",
            "k8s",
            "jenkins",
            "github actions",
            "gitlab ci",
            "terraform",
            "ansible",
            "helm",
            "ci/cd",
            "ci cd",
            # Message brokers
            "kafka",
            "rabbitmq",
            "sqs",
            "sns",
            # Monitoring
            "prometheus",
            "grafana",
            "datadog",
            "new relic",
            "elk",
            # Version control
            "git",
            "github",
            "gitlab",
            "bitbucket",
            # Testing tools
            "jest",
            "cypress",
            "selenium",
            "postman",
            "supertest",
            # BI / office tools
            "power bi",
            "tableau",
            "microsoft excel",
            "excel",
            "google sheets",
        }

        # ---------- 3) Soft skills ----------
        soft_markers: Set[str] = {
            "communication",
            "teamwork",
            "leadership",
            "problem solving",
            "critical thinking",
            "time management",
            "adaptability",
            "collaboration",
            "mentoring",
            "presentation",
            "negotiation",
        }
        soft_markers.update(self.taxonomy_soft_skills)

        # Extract technical skills (from unified taxonomy)
        for marker in tech_markers:
            marker_l = marker.lower()
            pattern = r"\b" + re.escape(marker_l) + r"\b"
            if re.search(pattern, text_lower):
                normalized = self._normalize_skill(marker)
                if normalized:
                    technical_skills.append(normalized)

        # Extract tools/platforms
        for marker in tool_markers:
            marker_l = marker.lower()
            pattern = r"\b" + re.escape(marker_l) + r"\b"
            if re.search(pattern, text_lower):
                normalized = self._normalize_skill(marker)
                if normalized:
                    tools_platforms.append(normalized)

        # Extract soft skills
        for marker in soft_markers:
            marker_l = marker.lower()
            if marker_l in text_lower:
                normalized = self._normalize_skill(marker)
                if normalized:
                    soft_skills.append(normalized)

        logger.info(
            f"[Local Fallback] Extracted: tech={len(technical_skills)}, "
            f"tools={len(tools_platforms)}, soft={len(soft_skills)}"
        )

        return technical_skills, tools_platforms, soft_skills

    # =========================================================
    # SKILL CATEGORIZATION (For Gemini output)
    # =========================================================

    def _categorize_gemini_skills(
        self, skills: List[str], high_level_domain: str
    ) -> Tuple[List[str], List[str], List[str]]:
        """
        Categorize skills from Gemini into technical, tools, soft.
        Uses high-level domain context for better categorization.
        """
        technical: List[str] = []
        tools: List[str] = []
        soft: List[str] = []

        for skill in skills:
            skill_lower = skill.lower()

            # Check soft skills first
            is_soft = any(
                marker in skill_lower or skill_lower in marker
                for marker in SOFT_SKILL_MARKERS
                if len(marker) > 3  # Avoid short matches
            )

            if is_soft:
                soft.append(skill)
                continue

            # Domain-specific categorization
            if high_level_domain in ["tech", "data"]:
                # For tech/data: programming = technical, infra = tools
                infra_markers = [
                    "aws",
                    "gcp",
                    "azure",
                    "docker",
                    "kubernetes",
                    "jenkins",
                    "postgresql",
                    "mongodb",
                    "redis",
                    "tableau",
                    "power bi",
                ]
                if any(m in skill_lower for m in infra_markers):
                    tools.append(skill)
                else:
                    technical.append(skill)
            else:
                # For non-tech: software = tools, domain skills = technical
                software_markers = [
                    "excel",
                    "sap",
                    "salesforce",
                    "hubspot",
                    "workday",
                    "figma",
                    "jira",
                    "tableau",
                    "power bi",
                ]
                if any(m in skill_lower for m in software_markers):
                    tools.append(skill)
                else:
                    technical.append(skill)

        return technical, tools, soft

    # =========================================================
    # REQUIREMENTS EXTRACTION
    # =========================================================

    def _extract_requirements(self, text: str, all_skills: List[str]) -> StructuredRequirements:
        """Extract structured requirements from text."""
        must_have_reqs: List[AtomicRequirement] = []
        nice_to_have_reqs: List[AtomicRequirement] = []
        must_have_skills: Set[str] = set()
        nice_to_have_skills: Set[str] = set()

        lines = text.split("\n")
        current_section: Optional[str] = None

        must_markers = [
            "responsibilities",
            "what you'll do",
            "requirements",
            "required qualifications",
            "minimum qualifications",
            "must have",
            "required",
            "you have",
            "you bring",
            "key responsibilities",
            "duties",
            "role overview",
        ]

        nice_markers = [
            "preferred qualifications",
            "preferred skills",
            "nice to have",
            "nice-to-have",
            "bonus",
            "plus",
            "good to have",
            "desired",
        ]

        # Create skill lookup for detection (case-insensitive)
        skills_lower: Dict[str, str] = {s.lower(): s for s in all_skills}

        # Also add common tech terms for detection in requirements
        extra_terms = {
            "typescript": "TypeScript",
            "graphql": "GraphQL",
            "rest api": "REST APIs",
            "rest apis": "REST APIs",
            "restful": "REST APIs",
            "postgresql": "PostgreSQL",
            "mongodb": "MongoDB",
            "redis": "Redis",
            "kafka": "Apache Kafka",
            "rabbitmq": "RabbitMQ",
            "kubernetes": "Kubernetes",
            "docker": "Docker",
            "aws": "AWS",
            "gcp": "GCP",
            "jest": "Jest",
            "ci/cd": "CI/CD",
            "microservices": "Microservices",
            "node.js": "Node.js",
            "nodejs": "Node.js",
            "express": "Express.js",
            "nestjs": "NestJS",
            "jwt": "JWT",
            "oauth": "OAuth 2.0",
        }
        skills_lower.update({k: v for k, v in extra_terms.items()})

        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                continue

            line_lower = line.lower()

            # Detect section headers
            if any(m in line_lower for m in nice_markers):
                current_section = "nice"
                continue
            if any(m in line_lower for m in must_markers):
                current_section = "must"
                continue

            # Skip very short lines
            if len(line) < 10:
                continue

            # Clean bullet points
            clean_line = re.sub(r"^[-•*]\s*", "", line)

            # Find skills in this line
            line_skills: List[str] = []
            for skill_lower, skill in skills_lower.items():
                pattern = r"\b" + re.escape(skill_lower) + r"\b"
                if re.search(pattern, line_lower):
                    if skill not in line_skills:
                        line_skills.append(skill)

            # Classify requirement type
            req_type = self._classify_requirement_type(clean_line)

            req = AtomicRequirement(text=clean_line, skills=line_skills, type=req_type)

            # Determine target list
            is_nice = any(
                m in line_lower for m in ["preferred", "nice", "bonus", "plus", "desired"]
            )

            if is_nice or current_section == "nice":
                nice_to_have_reqs.append(req)
                nice_to_have_skills.update(line_skills)
            else:
                must_have_reqs.append(req)
                must_have_skills.update(line_skills)

        return StructuredRequirements(
            must_have=must_have_reqs[: self.MAX_REQ_ITEMS],
            nice_to_have=nice_to_have_reqs[: self.MAX_REQ_ITEMS],
            must_have_skills=list(must_have_skills),
            nice_to_have_skills=list(nice_to_have_skills),
        )

    def _classify_requirement_type(self, line: str) -> str:
        """Classify requirement type."""
        line_lower = line.lower()

        if re.search(r"\d+\+?\s*(years?|yrs?|ans)", line_lower):
            return "experience"

        if any(
            word in line_lower
            for word in [
                "proficient",
                "knowledge of",
                "experience with",
                "familiar with",
            ]
        ):
            return "skill"

        if any(
            word in line_lower
            for word in [
                "design",
                "develop",
                "build",
                "implement",
                "maintain",
                "manage",
                "lead",
                "coordinate",
            ]
        ):
            return "responsibility"

        return "qualification"

    # =========================================================
    # EXPERIENCE & DIFFICULTY
    # =========================================================

    def _infer_experience_level(self, text: str) -> str:
        """Infer experience level from text."""
        text_lower = text.lower()

        years = 0
        year_matches = re.findall(r"(\d+)\+?\s*(?:years?|yrs?|ans)", text_lower)
        for y in year_matches:
            try:
                years = max(years, int(y))
            except ValueError:
                continue

        if re.search(
            r"\b(principal|staff|executive|director|head of|vp|cto|ceo|chief)\b",
            text_lower,
        ):
            return "executive"

        if years >= 5 or re.search(
            r"\b(senior|sr\.?|lead|expert|manager)\b", text_lower
        ):
            return "senior"

        if years <= 1 or re.search(
            r"\b(junior|jr\.?|entry|graduate|intern|trainee)\b", text_lower
        ):
            return "entry"

        return "mid"

    def _get_aligned_difficulty(self, experience_level: str, primary_domain: str) -> str:
        """
        Map experience level to DifficultyLevel, modulated by the primary domain.

        - Hardcore tech domains (backend/devops/cloud/security/ml/ai/platform):
          EXECUTIVE -> EXPERT.
        - BI / data / business analytics domains:
          EXECUTIVE is capped at ADVANCED.
        """
        exp = (experience_level or "").lower()
        dom = (primary_domain or "").lower()

        hardcore_domains = {"backend", "devops", "cloud", "security", "ml", "ai", "platform"}
        soft_domains = {"data", "bi", "analytics", "marketing", "sales", "product"}

        if dom in hardcore_domains:
            mapping = {
                "entry": "BEGINNER",
                "mid": "INTERMEDIATE",
                "senior": "ADVANCED",
                "executive": "EXPERT",
            }
        elif dom in soft_domains:
            mapping = {
                "entry": "BEGINNER",
                "mid": "INTERMEDIATE",
                "senior": "ADVANCED",
                "executive": "ADVANCED",  # capped
            }
        else:
            mapping = {
                "entry": "BEGINNER",
                "mid": "INTERMEDIATE",
                "senior": "ADVANCED",
                "executive": "ADVANCED",
            }

        return mapping.get(exp, "INTERMEDIATE")

    def _infer_complexity(self, text: str, experience_level: str) -> str:
        """
        Infer job complexity.

        Logic:
        - Start from experience level (entry/mid/senior/executive).
        - Then adjust using architecture / ownership / scope markers in the text.
        - Complexity is about SYSTEM / BUSINESS SCOPE, not just number of skills.
        """
        t = text.lower()

        # Base score anchored on experience level (keep them related but not identical)
        base_from_experience = {
            "entry": 1,        # usually low complexity
            "mid": 2,          # moderate scope
            "senior": 3,       # often complex, but may still be "medium"
            "executive": 3,    # complexity comes more from responsibilities than coding
        }
        score = base_from_experience.get(experience_level, 2)

        # Strong signals of high architectural / strategic complexity
        high_markers = [
            r"\bsystem architecture\b",
            r"\bsoftware architecture\b",
            r"\bdata architecture\b",
            r"\barchitect\b",
            r"\bown(s)?\s+the\s+architecture\b",
            r"\b(end[- ]to[- ]end|e2e)\b",
            r"\bdistributed systems?\b",
            r"\bhigh[- ]availability\b",
            r"\bmission[- ]critical\b",
            r"\benterprise[- ]scale\b",
            r"\bscalable\b",
            r"\bmicroservices\b",
            r"\btechnical strategy\b",
            r"\btechnical roadmap\b",
        ]

        # Medium signals: ownership of modules, leading design, cross-team work
        medium_markers = [
            r"\bdesign (and )?implement\b",
            r"\bown(er(ship)?|s)?\s+(features?|modules?|services?)\b",
            r"\bmake technical decisions?\b",
            r"\blead(ing)?\s+projects?\b",
            r"\bmentor\b",
            r"\bstakeholders?\b",
            r"\bcross[- ]functional\b",
            r"\bcomplex (systems?|projects?)\b",
        ]

        # Low-complexity signals: mostly support / assisting / routine tasks
        low_markers = [
            r"\bassist\b",
            r"\bsupport\b",
            r"\broutine\b",
            r"\bentry[- ]level\b",
            r"\bjunior\b",
            r"\bintern(ship)?\b",
        ]

        for pattern in high_markers:
            if re.search(pattern, t):
                score += 2

        for pattern in medium_markers:
            if re.search(pattern, t):
                score += 1

        for pattern in low_markers:
            if re.search(pattern, t):
                score -= 1

        # Clamp score to a sane range
        if score < 0:
            score = 0

        # Final thresholds:
        # 0–2  -> low   (entry roles, support roles)
        # 3–4  -> medium (most mid/senior individual contributor roles)
        # 5+   -> high  (architect / principal / large scope)
        if score >= 5:
            return "high"
        elif score >= 3:
            return "medium"
        else:
            return "low"

    # =========================================================
    # QUESTION RECOMMENDATIONS
    # =========================================================

    def _get_question_recommendations(
        self,
        experience_level: str,
        high_level_domain: str,
        primary_domain: str,
        technical_skills: List[str],
    ) -> List[QuestionRecommendation]:
        """Generate question recommendations based on domain and experience."""
        difficulty = self._get_aligned_difficulty(experience_level, primary_domain)

        recommendations: List[QuestionRecommendation] = []

        # MCQ counts
        mcq_counts = {"entry": 10, "mid": 8, "senior": 8, "executive": 6}

        # MCQ for everyone
        recommendations.append(
            QuestionRecommendation(
                category="mcq",
                count=mcq_counts.get(experience_level, 8),
                difficulty=difficulty,
            )
        )

        # Coding only for tech/data domains
        if high_level_domain in ["tech", "data"]:
            coding_counts = {"entry": 5, "mid": 6, "senior": 6, "executive": 4}
            recommendations.append(
                QuestionRecommendation(
                    category="coding",
                    count=coding_counts.get(experience_level, 5),
                    difficulty=difficulty,
                )
            )

        return recommendations

    # =========================================================
    # CONTEXT INFERENCE
    # =========================================================

    def _infer_job_type(self, text: str) -> Optional[str]:
        t = text.lower()
        if any(k in t for k in ["cdi", "permanent", "full-time", "full time"]):
            return "full_time"
        if "intern" in t:
            return "internship"
        if any(k in t for k in ["part-time", "part time"]):
            return "part_time"
        if any(k in t for k in ["contract", "freelance", "consultant"]):
            return "contract"
        return None

    def _infer_education_level(self, text: str) -> Optional[str]:
        t = text.lower()
        if any(k in t for k in ["phd", "doctorate", "doctorat"]):
            return "phd"
        if any(k in t for k in ["master", "mba", "msc", "bac+5"]):
            return "master"
        if any(k in t for k in ["bachelor", "degree", "licence", "bac+3", "bs", "ba"]):
            return "bachelor"
        return None

    def _infer_remote_option(self, text: str) -> Optional[str]:
        t = text.lower()
        if any(k in t for k in ["fully remote", "100% remote", "remote only"]):
            return "fully_remote"
        if "hybrid" in t or "remote-friendly" in t:
            return "hybrid"
        if any(k in t for k in ["on-site", "on site", "office", "in-person"]):
            return "office_only"
        return None

    def _infer_department(self, text: str, high_level_domain: str) -> Optional[str]:
        """Infer department based on high-level domain."""
        department_mapping = {
            "tech": "Engineering",
            "data": "Data / Analytics",
            "finance": "Finance",
            "healthcare": "Healthcare",
            "marketing": "Marketing",
            "sales": "Sales",
            "hr": "Human Resources",
            "design": "Design",
            "legal": "Legal",
            "operations": "Operations",
        }
        return department_mapping.get(high_level_domain)

    # =========================================================
    # KEY TECHNOLOGIES SELECTION
    # =========================================================

    def _select_key_technologies(
        self, technical_skills: List[str], tools_platforms: List[str], domain: str
    ) -> List[str]:
        """Select top 5 most important skills for display/search."""

        # Priority order for tech domain
        priority_order = [
            # Languages (highest priority)
            "TypeScript",
            "JavaScript",
            "Python",
            "Java",
            "Go",
            "Rust",
            "C#",
            "C++",
            # Backend frameworks
            "Node.js",
            "Express.js",
            "NestJS",
            "Django",
            "FastAPI",
            "Spring Boot",
            # Frontend frameworks
            "React",
            "Angular",
            "Vue.js",
            "Next.js",
            # Databases
            "PostgreSQL",
            "MongoDB",
            "MySQL",
            "Redis",
            # Cloud
            "AWS",
            "GCP",
            "Azure",
            # DevOps
            "Docker",
            "Kubernetes",
            # APIs
            "GraphQL",
            "REST APIs",
        ]

        all_skills = technical_skills + tools_platforms
        if not all_skills:
            return []

        skills_lower_map = {s.lower(): s for s in all_skills}

        key_tech: List[str] = []
        seen: Set[str] = set()

        # First: Pick from priority order
        for priority in priority_order:
            priority_lower = priority.lower()
            if priority_lower in skills_lower_map and priority_lower not in seen:
                key_tech.append(skills_lower_map[priority_lower])
                seen.add(priority_lower)
                if len(key_tech) >= self.MAX_KEY_TECH:
                    break

        # Second: Fill with remaining skills (skip generic ones)
        skip_generic = {
            "sql",
            "nosql",
            "api",
            "apis",
            "rest",
            "restful",
            "authentication",
            "microservices",
        }

        if len(key_tech) < self.MAX_KEY_TECH:
            for skill in all_skills:
                skill_lower = skill.lower()
                if skill_lower not in seen and skill_lower not in skip_generic:
                    key_tech.append(skill)
                    seen.add(skill_lower)
                    if len(key_tech) >= self.MAX_KEY_TECH:
                        break

        return key_tech[: self.MAX_KEY_TECH]

    # =========================================================
    # CONFIDENCE CALCULATION
    # =========================================================

    def _compute_confidence(
        self,
        technical_skills: List[str],
        tools_platforms: List[str],
        gemini_data: Optional[Dict[str, Any]],
    ) -> float:
        """
        Confidence is calculated from the richness of extracted skills,
        and optionally Gemini's own confidence if available.
        Gemini can increase confidence, but not push it below a floor.
        """
        richness = len(set(technical_skills + tools_platforms))

        if richness >= 20:
            base_conf = 0.9
        elif richness >= 15:
            base_conf = 0.85
        elif richness >= 10:
            base_conf = 0.8
        elif richness >= 5:
            base_conf = 0.7
        elif richness >= 1:
            base_conf = 0.6
        else:
            base_conf = 0.5

        if gemini_data and gemini_data.get("confidence_score") is not None:
            try:
                g_conf = float(gemini_data["confidence_score"])
            except (ValueError, TypeError):
                g_conf = base_conf
            g_conf_clamped = max(0.6, min(0.95, g_conf))
            confidence = max(base_conf, g_conf_clamped)
        else:
            confidence = base_conf

        return confidence

    # =========================================================
    # MAIN EXTRACTION METHOD
    # =========================================================

    async def analyze_job_description(
        self,
        job_description: str,
        job_title: Optional[str] = None,
        use_gemini: bool = True,
    ) -> Tuple[SkillsAnalysis, StructuredRequirements]:
        """
        Main entry point - analyze a job description.

        Strategy:
        1. Try Gemini first (works for ALL domains)
        2. Fall back to local extraction if Gemini fails or returns no skills
        3. Always use local logic for: experience, difficulty, requirements structure
        """
        import time

        start_time = time.time()

        full_text = f"{job_title or ''}\n{job_description}".strip()

        logger.info(f"[JDExtractor v{self.VERSION}] Processing: {job_title or 'Unknown'}")

        # High-level domain (tech / finance / ...)
        high_level_domain = self._detect_high_level_domain(full_text)
        logger.info(f"[JDExtractor] High-level domain: {high_level_domain}")

        # Initialize skill lists
        technical_skills: List[str] = []
        tools_platforms: List[str] = []
        soft_skills: List[str] = []
        gemini_data: Optional[Dict[str, Any]] = None

        # ========== STEP 1: Try Gemini (PRIMARY) ==========
        if use_gemini and self.gemini_available:
            gemini_data = await self._extract_with_gemini(job_description, job_title)

            if gemini_data:
                # Gemini MAY return technical_skills + tools_platforms separately,
                # but we treat them as a unified hard-skill pool then recategorize.
                all_gemini_skills: List[str] = []
                all_gemini_skills += gemini_data.get("technical_skills", []) or []
                all_gemini_skills += gemini_data.get("tools_platforms", []) or []

                # Normalize & dedupe
                all_gemini_skills = self._normalize_and_dedupe(all_gemini_skills)

                # Categorize based on high-level domain
                (
                    technical_skills,
                    tools_platforms,
                    soft_skills,
                ) = self._categorize_gemini_skills(all_gemini_skills, high_level_domain)

                # Get soft skills from Gemini if available
                gemini_soft = gemini_data.get("soft_skills") or []
                if gemini_soft:
                    soft_skills = self._normalize_and_dedupe(gemini_soft + soft_skills)

                logger.info(
                    f"[Gemini] Extracted: tech={len(technical_skills)}, "
                    f"tools={len(tools_platforms)}, soft={len(soft_skills)}"
                )

        # ========== STEP 2: Local Fallback ==========
        if not technical_skills and not tools_platforms:
            logger.info("[JDExtractor] Using local fallback extraction")
            technical_skills, tools_platforms, soft_skills = self._extract_local_fallback(
                full_text
            )

        # Normalize again to be safe
        technical_skills = self._normalize_and_dedupe(technical_skills)
        tools_platforms = self._normalize_and_dedupe(tools_platforms)
        soft_skills = self._normalize_and_dedupe(soft_skills)

        # ========== STEP 3: Local Logic (Always) ==========

        # Extract requirements
        all_skills = technical_skills + tools_platforms
        requirements = self._extract_requirements(job_description, all_skills)

        # Infer metadata
        experience_level = self._infer_experience_level(full_text)
        # Job complexity is now derived from responsibilities / architecture + experience
        job_complexity = self._infer_complexity(full_text, experience_level)

        # Infer domains (taxonomy-first + scoring)
        domains = self._infer_domains(full_text, technical_skills, tools_platforms)
        primary_domain = domains[0] if domains else high_level_domain or "general"

        # Select key technologies
        key_technologies = self._select_key_technologies(
            technical_skills, tools_platforms, primary_domain
        )

        # Get question recommendations (difficulty now domain-aware)
        question_recommendations = self._get_question_recommendations(
            experience_level, high_level_domain, primary_domain, technical_skills
        )

        # Infer context
        job_type = self._infer_job_type(full_text)
        education_level = self._infer_education_level(full_text)
        remote_option = self._infer_remote_option(full_text)
        department = self._infer_department(full_text, high_level_domain)

        # Calculate confidence based on richness + Gemini (if present)
        confidence = self._compute_confidence(technical_skills, tools_platforms, gemini_data)

        processing_time = int((time.time() - start_time) * 1000)

        # Build final analysis
        analysis = SkillsAnalysis(
            technical_skills=technical_skills[: self.MAX_TECH_SKILLS],
            tools_platforms=tools_platforms[: self.MAX_TOOLS],
            soft_skills=soft_skills[: self.MAX_SOFT_SKILLS],
            key_technologies=key_technologies,
            domains=domains[: self.MAX_DOMAINS],
            primary_domain=primary_domain,
            experience_level=experience_level,
            job_complexity=job_complexity,
            confidence_score=confidence,
            question_recommendations=question_recommendations,
            job_type=job_type,
            education_level=education_level,
            remote_option=remote_option,
            department=department,
            suggested_department=department,
            extractor_version=self.VERSION,
            extraction_timestamp=datetime.now(timezone.utc).isoformat(),
        )

        logger.info(
            f"[JDExtractor v{self.VERSION}] Done in {processing_time}ms - "
            f"domains={domains}, tech={len(technical_skills)}, tools={len(tools_platforms)}, "
            f"confidence={confidence}"
        )

        return analysis, requirements


# Singleton
jd_extractor = JDExtractor()
