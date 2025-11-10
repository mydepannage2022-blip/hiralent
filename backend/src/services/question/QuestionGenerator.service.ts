import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class QuestionGeneratorService {
  private genAI: GoogleGenerativeAI | null;
  private hasValidApiKey: boolean;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY; // ← Changé de OPENAI_API_KEY
    
    if (!apiKey) {
      console.warn('⚠️  GEMINI_API_KEY not found. AI features will be disabled.');
      this.hasValidApiKey = false;
      this.genAI = null;
    } else {
      this.hasValidApiKey = true;
      this.genAI = new GoogleGenerativeAI(apiKey); // ← GoogleGenerativeAI au lieu d'OpenAI
    }
  }

  // Generate coding question from topic
  async generateCodingQuestion(topic: string, difficulty: string = 'medium') {
    // Return mock data if no API key
    if (!this.hasValidApiKey || !this.genAI) {
      console.warn('⚠️  Using mock data - Gemini API key not configured');
      return this.getMockQuestion(topic, difficulty);
    }

    const prompt = `
    Create a ${difficulty} level coding question about ${topic}.
    
    Return ONLY valid JSON format, no other text:
    {
      "title": "Question title",
      "problemStatement": "Clear problem description",
      "difficulty": "${difficulty}",
      "skillTags": ["${topic}", "programming"],
      "testCases": [
        {"input": "sample input", "output": "expected output"}
      ],
      "canonicalSolution": "Python code solution",
      "explanation": "Solution explanation"
    }
    `;

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiResponse = response.text();
      
      // Nettoyer la réponse (Gemini peut ajouter des ```json)
      let cleanedResponse = aiResponse.trim();
      if (cleanedResponse.startsWith("```json")) {
        cleanedResponse = cleanedResponse.slice(7);
      }
      if (cleanedResponse.endsWith("```")) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      
      console.log('✅ Gemini Response:', cleanedResponse);
      
      return JSON.parse(cleanedResponse);
      
    } catch (error) {
      console.error('❌ Gemini question generation failed:', error);
      // Fallback to mock data on error
      return this.getMockQuestion(topic, difficulty);
    }
  }

  // Generate multiple questions in batch
  async generateBatchQuestions(topics: string[], difficulty: string = 'medium', countPerTopic: number = 2) {
    const allQuestions = [];
    
    for (const topic of topics) {
      console.log(`🔄 Generating ${countPerTopic} questions for topic: ${topic}`);
      
      for (let i = 0; i < countPerTopic; i++) {
        try {
          const question = await this.generateCodingQuestion(topic, difficulty);
          allQuestions.push({
            id: `${topic}-${i}-${Date.now()}`,
            ...question
          });
        } catch (error) {
          console.error(`❌ Failed to generate question for ${topic}:`, error);
          // Add mock question as fallback
          const mockQuestion = this.getMockQuestion(topic, difficulty);
          allQuestions.push({
            id: `${topic}-fallback-${i}-${Date.now()}`,
            ...mockQuestion
          });
        }
      }
    }
    
    return {
      success: true,
      generated_count: allQuestions.length,
      questions: allQuestions
    };
  }

  // Mock data for development without API key (garder le même)
  private getMockQuestion(topic: string, difficulty: string) {
    const mockQuestions = {
      'python': {
        title: "Reverse a String in Python",
        problemStatement: "Write a function that takes a string as input and returns the reversed version of that string.",
        difficulty: difficulty,
        skillTags: ["python", "strings", "algorithms"],
        testCases: [
          {"input": "hello", "output": "olleh"},
          {"input": "world", "output": "dlrow"},
          {"input": "python", "output": "nohtyp"}
        ],
        canonicalSolution: "def reverse_string(s):\n    return s[::-1]",
        explanation: "Use Python slicing to reverse the string."
      },
      'javascript': {
        title: "Find Maximum Number in Array",
        problemStatement: "Write a function that finds the maximum number in an array of numbers.",
        difficulty: difficulty,
        skillTags: ["javascript", "arrays", "algorithms"],
        testCases: [
          {"input": "[1, 5, 3]", "output": "5"},
          {"input": "[-1, -5, -3]", "output": "-1"},
          {"input": "[42]", "output": "42"}
        ],
        canonicalSolution: "function findMax(arr) {\n    return Math.max(...arr);\n}",
        explanation: "Use Math.max with spread operator to find maximum value."
      },
      'algorithms': {
        title: "FizzBuzz Problem",
        problemStatement: "Write a function that takes a number n and returns an array from 1 to n. For multiples of 3 output 'Fizz', for multiples of 5 output 'Buzz', for both output 'FizzBuzz'.",
        difficulty: difficulty,
        skillTags: ["algorithms", "loops", "conditionals"],
        testCases: [
          {"input": "5", "output": "['1', '2', 'Fizz', '4', 'Buzz']"},
          {"input": "3", "output": "['1', '2', 'Fizz']"}
        ],
        canonicalSolution: "def fizzbuzz(n):\n    result = []\n    for i in range(1, n+1):\n        if i % 15 == 0:\n            result.append('FizzBuzz')\n        elif i % 3 == 0:\n            result.append('Fizz')\n        elif i % 5 == 0:\n            result.append('Buzz')\n        else:\n            result.append(str(i))\n    return result",
        explanation: "Check divisibility by 15, 3, and 5 in that order."
      }
    };

    // Return a mock question based on topic, or default to python
    const key = Object.keys(mockQuestions).find(k => topic.toLowerCase().includes(k)) || 'python';
    return mockQuestions[key as keyof typeof mockQuestions];
  }

  // Simple web scraper (garder le même)
  async scrapeProgrammingProblems(): Promise<any[]> {
    try {
      console.log('Web scraping temporarily disabled for development');
      return []; // Return empty array for now
    } catch (error) {
      console.error('Web scraping failed:', error);
      return [];
    }
  }

  async generateMultipleQuestions(topic: string, difficulty: string, count: number = 3): Promise<any[]> {
    const questions = [];
    for (let i = 0; i < count; i++) {
      const question = await this.generateCodingQuestion(topic, difficulty);
      questions.push({
        id: Date.now() + i,
        ...question
      });
    }
    return questions;
  }
}
