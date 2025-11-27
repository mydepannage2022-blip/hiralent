"""
Domain Schemas v2.1.0
=====================
Pydantic schemas for the Assessment AI Service.

This file contains all schemas used by:
- JD Parsing
- Chatbot Flow
- Skill Radar
- Assessment Requirements
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal, Any
from datetime import datetime
from uuid import uuid4


# =========================================================
# ============  BASE SHARED STRUCTURES  ===================
# =========================================================

class BaseAssessmentData(BaseModel):
    """
    Shared base schema for assessment-related data.
    """
    technical_skills: List[str] = Field(default_factory=list)
    domains: List[str] = Field(default_factory=list)
    tools_platforms: List[str] = Field(default_factory=list)
    experience_level: Literal["entry", "mid", "senior", "executive"] = "mid"


# =========================================================
# ==========  JD PARSING & SKILLS ANALYSIS  ===============
# =========================================================

class QuestionRecommendation(BaseModel):
    """Suggested question distribution after skill analysis or chatbot."""
    category: str  # e.g. "mcq", "coding"
    count: int
    difficulty: Literal["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]


class AtomicRequirement(BaseModel):
    """Single atomic requirement extracted from JD."""
    text: str
    skills: List[str] = Field(default_factory=list)
    type: Literal["responsibility", "qualification", "skill", "experience"]


class StructuredRequirements(BaseModel):
    """Better structured requirements with atomic bullet points."""
    must_have: List[AtomicRequirement] = Field(default_factory=list)
    nice_to_have: List[AtomicRequirement] = Field(default_factory=list)
    must_have_skills: List[str] = Field(default_factory=list)
    nice_to_have_skills: List[str] = Field(default_factory=list)


class SkillsAnalysis(BaseAssessmentData):
    """
    Rich analysis from JD parsing / skill extraction.

    v2.0 includes:
    - soft_skills: Separated non-technical skills
    - key_technologies: Top 5 for display/search
    - extractor_version: For monitoring
    """
    # Core skills (separated)
    soft_skills: List[str] = Field(default_factory=list)

    # Metrics
    confidence_score: float = Field(default=0.85, ge=0.0, le=1.0)
    job_complexity: Literal["low", "medium", "high"] = "medium"
    primary_domain: str = "general"

    # Key technologies (max 5)
    key_technologies: List[str] = Field(default_factory=list)

    # Question recommendations
    question_recommendations: List[QuestionRecommendation] = Field(default_factory=list)

    # Optional inferred context
    job_type: Optional[Literal["full_time", "part_time", "contract", "internship"]] = None
    education_level: Optional[Literal["high_school", "bachelor", "master", "phd"]] = None
    remote_option: Optional[Literal["fully_remote", "hybrid", "office_only"]] = None
    department: Optional[str] = None
    suggested_department: Optional[str] = None
    education_recommendations: Optional[List[str]] = None

    # Versioning
    extractor_version: str = Field(default="2.0.0")
    extraction_timestamp: Optional[str] = None


# Alias for backward compatibility with extractor
SkillsAnalysisV2 = SkillsAnalysis


class EnhancedAssessmentData(BaseAssessmentData):
    """
    Compact snapshot stored with EmployerAssessment in Node/DB.
    Works for BOTH JD parse and chatbot-guided flows.
    """
    soft_skills: List[str] = Field(default_factory=list)
    job_complexity: Literal["low", "medium", "high"] = "medium"
    question_recommendations: List[QuestionRecommendation] = Field(default_factory=list)
    key_technologies: List[str] = Field(default_factory=list)
    extractor_version: str = "2.0.0"


# =========================================================
# ================  JD PARSING API  =======================
# =========================================================

class SkillExtractionRequest(BaseModel):
    """Request to extract skills from a job description."""
    job_description: str
    job_title: Optional[str] = None
    job_type: Optional[str] = None
    experience_level: Optional[str] = None
    department: Optional[str] = None


class SkillExtractionResponse(SkillsAnalysis):
    """Directly inherits all skill analysis fields."""
    pass


class JDParseRequest(BaseModel):
    """Request to analyze a job description."""
    job_description: str
    job_title: Optional[str] = None


class JDParseResponse(BaseModel):
    """
    Response for /jd/parse.

    - analysis: SkillsAnalysis with all extracted data
    - requirements: StructuredRequirements with atomic bullet points
    """
    analysis: SkillsAnalysis
    requirements: StructuredRequirements


# =========================================================
# =================  CHATBOT FLOW  ========================
# =========================================================

class ChatbotAssessmentData(BaseModel):
    """
    Atomic structured data produced by the chatbot-guided assessment builder.
    This is the format you can map into Prisma.enhanced_data.
    """

    # Link to DB assessment (from initial_data)
    assessment_id: Optional[str] = None

    # Optional high-level job info
    job_title: Optional[str] = None
    job_description: Optional[str] = None
    specific_requirements: List[str] = Field(default_factory=list)

    # Role description (chatbot flow)
    role_context: Optional[str] = None
    role_details: Optional[str] = None

    # Skills & domains
    technical_skills: List[str] = Field(default_factory=list)
    skills_raw_input: Optional[str] = None
    domains: List[str] = Field(default_factory=list)
    tools_platforms: List[str] = Field(default_factory=list)
    skill_category: Optional[str] = "general"
    extracted_skills: List[str] = Field(default_factory=list)

    # Assessment structure
    assessment_type: Optional[
        Literal["QUICK_CHECK", "COMPREHENSIVE", "CERTIFICATION", "COMPANY_SPECIFIC"]
    ] = None

    difficulty: Optional[
        Literal["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]
    ] = None

    # Question types / distribution
    question_types_raw: Optional[str] = None
    question_categories: List[str] = Field(default_factory=list)

    # Internal mix used to build recommendations (kept for transparency)
    question_mix: Dict[str, float] = Field(default_factory=dict)

    # Final distribution (REPLACES weights)
    question_recommendations: List[QuestionRecommendation] = Field(
        default_factory=list
    )

    # Time settings
    time_limit: Optional[int] = None
    total_questions: Optional[int] = None

    # Scoring settings
    passing_score: Optional[int] = None

    # Status of the config
    status: Optional[str] = None


class ChatbotMessage(BaseModel):
    """A single message exchanged between user and chatbot."""
    id: str = Field(default_factory=lambda: str(uuid4()))
    type: Literal["user", "assistant", "system"] = "user"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None


class ChatbotSession(BaseModel):
    """Represents an ongoing chatbot-guided assessment creation session."""
    session_id: str
    company_id: str
    job_id: Optional[str] = None
    messages: List[ChatbotMessage] = Field(default_factory=list)
    current_step: Literal[
        "welcome",
        "job_details",
        "skills_identification",
        "assessment_type",
        "difficulty_level",
        "question_types",
        "time_settings",
        "scoring_settings",
        "review",
        "completed",
    ] = "welcome"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Strongly typed structured data from chatbot
    assessment_data: ChatbotAssessmentData = Field(
        default_factory=ChatbotAssessmentData
    )

    method: Literal["chatbot_guided"] = "chatbot_guided"


class ChatbotStartRequest(BaseModel):
    """Start a new chatbot session."""
    company_id: str
    job_id: Optional[str] = None
    initial_data: Optional[Dict[str, Any]] = None


class ChatbotMessageRequest(BaseModel):
    """Send a message to an existing chatbot session."""
    session_id: str
    message: str


class ChatbotResponse(BaseModel):
    """Chatbot response payload."""
    session: ChatbotSession
    reply: str
    is_completed: bool = False


# =========================================================
# ===============  SKILL RADAR ENGINE  ====================
# =========================================================

class TestCaseBreakdown(BaseModel):
    """Summarized test-case performance."""
    total: int
    passed: int
    avg_time_ms: Optional[float] = None


class SkillObservation(BaseModel):
    """Single skill performance sample from candidate submission."""
    skill: str
    question_weight: float = 1.0
    correctness: float = Field(..., ge=0.0, le=1.0)
    time_penalty: float = Field(default=0.0, ge=0.0, le=1.0)
    timestamp: float = Field(..., description="UNIX timestamp in seconds.")


class SubmissionSignal(BaseModel):
    """Aggregated candidate submission report."""
    candidate_id: str
    submission_id: str
    skills: List[SkillObservation]
    testcases: Optional[TestCaseBreakdown] = None


class RadarVector(BaseModel):
    """Radar vector summarizing candidate skills."""
    candidate_id: str
    scores: Dict[str, float]
    updated_at: float


class SkillRadarUpdateRequest(BaseModel):
    """Request to update a candidate's radar vector."""
    signal: SubmissionSignal


class SkillRadarUpdateResponse(BaseModel):
    """Response after radar update."""
    candidate_id: str
    radar_vector: RadarVector
    updated_skills: List[str]


# =========================================================
# ============  ASSESSMENT REQUIREMENTS  ==================
# =========================================================

class AssessmentRequirements(BaseAssessmentData):
    """
    Canonical assessment configuration.
    Used when you want a clean, final spec for question generation.
    """
    job_title: str
    job_description: str
    assessment_type: Literal[
        "QUICK_CHECK",
        "COMPREHENSIVE",
        "CERTIFICATION",
        "COMPANY_SPECIFIC",
    ]
    difficulty: Literal["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]
    time_limit: int
    total_questions: int

    # HIGH-LEVEL categories, e.g. ['CODING','MCQ']
    question_categories: List[str]

    # Final distribution by category (RECOMMENDED)
    question_recommendations: List[QuestionRecommendation] = Field(
        default_factory=list
    )

    # Legacy weights (optional, backward compatible)
    custom_weights: Optional[Dict[str, float]] = None

    exclude_categories: List[str] = Field(default_factory=list)
    specific_requirements: List[str] = Field(default_factory=list)
    key_technologies: List[str] = Field(default_factory=list)


# =========================================================
# ============  UNIFIED WRAPPER (OPTIONAL)  ===============
# =========================================================

class UnifiedAssessmentResponse(BaseModel):
    """Stable, backend-friendly wrapper."""
    source: Literal["jd_parse", "chatbot"]
    requirements: AssessmentRequirements
    analysis: Optional[SkillsAnalysis] = None
    extractor_version: str = "2.0.0"
