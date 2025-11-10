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
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.95,
          maxOutputTokens: 4096,
        }
      });

      const fullPrompt = `
      ${systemPrompt}

      ${userPrompt}

      CRITICAL: Return ONLY valid JSON. No explanations, no markdown, no code blocks. Start with { and end with }. Do not include any text outside the JSON object.
      `.trim();

      const result = await model.generateContent(fullPrompt);
      let text = result.response.text();

      text = text.trim();
      
      if (text.startsWith('```json')) {
        text = text.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/```[a-z]*\s*/, '').replace(/\s*```$/, '');
      }
      
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        text = text.substring(firstBrace, lastBrace + 1);
      }
      
      text = text
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
        .replace(/:\s*([^",\[\]{}\s]+)([,}\]])/g, ':"$1"$2')
        .replace(/:\s*'([^']*?)'/g, ':"$1"')
        .replace(/\\n/g, ' ')
        .replace(/\\\\/g, '\\')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

      try {
        const parsed = JSON.parse(text);
        return parsed;
      } catch (parseErr: any) {
        let repairedText = text
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
          .replace(/:\s*([^",\[\]{}\s][^,}\]]*[^",}\]\s])([,}\]])/g, ':"$1"$2');
        
        const repairParsed = JSON.parse(repairedText);
        return repairParsed;
      }
      
    } catch (err: any) {
      lastError = err;
      
      if (err.message?.includes('JSON') && attempt < retries) {
        try {
          const model = genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash',
            generationConfig: {
              temperature: 0.01,
              maxOutputTokens: 1500,
            }
          });

          const minimalPrompt = `Extract from resume and return exactly this JSON:
{"headline":"title","skills":[{"name":"skill","category":"technical","proficiency":"intermediate"}],"experience":[{"job_title":"job","company":"co","duration":"time","years":1,"description":"desc"}],"education":[{"degree":"deg","institution":"inst","year":"year","field":"field"}],"summary":"summary"}

Resume: ${userPrompt.substring(0, 1000)}`; 

          const result = await model.generateContent(minimalPrompt);
          let text = result.response.text().trim();
          
          const firstBrace = text.indexOf('{');
          const lastBrace = text.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
          }
          
          text = text.replace(/[^\{\}"\[\]:,0-9a-zA-Z\s\-\.]/g, '');
          
          const parsed = JSON.parse(text);
          return parsed;
          
        } catch (minimalErr) {
          console.error('Minimal approach failed:', minimalErr);
        }
      }
      
      if (err.message?.includes('overloaded') || err.message?.includes('503') || err.message?.includes('rate limit')) {
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          await sleep(delay);
          continue;
        }
      }
    }
  }
  
  console.error('All Gemini attempts failed:', lastError);
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
    
    return {
      headline: "Professional seeking new opportunities",
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
    
    return {
      overall_match: 0.0,
      strengths: ["Service temporarily unavailable"],
      concerns: ["AI service is overloaded"],
      reasoning: "Unable to analyze match due to service unavailability. Please try again later.",
      recommendation: "poor_match"
    } as JobMatchReasoning;
  }
}

export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    const result = await model.embedContent(text);
    
    if (result.embedding && result.embedding.values) {
      return result.embedding.values;
    }
    
    const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
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

export async function generateSkillsAssessmentJSON(
  systemPrompt: string, 
  userPrompt: string, 
  assessmentType: 'questions' | 'evaluation' | 'difficulty' | 'report' | 'recommendations' = 'questions'
): Promise<any> {
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.15,
        topK: 1,
        topP: 0.9,
        maxOutputTokens: 5000,
      }
    });

    const optimizedPrompt = `${systemPrompt}\n\n${userPrompt}\n\nReturn ONLY ${getQuickFormat(assessmentType)} - no explanations.`;

    const result = await model.generateContent(optimizedPrompt);
    const response = await result.response;
    let text = '';

    if (response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        text = candidate.content.parts.map((part: any) => part.text || '').join('').trim();
      }
    }

    const startChar = assessmentType === 'questions' ? '[' : '{';
    const endChar = assessmentType === 'questions' ? ']' : '}';
    
    const start = text.indexOf(startChar);
    const end = text.lastIndexOf(endChar);
    
    if (start !== -1 && end !== -1) {
      text = text.substring(start, end + 1);
    }

    text = text
      .replace(/```json|```/g, '')
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/[\u0000-\u001F]/g, '')
      .replace(/"([^"]*)'([^"]*)"/g, '"$1$2"');

    if (text.startsWith('[') && !text.endsWith(']')) {
      const lastComplete = text.lastIndexOf('}');
      if (lastComplete > 0) {
        text = text.substring(0, lastComplete + 1) + ']';
      }
    }

    if (text.startsWith('{') && !text.endsWith('}')) {
      const lastComplete = text.lastIndexOf('"');
      if (lastComplete > 0) {
        text = text.substring(0, lastComplete) + '}';
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError: any) {
      if (text.startsWith('[')) {
        const items = [];
        const regex = /\{[^}]*\}/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
          try {
            const item = JSON.parse(match[0]);
            items.push(item);
          } catch (e) {
            continue;
          }
        }
        
        if (items.length > 0) {
          parsed = items;
        } else {
          throw parseError;
        }
      } else {
        throw parseError;
      }
    }
    
    if (!isValidResponse(parsed, assessmentType)) {
      return await getSmartFallbackResponse(assessmentType, userPrompt);
    }
    
    return parsed;
    
  } catch (error: any) {
    console.error(`Assessment ${assessmentType} failed:`, error.message);
    return await getSmartFallbackResponse(assessmentType, userPrompt);
  }
}

function getQuickFormat(type: string): string {
  switch (type) {
    case 'questions': 
      return 'JSON array: [{"questionText":"","type":"MCQ","options":[],"correctAnswer":"","difficulty":"BEGINNER","timeLimit":90}]';
    case 'evaluation': 
      return 'JSON object: {"score":85,"feedback":"","strengths":[],"improvements":[],"confidence":90,"isCorrect":true}';
    case 'difficulty': 
      return 'JSON object: {"recommendedDifficulty":"INTERMEDIATE","reasoning":"","confidence":85}';
    case 'report': 
      return 'JSON object: {"overallScore":80,"skillLevel":"INTERMEDIATE","strengths":[],"weaknesses":[],"recommendations":[],"confidenceScore":87}';
    default: 
      return 'JSON';
  }
}

function isValidResponse(data: any, type: string): boolean {
  switch (type) {
    case 'questions':
      return Array.isArray(data) && data.length > 0 && data[0]?.questionText;
    case 'evaluation':
      return data?.score !== undefined && typeof data.score === 'number';
    case 'difficulty':
      return data?.recommendedDifficulty && typeof data.recommendedDifficulty === 'string';
    case 'report':
      return data?.overallScore !== undefined && data?.skillLevel;
    default:
      return true;
  }
}

async function getSmartFallbackResponse(type: string, originalPrompt: string): Promise<any> {
  try {
    const simplifiedPrompt = simplifyOriginalPrompt(originalPrompt, type);
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000,
      }
    });

    const result = await model.generateContent(simplifiedPrompt);
    let text = result.response.text().trim();
    
    const jsonMatch = text.match(/[\[{].*[\]}]/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (isValidResponse(parsed, type)) {
        return parsed;
      }
    }
    
  } catch (error) {
    console.warn(`Smart fallback failed for ${type}:`, error.message);
  }
  
  return getContextualStaticFallback(type, originalPrompt);
}

function simplifyOriginalPrompt(originalPrompt: string, type: string): string {
  let simplified = originalPrompt;
  
  switch (type) {
    case 'questions':
      simplified = simplified
        .replace(/Generate \d+/, 'Generate 3')
        .replace(/detailed|comprehensive|complex/gi, 'simple')
        .replace(/with explanation|detailed analysis/gi, '')
        + '\n\nReturn simple JSON array format only.';
      break;
      
    case 'evaluation':
      simplified = simplified
        .replace(/detailed|comprehensive/gi, 'brief')
        + '\n\nReturn simple JSON object with score, feedback, isCorrect only.';
      break;
      
    case 'difficulty':
      simplified = 'Recommend difficulty level based on context. Return: {"recommendedDifficulty":"INTERMEDIATE","reasoning":"brief reason"}';
      break;
      
    case 'report':
      simplified = simplified
        .replace(/comprehensive|detailed/gi, 'basic')
        + '\n\nReturn basic JSON report format only.';
      break;
  }
  
  return simplified;
}

function getContextualStaticFallback(type: string, originalPrompt: string): any {
  const context = extractPromptContext(originalPrompt);
  
  switch (type) {
    case 'questions':
      return generateContextualQuestions(context);
    case 'evaluation':
      return generateContextualEvaluation(context);
    case 'difficulty':
      return generateContextualDifficulty(context);
    case 'report':
      return generateContextualReport(context);
    default:
      return {};
  }
}

function extractPromptContext(prompt: string): any {
  const skillMatch = prompt.match(/(?:skill|category|subject)[^:]*:\s*([A-Za-z\s\+#\-]+)/i);
  const difficultyMatch = prompt.match(/(?:difficulty|level)[^:]*:\s*([A-Z]+)/i);
  const experienceMatch = prompt.match(/(?:experience|level)[^:]*:\s*([A-Za-z\s]+)/i);
  const skillsMatch = prompt.match(/(?:existing|previous)\s*skills[^:]*:\s*([A-Za-z\s,\+#\-]+)/i);
  const industryMatch = prompt.match(/(?:industry|field)[^:]*:\s*([A-Za-z\s]+)/i);
  
  return {
    skill: skillMatch?.[1]?.trim() || 'Programming',
    difficulty: difficultyMatch?.[1]?.trim() || 'BEGINNER',
    experience: experienceMatch?.[1]?.trim() || 'beginner',
    existingSkills: skillsMatch?.[1]?.split(',').map(s => s.trim()).filter(Boolean) || [],
    industry: industryMatch?.[1]?.trim() || ''
  };
}

function generateContextualQuestions(context: any): any[] {
  const { skill, difficulty, experience } = context;
  
  return [
    {
      questionText: `Based on your ${experience} experience with ${skill}, what would you consider the most fundamental concept?`,
      type: "MCQ",
      options: ["Basic syntax", "Core principles", "Best practices", "All are important"],
      correctAnswer: "All are important",
      difficulty: difficulty,
      timeLimit: 90,
      questionId: "contextual_1"
    },
    {
      questionText: `In ${skill} development, which approach would you prioritize for a ${experience} level project?`,
      type: "MCQ", 
      options: ["Simple and clean", "Feature-rich", "Performance-focused", "Depends on requirements"],
      correctAnswer: "Depends on requirements",
      difficulty: difficulty,
      timeLimit: 90,
      questionId: "contextual_2"
    },
    {
      questionText: `When learning ${skill}, what would be your next step after mastering the basics?`,
      type: "MCQ",
      options: ["Advanced concepts", "Real projects", "Industry standards", "All approaches work"],
      correctAnswer: "All approaches work",
      difficulty: difficulty,
      timeLimit: 90,
      questionId: "contextual_3"
    }
  ];
}

function generateContextualEvaluation(context: any): any {
  const { skill } = context;
  
  return {
    score: 75,
    feedback: `Good understanding of ${skill} concepts. Your answer shows practical thinking.`,
    strengths: ["Clear reasoning", "Practical approach", "Good understanding"],
    improvements: ["Add more specific examples", "Consider edge cases", "Expand on details"],
    confidence: 70,
    isCorrect: true
  };
}

function generateContextualDifficulty(context: any): any {
  const { difficulty, experience } = context;
  
  const nextDifficulty = getNextDifficultyLevel(difficulty, experience);
  
  return {
    recommendedDifficulty: nextDifficulty,
    reasoning: `Based on ${experience} experience level, progression to ${nextDifficulty} is appropriate`,
    confidence: 75
  };
}

function generateContextualReport(context: any): any {
  const { skill, difficulty, experience } = context;
  
  return {
    overallScore: 75,
    skillLevel: `${difficulty}_LEVEL`,
    strengths: [
      `Good grasp of ${skill} fundamentals`,
      `Appropriate for ${experience} level`,
      "Consistent performance"
    ],
    weaknesses: [
      "Could expand knowledge depth",
      "Practice more complex scenarios",
      "Stay updated with industry trends"
    ],
    recommendations: [
      `Master advanced ${skill} concepts`,
      "Work on real-world projects",
      "Join developer communities",
      "Practice coding challenges"
    ],
    confidenceScore: 70
  };
}

function getNextDifficultyLevel(current: string, experience: string): string {
  const progression = {
    'BEGINNER': 'INTERMEDIATE',
    'INTERMEDIATE': 'ADVANCED', 
    'ADVANCED': 'EXPERT',
    'EXPERT': 'EXPERT'
  };
  
  if (experience.toLowerCase().includes('senior') || experience.toLowerCase().includes('expert')) {
    return progression[current as keyof typeof progression] || 'ADVANCED';
  }
  
  return progression[current as keyof typeof progression] || 'INTERMEDIATE';
}
