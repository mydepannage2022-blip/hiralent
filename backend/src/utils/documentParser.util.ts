import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { ParsedDocumentResult, DocumentValidationResult } from '../types/candidate.types';

// Parse PDF files
export async function parsePDF(filePath: string): Promise<ParsedDocumentResult> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        title: data.info?.Title,
        author: data.info?.Author,
        wordCount: data.text.split(/\s+/).length,
        fileSize: dataBuffer.length
      }
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF document');
  }
}

// Parse Word documents (.docx)
export async function parseWord(filePath: string): Promise<ParsedDocumentResult> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    
    const text = result.value;
    
    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).length,
        fileSize: dataBuffer.length
      }
    };
  } catch (error) {
    console.error('Error parsing Word document:', error);
    throw new Error('Failed to parse Word document');
  }
}

// Main document parser function
export async function parseDocument(filePath: string, fileType: string): Promise<ParsedDocumentResult> {
  const extension = path.extname(filePath).toLowerCase();
  
  switch (extension) {
    case '.pdf':
      return await parsePDF(filePath);
    
    case '.docx':
    case '.doc':
      return await parseWord(filePath);
    
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}

// Validate document format and size
export function validateDocument(file: Express.Multer.File): DocumentValidationResult {
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only PDF and DOCX files are allowed.'
    };
  }
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size too large. Maximum size is 10MB.'
    };
  }
  
  return { isValid: true };
}

// Clean and preprocess text
export function preprocessText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, ' ') // Replace multiple newlines with space
    .replace(/[^\w\s.-]/g, ' ') // Remove special characters except dots and hyphens
    .trim()
    .toLowerCase();
}

// Extract contact information from text
export function extractContactInfo(text: string): { email?: string; phone?: string; linkedin?: string } {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/;
  const linkedinRegex = /linkedin\.com\/in\/[\w-]+/i;
  
  const email = text.match(emailRegex)?.[0];
  const phone = text.match(phoneRegex)?.[0];
  const linkedin = text.match(linkedinRegex)?.[0];
  
  return {
    email,
    phone,
    linkedin
  };
}
