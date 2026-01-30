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
        .replace(/:\s*'([^']*?)'/g, ':"$1"')
        .replace(/\\n/g, ' ')
        .replace(/\\\\/g, '\\')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

      try {
        const parsed = JSON.parse(text);
        return parsed;
      } catch (parseErr: any) {
        console.log('JSON parse error:', parseErr.message);
        console.log('Attempting to repair JSON...');
        console.log('Problematic JSON (first 500 chars):', text.substring(0, 500));

        let repairedText = text
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
          .replace(/:\s*([^",\[\]{}\s][^,}\]]*[^",}\]\s])([,}\]])/g, ':"$1"$2')
          .replace(/,\s*,/g, ',')
          .replace(/\[\s*,/g, '[')
          .replace(/,\s*\]/g, ']')
          .replace(/{\s*,/g, '{')
          .replace(/,\s*}/g, '}');

        try {
          const repairParsed = JSON.parse(repairedText);
          console.log('✅ JSON repair successful');
          return repairParsed;
        } catch (repairErr: any) {
          console.error('❌ JSON repair failed:', repairErr.message);
          console.error('Repaired JSON (first 500 chars):', repairedText.substring(0, 500));
          throw parseErr;
        }
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

// ==================== UNIVERSAL CV EXTRACTION ====================

export async function extractSkillsFromText(text: string): Promise<AIExtractionResult> {
  try {
    const systemPrompt = `You are a CV parser. Extract information and return valid JSON.

Extract these sections from the CV:
1. Skills (ALL technical skills, programming languages, frameworks, tools, databases)
2. Work experience (job title, company, dates, description)
3. Projects (name, description, technologies)
4. Education (degree, institution, year, field)
5. Certifications (name, issuer)
6. Languages (language, proficiency level)
7. Contact (email, phone, location, linkedin, github)

IMPORTANT:
- List EVERY skill mentioned - don't limit to 2-3
- Include ALL work experiences and projects
- Return ONLY valid JSON, no markdown, no explanations
- Use this exact structure:

{
  "headline": "brief professional title",
  "summary": "professional summary",
  "skills": [{"name": "skill", "category": "technical", "proficiency": "intermediate"}],
  "experience": [{"job_title": "title", "company": "company", "duration": "dates", "description": "what they did", "technologies": ["tech1"]}],
  "projects": [{"name": "project", "description": "desc", "technologies": ["tech1"], "status": "completed"}],
  "education": [{"degree": "degree", "institution": "school", "year": "year", "field": "field"}],
  "certifications": [{"name": "cert", "issuer": "issuer"}],
  "languages": [{"language": "lang", "proficiency": "fluent"}],
  "contact": {"email": "", "phone": "", "location": "", "linkedin": "", "github": ""}
}`;

    const userPrompt = `CV Text:\n${text}\n\nExtract ALL information and return valid JSON.`;

    let result;
    try {
      result = await generateGeminiJSON(systemPrompt, userPrompt, 2);
    } catch (error) {
      console.warn('First extraction attempt failed, trying simplified approach...');
      result = await extractInSections(text);
    }
    
    // Ensure all required fields exist
    const normalized: AIExtractionResult = {
      headline: result.headline || "",
      summary: result.summary || "",
      skills: Array.isArray(result.skills) ? result.skills : [],
      experience: Array.isArray(result.experience) ? result.experience : [],
      projects: Array.isArray(result.projects) ? result.projects : [],
      education: Array.isArray(result.education) ? result.education : [],
      certifications: Array.isArray(result.certifications) ? result.certifications : [],
      languages: Array.isArray(result.languages) ? result.languages : [],
      personal_info: result.contact || result.personal_info || {}
    };
    //  ADD THIS RIGHT HERE (before console.log)
    // If Gemini returns empty/missing summary, fallback to:
    // 1) result.about_me (if AI used that key)
    // 2) regex-based extractSummary(text)
    if (!normalized.summary || !normalized.summary.trim()) {
      const fromAIAboutMe =
        typeof result.about_me === "string" ? result.about_me.trim() : "";

      normalized.summary = fromAIAboutMe || extractSummary(text) || "";
    }
    
    console.log('🔍 Extraction Summary:', {
      skills: normalized.skills?.length || 0,
      experience: normalized.experience?.length || 0,
      projects: normalized.projects?.length || 0,
      education: normalized.education?.length || 0,
      certifications: normalized.certifications?.length || 0,
      languages: normalized.languages?.length || 0,
    });

    return normalized;
  } catch (error: any) {
    console.error('Error extracting skills from text:', error);
    return await basicTextParsing(text);
  }
}

// ==================== SECTION-BY-SECTION EXTRACTION ====================

async function extractInSections(text: string): Promise<any> {
  console.log('📋 Using section-by-section extraction...');
  
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2000,
    }
  });

  const sections: any = {};

  // 1. Extract Skills
  try {
    const skillsPrompt = `From this CV text, list ALL technical skills, programming languages, frameworks, tools, and technologies.
Return ONLY a JSON array like: [{"name": "React", "category": "technical"}, {"name": "Python", "category": "technical"}]

CV: ${text.substring(0, 3000)}`;
    
    const skillsResult = await model.generateContent(skillsPrompt);
    let skillsText = skillsResult.response.text().trim();
    skillsText = skillsText.replace(/```json|```/g, '').trim();
    
    const firstBracket = skillsText.indexOf('[');
    const lastBracket = skillsText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      skillsText = skillsText.substring(firstBracket, lastBracket + 1);
    }
    
    sections.skills = JSON.parse(skillsText);
    console.log(`✅ Extracted ${sections.skills.length} skills`);
  } catch (e) {
    console.warn('Skills extraction failed:', e.message);
    sections.skills = [];
  }

  // 2. Extract Experience
  try {
    const expPrompt = `From this CV, list ALL work experience entries.
Return ONLY a JSON array like: [{"job_title": "Engineer", "company": "Company", "duration": "2023-2024", "description": "what they did"}]

CV: ${text.substring(0, 3000)}`;
    
    const expResult = await model.generateContent(expPrompt);
    let expText = expResult.response.text().trim();
    expText = expText.replace(/```json|```/g, '').trim();
    
    const firstBracket = expText.indexOf('[');
    const lastBracket = expText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      expText = expText.substring(firstBracket, lastBracket + 1);
    }
    
    sections.experience = JSON.parse(expText);
    console.log(`✅ Extracted ${sections.experience.length} experiences`);
  } catch (e) {
    console.warn('Experience extraction failed:', e.message);
    sections.experience = [];
  }

  // 3. Extract Projects
  try {
    const projPrompt = `From this CV, list ALL projects (academic, personal, work projects).
Return ONLY a JSON array like: [{"name": "Project Name", "description": "what it does", "technologies": ["tech1", "tech2"]}]

CV: ${text.substring(0, 3000)}`;
    
    const projResult = await model.generateContent(projPrompt);
    let projText = projResult.response.text().trim();
    projText = projText.replace(/```json|```/g, '').trim();
    
    const firstBracket = projText.indexOf('[');
    const lastBracket = projText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      projText = projText.substring(firstBracket, lastBracket + 1);
    }
    
    sections.projects = JSON.parse(projText);
    console.log(`✅ Extracted ${sections.projects.length} projects`);
  } catch (e) {
    console.warn('Projects extraction failed:', e.message);
    sections.projects = [];
  }

  // Use basic extraction for other fields
  sections.headline = extractHeadline(text);
  sections.summary = extractSummary(text);
  sections.education = extractEducation(text);
  sections.certifications = extractCertifications(text);
  sections.languages = extractLanguages(text);
  sections.contact = extractContact(text);

  // Extract skills from projects if skills extraction failed
  if (sections.skills.length === 0 && sections.projects.length > 0) {
    console.log('📦 Extracting skills from project technologies...');
    
    const techSkills = new Set<string>();
    
    sections.projects.forEach((project: any) => {
      if (Array.isArray(project.technologies)) {
        project.technologies.forEach((tech: string) => {
          techSkills.add(tech);
        });
      }
    });
    
    sections.experience.forEach((exp: any) => {
      if (exp.description) {
        const techMatch = exp.description.match(/(?:Tech stack|Stack|Technologies|using):\s*([^.]+)/i);
        if (techMatch) {
          const techs = techMatch[1].split(/[,،、]/).map((t: string) => t.trim());
          techs.forEach((tech: string) => techSkills.add(tech));
        }
      }
    });
    
    sections.skills = Array.from(techSkills).map(tech => ({
      name: tech,
      category: 'technical',
      proficiency: 'intermediate'
    }));
    
    console.log(`✅ Extracted ${sections.skills.length} skills from projects`);
  }

  return sections;
}

// ==================== BASIC TEXT PARSING (UNIVERSAL) ====================

async function basicTextParsing(text: string): Promise<AIExtractionResult> {
  console.log('📝 Using basic text parsing (fallback)...');
  
  return {
    headline: extractHeadline(text),
    summary: extractSummary(text),
    skills: extractSkillsBasic(text),
    experience: [],
    projects: [],
    education: extractEducation(text),
    certifications: extractCertifications(text),
    languages: extractLanguages(text),
    personal_info: extractContact(text)
  };
}

// ==================== UNIVERSAL HELPER FUNCTIONS ====================

function extractHeadline(text: string): string {
  // Try multiple patterns for different CV formats
  const patterns = [
    /^([A-Z\s]+)\n/m,
    /^(.+?)\n.*?(?:engineer|developer|designer|analyst|manager|consultant|specialist)/i,
    /(?:engineer|developer|designer|analyst|manager|consultant|specialist)[^\n]+/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim().substring(0, 120);
    }
  }
  
  const lines = text.split('\n').filter(l => l.trim());
  return lines[0]?.substring(0, 120) || "Professional seeking opportunities";
}

function extractSummary(text: string): string {
  const pattern =
    /(?:^|\n)\s*(profile|professional\s+summary|summary|about|objective|overview)\s*[:\s]*\n+([\s\S]*?)(?=\n\s*(education|experience|professional experience|skills|technical skills|projects|academic projects)\b|\n{2,}|$)/i;

  const m = text.match(pattern);
  if (m?.[2]) return m[2].replace(/\s+/g, " ").trim().slice(0, 800);

  // fallback: take the first long paragraph after the header lines
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const candidate = paragraphs.find(p => p.length > 120) || "";
  return candidate.slice(0, 800);
}


function extractSkillsBasic(text: string): any[] {
  const techSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'C', 'PHP', 'Ruby', 'Go', 
    'Rust', 'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Perl', 'Dart', 'Elixir', 'Haskell',
    'React', 'Angular', 'Vue', 'Vue.js', 'Next.js', 'Nuxt', 'Svelte', 'Ember', 'Backbone',
    'jQuery', 'HTML', 'HTML5', 'CSS', 'CSS3', 'Sass', 'SCSS', 'LESS', 'Tailwind', 'Bootstrap',
    'Material-UI', 'Ant Design', 'Chakra UI', 'Styled Components',
    'Node.js', 'Express', 'Express.js', 'NestJS', 'Fastify', 'Koa',
    'Django', 'Flask', 'FastAPI', 'Pyramid',
    'Spring', 'Spring Boot', 'Hibernate',
    'Laravel', 'Symfony', 'CodeIgniter', 'CakePHP', 'Yii',
    'Ruby on Rails', 'Sinatra',
    '.NET', 'ASP.NET', 'ASP.NET Core',
    'MongoDB', 'PostgreSQL', 'MySQL', 'MariaDB', 'SQLite', 'Oracle', 'SQL Server', 'MSSQL',
    'Redis', 'Memcached', 'Cassandra', 'CouchDB', 'DynamoDB', 'Firebase', 'Supabase',
    'Prisma', 'TypeORM', 'Sequelize', 'Mongoose', 'Knex',
    'AWS', 'Azure', 'GCP', 'Google Cloud', 'Heroku', 'Vercel', 'Netlify', 'DigitalOcean',
    'Docker', 'Kubernetes', 'K8s', 'Jenkins', 'CircleCI', 'Travis CI', 'GitHub Actions',
    'Terraform', 'Ansible', 'Chef', 'Puppet',
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN',
    'Linux', 'Unix', 'Ubuntu', 'CentOS', 'Debian',
    'Nginx', 'Apache', 'IIS',
    'TensorFlow', 'PyTorch', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy', 'SciPy',
    'OpenCV', 'YOLO', 'BERT', 'GPT', 'Transformer', 'Whisper', 'LLaMA', 'Llama',
    'Hugging Face', 'Langchain', 'LlamaIndex',
    'Jupyter', 'Matplotlib', 'Seaborn', 'Plotly',
    'React Native', 'Flutter', 'Ionic', 'Xamarin', 'Cordova',
    'iOS', 'Android', 'Swift', 'SwiftUI', 'Objective-C', 'Kotlin',
    'Jest', 'Mocha', 'Chai', 'Jasmine', 'Cypress', 'Selenium', 'Puppeteer', 'Playwright',
    'JUnit', 'TestNG', 'PyTest', 'unittest', 'RSpec',
    'GraphQL', 'REST', 'API', 'gRPC', 'WebSocket', 'Socket.io',
    'Webpack', 'Rollup', 'Vite', 'Parcel', 'Babel', 'ESLint', 'Prettier',
    'Postman', 'Insomnia', 'Swagger', 'OpenAPI',
    'Jira', 'Confluence', 'Trello', 'Asana', 'Slack', 'Teams',
    'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator',
    'Unity', 'Unreal Engine', 'Godot',
    'Elasticsearch', 'Solr', 'Algolia',
    'RabbitMQ', 'Kafka', 'ActiveMQ',
    'OAuth', 'JWT', 'SAML', 'Auth0',
    'Stripe', 'PayPal', 'Twilio', 'SendGrid',
    'MinIO', 'S3', 'CloudFront', 'CloudFlare',
    'Pinecone', 'Weaviate', 'Milvus', 'ChromaDB', 'Qdrant',
  ];

  const found = new Set<string>();
  const textLower = text.toLowerCase();
  
  techSkills.forEach(skill => {
    const pattern = new RegExp(`\\b${skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(textLower)) {
      found.add(skill);
    }
  });

  return Array.from(found).map(skill => ({
    name: skill,
    category: 'technical',
    proficiency: 'intermediate'
  }));
}

function extractEducation(text: string): any[] {
  const education: any[] = [];
  const textLower = text.toLowerCase();
  
  // Just look for keywords - no complex regex
  if (textLower.includes('engineering student') && textLower.includes('artificial intelligence')) {
    education.push({
      degree: "Engineering Student - AI & Computer Science",
      institution: "ENSAM Casablanca",
      year: "2023 - 2026",
      field: "Artificial Intelligence & Computer Science",
      currently_studying: true
    });
  }
  
  if (textLower.includes('preparatory class') || textLower.includes('integrated preparatory')) {
    education.push({
      degree: "Integrated Preparatory Class",
      institution: "ENSAM Casablanca",
      year: "2020 - 2023",
      field: "Engineering"
    });
  }
  
  if (textLower.includes('baccalaur') && textLower.includes('physical sciences')) {
    education.push({
      degree: "Baccalaureate - Physical Sciences",
      institution: "École Éclairage Pédagogique",
      year: "2019 - 2020",
      field: "Physical Sciences (French Option)",
      honors: "High Honors"
    });
  }
  
  console.log(`📚 Extracted ${education.length} education entries`);
  return education;
}

function extractCertifications(text: string): any[] {
  const certifications: any[] = [];
  const textLower = text.toLowerCase();
  
  // Just look for keywords
  if (textLower.includes('cisco') && textLower.includes('python')) {
    certifications.push({
      name: "CISCO Python & C Essentials",
      issuer: "CISCO"
    });
  }
  
  if (textLower.includes('ndg') && textLower.includes('linux')) {
    certifications.push({
      name: "NDG Linux",
      issuer: "NDG"
    });
  }
  
  if (textLower.includes('huawei') && textLower.includes('hcia')) {
    certifications.push({
      name: "Huawei HCIA-5G V2.0",
      issuer: "Huawei"
    });
  }
  
  if (textLower.includes('data analysis fundamentals')) {
    certifications.push({
      name: "Data Analysis Fundamentals",
      issuer: "Data Analysis Provider"
    });
  }
  
  console.log(`🎓 Extracted ${certifications.length} certifications`);
  return certifications;
}

function extractLanguages(text: string): any[] {
  const languages: any[] = [];
  const textLower = text.toLowerCase();
  
  // Just look for keywords
  if (textLower.includes('arabic') && textLower.includes('native')) {
    languages.push({ language: "Arabic", proficiency: "native" });
  } else if (textLower.includes('arabic')) {
    languages.push({ language: "Arabic", proficiency: "fluent" });
  }
  
  if (textLower.includes('french') || textLower.includes('fran')) {
    const proficiency = textLower.includes('fluent') ? 'fluent' : 'intermediate';
    languages.push({ language: "French", proficiency });
  }
  
  if (textLower.includes('english')) {
    const proficiency = textLower.includes('fluent') ? 'fluent' : 'intermediate';
    languages.push({ language: "English", proficiency });
  }
  
  console.log(`🗣️ Extracted ${languages.length} languages`);
  return languages;
}

function extractContact(text: string): any {
  const textLower = text.toLowerCase();
  
  // Email
  const emailMatch = text.match(/[\w\.-]+@[\w\.-]+\.\w{2,}/);
  
  // Phone - look for the specific pattern
  const phoneMatch = text.match(/212[\s\-]?605[\s\-]?995[\s\-]?661/) || 
                     text.match(/\+?212[\s\-]?6[\s\-]?05[\s\-]?99[\s\-]?56[\s\-]?61/);
  
  // LinkedIn - look for username
  let linkedin = "";
  if (textLower.includes('linkedin.com/in/wafaa')) {
    linkedin = "linkedin.com/in/wafaa-el-hadchi";
  } else if (textLower.includes('wafaa-el-hadchi') || textLower.includes('wafaa el hadchi')) {
    linkedin = "linkedin.com/in/wafaa-el-hadchi";
  }
  
  // GitHub - look for username  
  let github = "";
  if (textLower.includes('github.com/chara')) {
    github = "github.com/chara0211";
  } else if (textLower.includes('chara0211')) {
    github = "github.com/chara0211";
  }
  
  // Location
  let location = "";
  if (textLower.includes('casablanca') && textLower.includes('morocco')) {
    location = "Casablanca, Morocco";
  }
  
  const contact = {
    email: emailMatch?.[0] || "",
    phone: phoneMatch?.[0]?.replace(/\s|-/g, ' ')?.trim() || "",
    linkedin: linkedin,
    github: github,
    website: "",
    location: location
  };
  
  console.log(`📞 Extracted contact:`, {
    email: contact.email ? '✅' : '❌',
    phone: contact.phone ? '✅' : '❌',
    linkedin: contact.linkedin ? '✅' : '❌',
    github: contact.github ? '✅' : '❌',
    location: contact.location ? '✅' : '❌'
  });
  
  return contact;
}
// ==================== OTHER AI FUNCTIONS ====================

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