import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIExtractionResult,
  CareerPredictionResult,
  JobMatchReasoning,
  OpenAICareerPredictionPrompt,
  OpenAIJobMatchPrompt
} from '../types/candidate.types';

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateGeminiJSON(systemPrompt: string, userPrompt: string, retries: number = 3): Promise<any> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${retries} for Gemini API call`);
      
      // Updated model name - use one of these available models:
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash', // or 'gemini-1.5-pro' for better quality
        generationConfig: {
          temperature: 0.3,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        }
      });

      const fullPrompt = `
System:
${systemPrompt}

User:
${userPrompt}

Please respond with valid JSON only.
`.trim();

      const result = await model.generateContent(fullPrompt);
      const text = result.response.text();

      // Clean up the response to extract JSON
      let jsonText = text.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      return JSON.parse(jsonText);
      
    } catch (err: any) {
      lastError = err;
      console.error(`Attempt ${attempt} failed:`, err.message);
      
      // Check if it's a rate limit or overload error
      if (err.message?.includes('overloaded') || err.message?.includes('503') || err.message?.includes('rate limit')) {
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Waiting ${delay}ms before retry...`);
          await sleep(delay);
          continue;
        }
      }
      
      // If it's not a retryable error, break
      if (attempt >= retries) {
        break;
      }
    }
  }
  
  console.error("All Gemini attempts failed:", lastError);
  throw new Error(`Failed to get response from Gemini after ${retries} attempts: ${lastError?.message || 'Unknown error'}`);
}

// ---------------------- extractSkillsFromText ----------------------

export async function extractSkillsFromText(text: string): Promise<AIExtractionResult> {
  try {
   const systemPrompt = `You are an expert HR analyst. Extract structured information from the following CV/resume text.

Return ONLY a valid JSON object in this exact format:

{
  "skills": [
    {
      "name": "skill name",
      "category": "technical | soft | language | certification",
      "proficiency": "beginner | intermediate | advanced | expert",
      "years_experience": number
    }
  ],
  "experience": [
    {
      "job_title": "title",
      "company": "company name",
      "duration": "e.g., Jan 2022 - May 2023",
      "years": number,
      "description": "brief summary of work"
    }
  ],
  "education": [
    {
      "degree": "degree name",
      "institution": "institution name",
      "year": "graduation year or range",
      "field": "field of study"
    }
  ],
  "summary": "2–3 sentence professional summary"
}

Instructions:
- Be accurate and extract only explicitly stated information.
- Categorize each skill carefully.
- For missing data, omit the field (do not use 'Not Available').
- Do NOT include any explanation or text outside the JSON.
`;

    const userPrompt = `Extract skills and information from this CV text:\n\n${text}`;

    return await generateGeminiJSON(systemPrompt, userPrompt);
  } catch (error: any) {
    console.error('Error extracting skills from text:', error);
    
    // Return a fallback structure if AI fails
    console.log('Returning fallback structure due to AI service unavailability');
    return {
      skills: [
        {
          name: "Communication",
          category: "soft",
          proficiency: "intermediate",
          years_experience: 2
        }
      ],
      experience: [
        {
          job_title: "Not Available",
          company: "Not Available",
          duration: "Not Available",
          years: 0,
          description: "AI service temporarily unavailable"
        }
      ],
      education: [
        {
          degree: "Not Available",
          institution: "Not Available",
          year: "Not Available",
          field: "Not Available"
        }
      ],
      summary: "AI service temporarily unavailable. Please try again later."
    } as AIExtractionResult;
  }
}

// ---------------------- predictCareerPath ----------------------

export async function predictCareerPath(candidateData: OpenAICareerPredictionPrompt['candidateData']): Promise<CareerPredictionResult> {
  try {
    const systemPrompt = `You are a career counselor AI. Based on candidate's skills, experience, and education, predict their career path.
Return ONLY a structured JSON response with:
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
}
Return only valid JSON, no other text.`;

    const userPrompt = `Predict career path for candidate with data: ${JSON.stringify(candidateData)}`;

    return await generateGeminiJSON(systemPrompt, userPrompt);
  } catch (error) {
    console.error('Error predicting career path:', error);
    
    // Return fallback structure
    return {
      current_role: "General Professional",
      predicted_roles: [
        {
          title: "Service Temporarily Unavailable",
          match_score: 0.0,
          reasoning: "AI service is currently overloaded"
        }
      ],
      career_path: [
        {
          role: "Please try again later",
          timeline: "N/A",
          requirements: ["Service availability"]
        }
      ],
      skill_gaps: [
        {
          skill: "Service availability",
          importance: "high",
          recommendation: "Please try again when service is available"
        }
      ],
      salary_prediction: {
        current_range: { min: 0, max: 0 },
        growth_potential: { min: 0, max: 0 }
      },
      confidence_score: 0.0
    } as CareerPredictionResult;
  }
}

// ---------------------- generateJobMatchReasoning ----------------------

export async function generateJobMatchReasoning(candidateSkills: any[], jobRequirements: any): Promise<JobMatchReasoning> {
  try {
    const systemPrompt = `You are an expert recruiter AI. Analyze how well a candidate matches a job.
Return ONLY a JSON response with:
{
  "overall_match": 0.85,
  "strengths": ["matching areas"],
  "concerns": ["potential gaps"],
  "reasoning": "detailed explanation",
  "recommendation": "strong_match|good_match|moderate_match|poor_match"
}
Return only valid JSON, no other text.`;

    const userPrompt = `Analyze match between:
Candidate Skills: ${JSON.stringify(candidateSkills)}
Job Requirements: ${JSON.stringify(jobRequirements)}`;

    return await generateGeminiJSON(systemPrompt, userPrompt);
  } catch (error) {
    console.error('Error generating job match reasoning:', error);
    
    // Return fallback structure
    return {
      overall_match: 0.0,
      strengths: ["Service temporarily unavailable"],
      concerns: ["AI service is overloaded"],
      reasoning: "Unable to analyze match due to service unavailability. Please try again later.",
      recommendation: "poor_match"
    } as JobMatchReasoning;
  }
}

// ---------------------- createEmbedding ----------------------

export async function createEmbedding(text: string): Promise<number[]> {
  try {
    // Use the embedding model for Gemini
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    const result = await model.embedContent(text);
    
    if (result.embedding && result.embedding.values) {
      return result.embedding.values;
    }
    
    // Fallback: generate synthetic embedding if the above doesn't work
    const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Convert this text into a numerical embedding vector of exactly 128 floating point numbers between -1 and 1.
Text: """${text}"""

Return only a JSON array of 128 numbers like: [0.123, -0.546, 0.789, ...]`;

    const fallbackResult = await fallbackModel.generateContent(prompt);
    const content = fallbackResult.response.text();

    let jsonText = content.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const embedding = JSON.parse(jsonText);
    if (!Array.isArray(embedding)) {
      throw new Error('Invalid embedding format');
    }

    return embedding as number[];
  } catch (error) {
    console.error('Error creating embedding with Gemini:', error);
    throw new Error('Failed to create embedding');
  }
}