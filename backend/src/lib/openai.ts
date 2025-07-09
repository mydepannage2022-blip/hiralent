import OpenAI from 'openai';
import dotenv from 'dotenv';
import { 
  AIExtractionResult, 
  CareerPredictionResult, 
  JobMatchReasoning,
  OpenAISkillExtractionPrompt,
  OpenAICareerPredictionPrompt,
  OpenAIJobMatchPrompt 
} from '../types/candidate.types';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not set in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export { openai };

// Helper function to extract skills from CV text
export async function extractSkillsFromText(text: string): Promise<AIExtractionResult> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert HR analyst. Extract skills, experience, and education from CV/resume text.
          Return a structured JSON response with the following format:
          {
            "skills": [
              {
                "name": "skill name",
                "category": "technical|soft|language|certification",
                "proficiency": "beginner|intermediate|advanced|expert",
                "years_experience": number
              }
            ],
            "experience": [
              {
                "job_title": "title",
                "company": "company name",
                "duration": "duration string",
                "years": number,
                "description": "brief description"
              }
            ],
            "education": [
              {
                "degree": "degree name",
                "institution": "institution name",
                "year": "graduation year",
                "field": "field of study"
              }
            ],
            "summary": "brief professional summary"
          }
          Be precise and extract only clearly mentioned skills and experience.`
        },
        {
          role: 'user',
          content: `Extract skills and information from this CV text:\n\n${text}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}') as AIExtractionResult;
    return result;
  } catch (error) {
    console.error('Error extracting skills from text:', error);
    throw new Error('Failed to extract skills from CV text');
  }
}

// Helper function to predict career path
export async function predictCareerPath(candidateData: OpenAICareerPredictionPrompt['candidateData']): Promise<CareerPredictionResult> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a career counselor AI. Based on candidate's skills, experience, and education, predict their career path.
          Return a structured JSON response with:
          {
            "current_role": "most suitable current role",
            "predicted_roles": [
              {
                "title": "role title",
                "match_score": 0.95,
                "reasoning": "why this role fits"
              }
            ],
            "career_path": [
              {
                "role": "next role",
                "timeline": "6-12 months",
                "requirements": ["skill1", "skill2"]
              }
            ],
            "skill_gaps": [
              {
                "skill": "missing skill",
                "importance": "high|medium|low",
                "recommendation": "how to acquire"
              }
            ],
            "salary_prediction": {
              "current_range": {"min": 50000, "max": 70000},
              "growth_potential": {"min": 80000, "max": 120000}
            },
            "confidence_score": 0.85
          }`
        },
        {
          role: 'user',
          content: `Predict career path for candidate with data: ${JSON.stringify(candidateData)}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}') as CareerPredictionResult;
    return result;
  } catch (error) {
    console.error('Error predicting career path:', error);
    throw new Error('Failed to predict career path');
  }
}

// Helper function to generate job match reasoning
export async function generateJobMatchReasoning(candidateSkills: any[], jobRequirements: any): Promise<JobMatchReasoning> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert recruiter AI. Analyze how well a candidate matches a job.
          Return a JSON response with:
          {
            "overall_match": 0.85,
            "strengths": ["matching areas"],
            "concerns": ["potential gaps"],
            "reasoning": "detailed explanation",
            "recommendation": "strong_match|good_match|moderate_match|poor_match"
          }`
        },
        {
          role: 'user',
          content: `Analyze match between:
          Candidate Skills: ${JSON.stringify(candidateSkills)}
          Job Requirements: ${JSON.stringify(jobRequirements)}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}') as JobMatchReasoning;
    return result;
  } catch (error) {
    console.error('Error generating job match reasoning:', error);
    throw new Error('Failed to generate job match reasoning');
  }
}

// Helper function to create embeddings for vector matching
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw new Error('Failed to create embedding');
  }
}