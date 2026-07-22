// src/services/candidate/profile/autofill.service.ts
// ENHANCED AUTOFILL SERVICE - Complete implementation with all fixes

import { PrismaClient, Prisma } from "@prisma/client";
import {
  AutofillPreviewResult,
  AutofillFieldData,
  ServiceResponse,
  ParsedResumeData,
  AutofillApplyResult,
  AutofillSkill,
  AutofillCertification,
  PersonalInfo,
} from "../../../types/profile.types";

const prisma = new PrismaClient();

type AIExtractionResult = {
  headline?: string;
  summary?: string;
  about_me?: string;
  profile?: string;
  skills?: Array<{
    name?: string;
    skill_name?: string;
    category?: string;
    skill_category?: string;
    proficiency?: string;
    years_experience?: number;
  }>;
  experience?: any[];
  projects?: any[];
  education?: any[];
  certifications?: any[];
  languages?: any[] | string[] | string;
  contact?: any;
  personal_info?: any;
};

// ✅ FIXED: More aggressive about_me extraction
function pickAboutMe(extracted: AIExtractionResult, rawText?: string): string {
  // Try AI-extracted fields first
  const summary = typeof extracted.summary === "string" ? extracted.summary.trim() : "";
  const aboutMe = typeof extracted.about_me === "string" ? extracted.about_me.trim() : "";
  const profile = typeof extracted.profile === "string" ? extracted.profile.trim() : "";
  
  let result = summary || aboutMe || profile;
  
  console.log('🔍 About me extraction:', {
    summary: summary ? '✅' : '❌',
    aboutMe: aboutMe ? '✅' : '❌',
    profile: profile ? '✅' : '❌',
    result_length: result.length
  });
  
  // ✅ NEW: If still empty, try to extract from headline
  if (!result && extracted.headline) {
    result = extracted.headline;
    console.log('📝 Using headline as fallback');
  }
  
  // ✅ NEW: If still empty, generate from experience
  if (!result && Array.isArray(extracted.experience) && extracted.experience.length > 0) {
    const recentRole = extracted.experience[0];
    const skills = Array.isArray(extracted.skills) 
      ? extracted.skills.slice(0, 5).map(s => s.skill_name || s.name).filter(Boolean).join(', ') 
      : '';
    
    result = `${recentRole.job_title || 'Professional'} with experience in ${recentRole.company || 'various companies'}${skills ? `. Skilled in ${skills}` : ''}.`;
    console.log('🏢 Generated from experience:', result.slice(0, 50) + '...');
  }
  
  // ✅ NEW: Last resort - extract from raw text
  if (!result && rawText) {
    result = extractSummaryFromRawText(rawText);
    console.log('📄 Extracted from raw text:', result.slice(0, 50) + '...');
  }
  
  return result.slice(0, 800); // Limit length
}

// ✅ NEW: Extract summary from raw CV text
function extractSummaryFromRawText(text: string): string {
  // Look for common summary section headers
  const summaryPatterns = [
    /(?:professional\s+summary|summary|profile|about\s+me|objective|overview)[:\s]*\n+([\s\S]{100,800}?)(?:\n{2,}|$)/i,
    /(?:^|\n)(I\s+am\s+.{50,500}?)(?:\n{2,}|$)/i,
    /(?:^|\n)(Experienced\s+.{50,500}?)(?:\n{2,}|$)/i,
    /(?:^|\n)(Passionate\s+.{50,500}?)(?:\n{2,}|$)/i,
  ];
  
  for (const pattern of summaryPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/\s+/g, ' ').trim();
    }
  }
  
  // Fallback: Take first substantial paragraph
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const substantialPara = paragraphs.find(p => p.length > 100 && p.length < 800);
  
  return substantialPara || '';
}

function normalizeSkills(extracted: AIExtractionResult): AutofillSkill[] {
  const skills = extracted.skills ?? [];
  return skills
    .map((s) => ({
      skill_name: String(s.skill_name ?? s.name ?? "").trim(),
      skill_category: s.skill_category ?? s.category ?? "technical",
      proficiency: s.proficiency ?? "intermediate",
      years_experience: s.years_experience ?? 0,
      source: "resume",
    }))
    .filter((s) => s.skill_name.length > 0);
}

export class AutofillService {
  async createPreviewSession(
    candidateId: string,
    documentId: string
  ): Promise<ServiceResponse<AutofillPreviewResult>> {
    try {
      const doc = await prisma.candidateDocument.findUnique({
        where: { document_id: documentId },
      });

      if (!doc || doc.candidate_id !== candidateId) {
        return { success: false, message: "Document not found for this candidate" };
      }

      if (doc.extraction_status !== "completed") {
        const isFailed = doc.extraction_status === "failed";
        return {
          success: false,
          message: isFailed
            ? `Document processing failed. Check server logs and retry upload. (status=${doc.extraction_status})`
            : `Document not processed yet (status=${doc.extraction_status}). Please retry.`,
          error: "EXTRACTION_NOT_READY",
        };
      }

      const extraction = await prisma.skillExtraction.findFirst({
        where: { document_id: documentId, candidate_id: candidateId, status: "completed" },
        orderBy: { created_at: "desc" },
      });

      if (!extraction?.raw_response) {
        return {
          success: false,
          message: "No completed extraction found for this document. Please retry.",
          error: "NO_EXTRACTION_FOUND",
        };
      }

      const extracted: AIExtractionResult = JSON.parse(extraction.raw_response);

      // ✅ FIXED: Pass raw text for better about_me extraction
      const about_me = pickAboutMe(extracted, doc.processed_text || undefined);

      const parsed_data: ParsedResumeData = {
        skills: normalizeSkills(extracted),
        experience: Array.isArray(extracted.experience) ? extracted.experience : [],
        projects: Array.isArray(extracted.projects) ? extracted.projects : [],
        education: Array.isArray(extracted.education) ? extracted.education : [],
        certifications: Array.isArray(extracted.certifications) ? extracted.certifications : [],
        languages: Array.isArray(extracted.languages) ? extracted.languages : [],
        personal_info: extracted.contact ?? extracted.personal_info ?? {},
        headline: extracted.headline ?? "",
        about_me: about_me,
      };

      console.log('📊 Parsed data summary:', {
        skills: parsed_data.skills.length,
        experience: parsed_data.experience.length,
        projects: parsed_data.projects?.length || 0,
        education: parsed_data.education.length,
        certifications: parsed_data.certifications?.length || 0,
        languages: parsed_data.languages?.length || 0,
        about_me_length: about_me.length,
        personal_info_keys: Object.keys(parsed_data.personal_info || {}).length,
      });

      const session = await prisma.resumeAutofillSession.create({
        data: {
          candidate_id: candidateId,
          document_id: documentId,
          status: "preview",
          parsed_data: parsed_data as any,
        },
      });

      // Create mappings for all non-empty fields
      const fieldsToMap: Array<{ field_name: string; value: any; confidence: number }> = [
        { field_name: "skills", value: parsed_data.skills, confidence: parsed_data.skills.length ? 0.85 : 0 },
        { field_name: "headline", value: parsed_data.headline, confidence: parsed_data.headline ? 0.75 : 0 },
        { field_name: "about_me", value: parsed_data.about_me, confidence: parsed_data.about_me ? 0.7 : 0 },
        { field_name: "experience", value: parsed_data.experience, confidence: parsed_data.experience.length ? 0.75 : 0 },
        { field_name: "projects", value: parsed_data.projects, confidence: parsed_data.projects?.length ? 0.7 : 0 },
        { field_name: "education", value: parsed_data.education, confidence: parsed_data.education.length ? 0.75 : 0 },
        { field_name: "certifications", value: parsed_data.certifications, confidence: parsed_data.certifications?.length ? 0.7 : 0 },
        { field_name: "languages", value: parsed_data.languages, confidence: parsed_data.languages?.length ? 0.7 : 0 },
        { field_name: "personal_info", value: parsed_data.personal_info, confidence: Object.keys(parsed_data.personal_info || {}).length ? 0.65 : 0 },
      ].filter((f) => {
        if (Array.isArray(f.value)) return f.value.length > 0;
        if (typeof f.value === "string") return f.value.trim().length > 0;
        if (typeof f.value === "object") return f.value && Object.keys(f.value).length > 0;
        return false;
      });

      console.log('📝 Creating mappings for fields:', fieldsToMap.map(f => `${f.field_name}(${f.confidence})`));

      await prisma.autofillFieldMapping.createMany({
        data: fieldsToMap.map((f) => ({
          session_id: session.session_id,
          field_name: f.field_name,
          extracted_value: f.value,
          confidence: f.confidence,
          is_confirmed: true, // ✅ AUTO-CONFIRM ALL MAPPINGS
        })),
      });

      const mappingsDb = await prisma.autofillFieldMapping.findMany({
        where: { session_id: session.session_id },
        orderBy: { created_at: "asc" },
      });

      const mappings: AutofillFieldData[] = mappingsDb.map((m) => ({
        mapping_id: m.mapping_id,
        field_name: m.field_name,
        extracted_value: m.extracted_value,
        confidence: m.confidence,
        is_confirmed: m.is_confirmed,
        confirmed_value: m.confirmed_value ?? undefined,
      }));

      const confidence_scores = Object.fromEntries(mappingsDb.map((m) => [m.field_name, m.confidence]));

      return {
        success: true,
        data: {
          session_id: session.session_id,
          status: session.status,
          parsed_data: parsed_data,
          mappings,
          confidence_scores,
        },
        message: "Autofill preview created",
      };
    } catch (error: any) {
      console.error("AutofillService.createPreviewSession error:", error);
      return { success: false, message: "Failed to create autofill preview", error: error.message };
    }
  }

  async confirmMapping(
    candidateId: string,
    sessionId: string,
    mappingId: string,
    confirmedValue?: any
  ): Promise<ServiceResponse> {
    try {
      const session = await prisma.resumeAutofillSession.findUnique({ 
        where: { session_id: sessionId } 
      });
      
      if (!session || session.candidate_id !== candidateId) {
        return { success: false, message: "Session not found" };
      }

      const mapping = await prisma.autofillFieldMapping.findUnique({ 
        where: { mapping_id: mappingId } 
      });
      
      if (!mapping || mapping.session_id !== sessionId) {
        return { success: false, message: "Mapping not found for this session" };
      }

      await prisma.autofillFieldMapping.update({
        where: { mapping_id: mappingId },
        data: { 
          is_confirmed: true, 
          confirmed_value: confirmedValue ?? undefined 
        },
      });

      return { success: true, message: "Mapping confirmed" };
    } catch (error: any) {
      console.error("AutofillService.confirmMapping error:", error);
      return { 
        success: false, 
        message: "Failed to confirm mapping", 
        error: error.message 
      };
    }
  }

  async applyConfirmedFields(
    candidateId: string,
    sessionId: string
  ): Promise<ServiceResponse<AutofillApplyResult>> {
    try {
      const session = await prisma.resumeAutofillSession.findUnique({
        where: { session_id: sessionId },
        include: { mappings: true },
      });

      if (!session || session.candidate_id !== candidateId) {
        return { 
          success: false, 
          message: "Session not found",
          data: {
            success: false,
            message: "Session not found",
          }
        };
      }

      const confirmed = session.mappings.filter((m) => m.is_confirmed);
      if (confirmed.length === 0) {
        return { 
          success: false, 
          message: "No confirmed mappings to apply",
          data: {
            success: false,
            message: "No confirmed mappings to apply",
          }
        };
      }

      // Ensure profile exists
      await prisma.candidateProfile.upsert({
        where: { candidate_id: candidateId },
        update: {},
        create: { candidate_id: candidateId, skills: [] },
      });

      const getVal = (field: string) => {
        const m = confirmed.find((x) => x.field_name === field);
        return m ? ((m.confirmed_value ?? m.extracted_value) as any) : null;
      };

      let skillsAdded = 0;
      let certificationsAdded = 0;
      const appliedFields: string[] = [];

      // ==================== 1) PERSONAL INFO ====================
      const personal_info = getVal("personal_info") as PersonalInfo | null;
      if (personal_info && typeof personal_info === 'object') {
        console.log('📝 Applying personal_info:', personal_info);
        
        await prisma.candidateProfile.update({
          where: { candidate_id: candidateId },
          data: {
            personal_info: personal_info as unknown as Prisma.InputJsonValue,
            location: personal_info.location || undefined
          },
        });

        if (personal_info.phone) {
          await prisma.user.update({
            where: { user_id: candidateId },
            data: { phone_number: personal_info.phone }
          });
        }
        appliedFields.push('personal_info');
      }

      // ==================== 2) HEADLINE ====================
      const headline = getVal("headline") as string | null;
      if (headline?.trim()) {
        await prisma.candidateProfile.update({
          where: { candidate_id: candidateId },
          data: { headline: headline.trim().slice(0, 120) },
        });
        appliedFields.push('headline');
      }

      // ==================== 3) ABOUT ME ====================
      const about_me = getVal("about_me") as string | null;
      if (about_me?.trim()) {
        await prisma.candidateProfile.update({
          where: { candidate_id: candidateId },
          data: { about_me: about_me.trim().slice(0, 500) },
        });
        appliedFields.push('about_me');
      }

      // ==================== 4) EXPERIENCE ====================
      const experience = getVal("experience") as any[] | null;
      if (Array.isArray(experience) && experience.length > 0) {
        await prisma.candidateProfile.update({
          where: { candidate_id: candidateId },
          data: { experience: JSON.stringify(experience) },
        });
        appliedFields.push('experience');
      }

      // ==================== 5) EDUCATION ====================
      const education = getVal("education") as any[] | null;
      if (Array.isArray(education) && education.length > 0) {
        await prisma.candidateProfile.update({
          where: { candidate_id: candidateId },
          data: { education: JSON.stringify(education) },
        });
        appliedFields.push('education');
      }

      // ==================== 6) LANGUAGES ====================
      const languages = getVal("languages");
      if (languages != null && (Array.isArray(languages) ? languages.length > 0 : true)) {
        await prisma.candidateProfile.update({
          where: { candidate_id: candidateId },
          data: { languages: JSON.stringify(languages) },
        });
        appliedFields.push('languages');
      }

      // ==================== 7) PROJECTS ====================
      const projects = getVal("projects") as any[] | null;
      if (Array.isArray(projects) && projects.length > 0) {
        console.log('📁 Applying projects:', projects.length);
        await prisma.candidateProfile.update({
          where: { candidate_id: candidateId },
          data: { projects: JSON.stringify(projects) },
        });
        appliedFields.push('projects');
      }

      // ==================== 8) CERTIFICATIONS ====================
      const certifications = getVal("certifications") as AutofillCertification[] | null;
      
      // A) Store in JSON column (quick access)
      if (Array.isArray(certifications) && certifications.length > 0) {
        console.log('🏆 Applying certifications:', certifications.length);
        await prisma.candidateProfile.update({
          where: { candidate_id: candidateId },
          data: { certifications: JSON.stringify(certifications) },
        });

        // B) Also create rows in Certification table (normalized)
        for (const cert of certifications) {
          try {
            await prisma.certification.create({
              data: {
                candidate_id: candidateId,
                name: cert.name,
                issuer: cert.issuer,
                issue_date: new Date(),
                is_verified: false
              }
            });
            certificationsAdded++;
          } catch (e) {
            console.warn('⚠️ Cert already exists:', cert.name);
          }
        }
        appliedFields.push('certifications');
      }

      // ==================== 9) SKILLS ====================
      const skills = getVal("skills") as AutofillSkill[] | null;
      if (Array.isArray(skills)) {
        for (const s of skills) {
          const name = String(s?.skill_name ?? "").trim();
          if (!name) continue;

          const existing = await prisma.candidateSkill.findFirst({
            where: { 
              candidate_id: candidateId, 
              skill_name: { equals: name, mode: "insensitive" } 
            },
          });

          if (!existing) {
            await prisma.candidateSkill.create({
              data: {
                candidate_id: candidateId,
                skill_name: name,
                source_type: "resume_autofill",
                skill_category: s?.skill_category ?? null,
                proficiency: s?.proficiency ?? null,
                years_experience: s?.years_experience ?? null,
                confidence_score: 0.8,
                source_document_id: session.document_id,
              },
            });
            skillsAdded++;
          }
        }
        appliedFields.push('skills');
      }

      // ==================== MARK SESSION AS APPLIED ====================
      await prisma.resumeAutofillSession.update({
        where: { session_id: sessionId },
        data: { status: "applied" },
      });

      // ==================== RECALCULATE COMPLETENESS ====================
      try {
        const { calculateProfileCompleteness } = await import("../../candidate.service");
        await calculateProfileCompleteness(candidateId);
      } catch (error) {
        console.warn("Failed to recalculate completeness:", error);
      }

      console.log(`✅ Applied ${confirmed.length} confirmed fields for candidate: ${candidateId}`);
      console.log(`📊 Summary: ${skillsAdded} skills, ${certificationsAdded} certifications`);

      return { 
        success: true, 
        data: {
          success: true,
          message: "Confirmed fields applied successfully",
          applied_fields: appliedFields,
          skills_added: skillsAdded,
          certifications_added: certificationsAdded,
        },
        message: "Confirmed fields applied successfully" 
      };
    } catch (error: any) {
      console.error("AutofillService.applyConfirmedFields error:", error);
      return { 
        success: false, 
        data: {
          success: false,
          message: "Failed to apply confirmed fields",
          error: error.message
        },
        message: "Failed to apply confirmed fields", 
        error: error.message 
      };
    }
  }
}

export const autofillService = new AutofillService();