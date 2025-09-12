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

// Fixed generateGeminiJSON function in openai.ts

export async function generateGeminiJSON(systemPrompt: string, userPrompt: string, retries: number = 3): Promise<any> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${retries} for Gemini API call`);
      
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1, // Lower temperature for better JSON consistency
          topK: 1,
          topP: 0.95,
          maxOutputTokens: 4096, // Increased token limit
        }
      });

      const fullPrompt = `
      ${systemPrompt}

      ${userPrompt}

      CRITICAL: Return ONLY valid JSON. No explanations, no markdown, no code blocks. Start with { and end with }. Do not include any text outside the JSON object.
      `.trim();

      const result = await model.generateContent(fullPrompt);
      let text = result.response.text();

      console.log("Raw Gemini response (first 200 chars):", text.substring(0, 200));
      console.log("Raw Gemini response (last 200 chars):", text.substring(Math.max(0, text.length - 200)));

      // Aggressive JSON cleanup
      text = text.trim();
      
      // Remove markdown code blocks
      if (text.startsWith('```json')) {
        text = text.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/```[a-z]*\s*/, '').replace(/\s*```$/, '');
      }
      
      // Remove any text before first { and after last }
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        text = text.substring(firstBrace, lastBrace + 1);
      }
      
      // Clean up common JSON issues
      text = text
        .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/:\s*([^",\[\]{}\s]+)([,}\]])/g, ':"$1"$2') // Quote unquoted string values
        .replace(/:\s*'([^']*?)'/g, ':"$1"') // Replace single quotes with double quotes
        .replace(/\\n/g, ' ') // Replace newlines with spaces
        .replace(/\\\\/g, '\\') // Fix double backslashes
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters

      console.log("Cleaned JSON (first 200 chars):", text.substring(0, 200));
      console.log("Cleaned JSON (last 200 chars):", text.substring(Math.max(0, text.length - 200)));

      // Additional safety - try to fix malformed JSON
      try {
        const parsed = JSON.parse(text);
        console.log("✅ JSON parsing successful");
        return parsed;
      } catch (parseErr: any) {
        console.log("First parse failed, trying JSON repair...");
        
        // Try to fix common JSON issues
        let repairedText = text
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas again
          .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote all unquoted keys
          .replace(/:\s*([^",\[\]{}\s][^,}\]]*[^",}\]\s])([,}\]])/g, ':"$1"$2'); // Quote complex unquoted values
        
        const repairParsed = JSON.parse(repairedText);
        console.log("✅ JSON repair successful");
        return repairParsed;
      }
      
    } catch (err: any) {
      lastError = err;
      console.error(`Attempt ${attempt} failed:`, err.message);
      
      // For JSON parsing errors, try with a much simpler prompt
      if (err.message?.includes('JSON') && attempt < retries) {
        console.log("Trying with minimal JSON structure...");
        
        try {
          const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-flash',
            generationConfig: {
              temperature: 0.01, // Very low temperature
              maxOutputTokens: 1500,
            }
          });

          // Much simpler and more constrained prompt
          const minimalPrompt = `Extract from resume and return exactly this JSON:
{"headline":"title","skills":[{"name":"skill","category":"technical","proficiency":"intermediate"}],"experience":[{"job_title":"job","company":"co","duration":"time","years":1,"description":"desc"}],"education":[{"degree":"deg","institution":"inst","year":"year","field":"field"}],"summary":"summary"}

Resume: ${userPrompt.substring(0, 1000)}`; 

          const result = await model.generateContent(minimalPrompt);
          let text = result.response.text().trim();
          
          // Extract JSON more aggressively
          const firstBrace = text.indexOf('{');
          const lastBrace = text.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
          }
          
          // Remove any non-JSON content
          text = text.replace(/[^\{\}"\[\]:,0-9a-zA-Z\s\-\.]/g, '');
          
          const parsed = JSON.parse(text);
          console.log("✅ Minimal JSON parsing successful");
          return parsed;
          
        } catch (minimalErr) {
          console.error("Minimal approach also failed:", minimalErr);
        }
      }
      
      // Rate limiting backoff
      if (err.message?.includes('overloaded') || err.message?.includes('503') || err.message?.includes('rate limit')) {
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Rate limited, waiting ${delay}ms...`);
          await sleep(delay);
          continue;
        }
      }
    }
  }
  
  console.error("All Gemini attempts failed:", lastError);
  throw new Error(`Failed to get response from Gemini after ${retries} attempts: ${lastError?.message || 'Unknown error'}`);
}


export async function extractSkillsFromText(text: string): Promise<AIExtractionResult> {
  try {
const systemPrompt = `You are an expert HR analyst. Extract and categorize information from CV text.

CATEGORIZATION RULES:
- SKILLS: Only professional technical and soft skills
- EDUCATION: Degrees, certifications, courses, training programs  
- LANGUAGES: Spoken/written languages with proficiency levels
- EXPERIENCE: Job history and work experience

Return ONLY valid JSON:

{
  "headline": "Professional headline (max 120 characters)",
  "skills": [
    {
      "name": "skill name",
      "category": "technical | soft",
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
      "degree": "degree or certification name",
      "institution": "institution/provider name",
      "year": "completion year or range",
      "field": "field of study or specialization"
    }
  ],
  "languages": [
    {
      "language": "language name",
      "proficiency": "native | fluent | intermediate | basic",
      "notes": "additional context if any"
    }
  ],
  "summary": "2–3 sentence professional summary"
}

SKILLS (Include only these):
- Technical: Programming languages, software tools, frameworks
- Soft: Leadership, communication, problem-solving, teamwork

EDUCATION (Include certifications here):
- Degrees: Bachelor's, Master's, PhD
- Certifications: AWS Certified, Google Analytics, PMP, CISSP
- Courses: Online courses, bootcamps, training programs

LANGUAGES (Extract separately):
- English, Urdu, Arabic, Spanish, French, etc.
- Include proficiency level if mentioned`;

    const userPrompt = `Extract skills, headline, and information from this CV text:\n\n${text}`;

    return await generateGeminiJSON(systemPrompt, userPrompt);
  } catch (error: any) {
    console.error('Error extracting skills from text:', error);
    
    // Return a fallback structure if AI fails
    console.log('Returning fallback structure due to AI service unavailability');
    return {
      headline: "Professional seeking new opportunities", // Fallback headline
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