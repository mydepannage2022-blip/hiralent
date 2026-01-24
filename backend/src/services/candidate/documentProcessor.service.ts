// src/services/candidate/documentProcessor.service.ts
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import axios from "axios";

import { extractSkillsFromText, createEmbedding } from "../../lib/openai";
import { storeCandidateVector } from "../../lib/pinecone";
import { parseDocument, preprocessText } from "../../utils/documentParser.util";
import {
  AIExtractionResult,
  CareerPredictionResult,
  CandidateServiceError,
} from "../../types/candidate.types";

const prisma = new PrismaClient();

// ==================== UPDATED: Now supports both local files and Cloudinary URLs ====================
export const processDocumentAsync = async (
  documentId: string,
  candidateId: string,
  filePathOrUrl: string
): Promise<void> => {
  let tempFilePath: string | null = null;
  let shouldDeleteTemp = false;

  // Track whether the REAL extraction (parse + AI) succeeded
  let extractionSucceeded = false;

  try {
    await prisma.candidateDocument.update({
      where: { document_id: documentId },
      data: { extraction_status: "processing" },
    });

    const document = await prisma.candidateDocument.findUnique({
      where: { document_id: documentId },
    });

    if (!document) throw new Error("Document not found");

    // ==================== GET FILE (URL or LOCAL) ====================
    if (filePathOrUrl.startsWith("http://") || filePathOrUrl.startsWith("https://")) {
      console.log("📥 Downloading file:", filePathOrUrl);

      const response = await axios({
        method: "GET",
        url: filePathOrUrl,
        responseType: "arraybuffer",
        timeout: 30000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (response.status !== 200) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(response.data);
      tempFilePath = `./temp_processing_${documentId}.pdf`;
      fs.writeFileSync(tempFilePath, buffer);
      shouldDeleteTemp = true;
    } else {
      console.log("📂 Using local file:", filePathOrUrl);
      if (!fs.existsSync(filePathOrUrl)) {
        throw new Error(`Local file not found: ${filePathOrUrl}`);
      }
      tempFilePath = filePathOrUrl;
      shouldDeleteTemp = false;
    }

    // ==================== 1) PARSE PDF ====================
    console.log("📄 Parsing document:", tempFilePath);
    const parsedDoc = await parseDocument(tempFilePath, document.file_type);
    const processedText = preprocessText(parsedDoc.text);

    console.log(`✅ Extracted ${processedText.length} characters from document`);

    await prisma.candidateDocument.update({
      where: { document_id: documentId },
      data: {
        processed_text: processedText,
        // ⚠️ DO NOT mark completed yet (only after AI extraction succeeds)
      },
    });

    // ==================== 2) CREATE SkillExtraction row ====================
    const skillExtraction = await prisma.skillExtraction.create({
      data: {
        document_id: documentId,
        candidate_id: candidateId,
        status: "processing",
        ai_provider: "gemini",
      },
    });

    // ==================== 3) AI EXTRACTION ====================
    const startTime = Date.now();
    const extractedData: AIExtractionResult = await extractSkillsFromText(processedText);
    const processingTime = Date.now() - startTime;
    console.log("🧠 RAW extractedData:", JSON.stringify(extractedData, null, 2));
    console.log("🧠 keys:", Object.keys(extractedData || {}));
    console.log("🧠 personal_info:", extractedData?.personal_info);
    console.log("🧠 experience len:", extractedData?.experience?.length);
    console.log("🧠 languages:", extractedData?.languages);
    console.log("🧠 summary:", extractedData?.summary);


    // Debug (optional but useful)
    console.log("🧠 extractedData keys:", Object.keys(extractedData || {}));
    console.log("🧠 skills:", Array.isArray(extractedData?.skills) ? extractedData.skills.length : 0);

    // Store JSON properly (Json column = object, not string)
    await prisma.skillExtraction.update({
      where: { extraction_id: skillExtraction.extraction_id },
      data: {
        status: "completed",
        raw_response: JSON.stringify(extractedData ?? {}),
        extracted_skills: extractedData ?? {}, // ✅ real JSON object
        processing_time: processingTime,
      },
    });

    // ✅ Now we can say extraction is completed
    await prisma.candidateDocument.update({
      where: { document_id: documentId },
      data: { extraction_status: "completed" },
    });

    extractionSucceeded = true;

    // ==================== 4) UPSERT SKILLS (dedupe) ====================
    if (Array.isArray(extractedData?.skills)) {
      console.log(`💡 Extracted ${extractedData.skills.length} skills`);

      for (const skill of extractedData.skills) {
        const skillName = String((skill as any)?.name ?? (skill as any)?.skill_name ?? "").trim();
        if (!skillName) continue;

        const exists = await prisma.candidateSkill.findFirst({
          where: {
            candidate_id: candidateId,
            skill_name: { equals: skillName, mode: "insensitive" },
          },
        });

        if (!exists) {
          await prisma.candidateSkill.create({
            data: {
              candidate_id: candidateId,
              skill_name: skillName,
              skill_category: (skill as any)?.category || "technical",
              proficiency: (skill as any)?.proficiency || "intermediate",
              years_experience: (skill as any)?.years_experience || 0,
              confidence_score: 0.85,
              source_type: "cv_extraction",
              source_document_id: documentId,
            },
          });
        }
      }
    }

    // ==================== 5) UPDATE PROFILE (non-blocking) ====================
    await updateCandidateProfile(candidateId, extractedData).catch((e) =>
      console.warn("⚠️ updateCandidateProfile skipped:", e?.message || e)
    );

    // ==================== 6) CAREER PREDICTION (non-blocking) ====================
    await generateCareerPrediction(candidateId).catch((e) =>
      console.warn("⚠️ Career prediction skipped:", e?.message || e)
    );

    // ==================== 7) VECTOR UPDATE (non-blocking) ====================
    await updateCandidateVector(candidateId).catch((e) =>
      console.warn("⚠️ Vector update skipped:", e?.message || e)
    );

    // ==================== 8) COMPLETENESS (non-blocking) ====================
    await calculateProfileCompleteness(candidateId).catch((e) =>
      console.warn("⚠️ Completeness calc skipped:", e?.message || e)
    );

    console.log(`✅ Document processing completed for candidate: ${candidateId}`);
  } catch (error: any) {
    console.error("❌ Error processing document:", error);

    // ✅ Only mark FAILED if extraction itself did not succeed
    if (!extractionSucceeded) {
      await prisma.skillExtraction.updateMany({
        where: { document_id: documentId, status: "processing" },
        data: {
          status: "failed",
          error_message: error?.message || "Unknown error",
        },
      });

      await prisma.candidateDocument.update({
        where: { document_id: documentId },
        data: { extraction_status: "failed" },
      });
    } else {
      // Extraction succeeded; downstream failed → keep completed so preview works
      console.warn("⚠️ Extraction completed, but downstream step failed. Keeping extraction_status=completed.");
    }
  } finally {
    // Cleanup temp file if downloaded
    if (shouldDeleteTemp && tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("🗑️ Cleaned up temp file");
    }
  }
};

// ==================== FIXED: store skill NAMES in CandidateProfile.skills (String[]) ====================
const updateCandidateProfile = async (
  candidateId: string,
  extractedData: AIExtractionResult
): Promise<void> => {
  try {
    const existingProfile = await prisma.candidateProfile.findUnique({
      where: { candidate_id: candidateId },
    });

    const extractedSkills = await prisma.candidateSkill.findMany({
      where: { candidate_id: candidateId, source_type: "cv_extraction" },
      select: { skill_name: true },
    });

    const skillNames = extractedSkills.map((s) => s.skill_name);

    const profileData = {
      headline: extractedData?.headline ? String(extractedData.headline).slice(0, 120) : undefined,
      skills: skillNames, // ✅ correct type
      education: JSON.stringify(extractedData?.education || []),
      experience: JSON.stringify(extractedData?.experience || []),
      languages: extractedData?.languages ? JSON.stringify(extractedData.languages) : undefined,
    };

    if (existingProfile) {
      const existingSkills = existingProfile.skills || [];
      const merged = Array.from(new Set([...existingSkills, ...skillNames]));

      await prisma.candidateProfile.update({
        where: { candidate_id: candidateId },
        data: {
          ...profileData,
          skills: merged,
        },
      });
    } else {
      await prisma.candidateProfile.create({
        data: {
          candidate_id: candidateId,
          ...profileData,
        },
      });
    }

    console.log(`✅ Profile updated for candidate: ${candidateId}`);
  } catch (error) {
    console.error("❌ Error updating candidate profile:", error);
  }
};

export const generateCareerPrediction = async (
  candidateId: string
): Promise<CareerPredictionResult> => {
  try {
    const candidate = await prisma.user.findUnique({
      where: { user_id: candidateId },
      include: {
        candidateProfile: true,
        candidateSkills: true,
      },
    });

    if (!candidate) throw new Error("Candidate not found");

    const candidateData = {
      skills: candidate.candidateSkills.map((s) => ({
        name: s.skill_name,
        category: (s.skill_category as any) || "technical",
        proficiency: (s.proficiency as any) || "intermediate",
        years_experience: s.years_experience || 0,
      })),
      education: candidate.candidateProfile?.education
        ? JSON.parse(candidate.candidateProfile.education)
        : [],
      experience: candidate.candidateProfile?.experience
        ? JSON.parse(candidate.candidateProfile.experience)
        : [],
    };

    const { predictCareerPath } = await import("../../lib/openai");
    const prediction: CareerPredictionResult = await predictCareerPath(candidateData);

    await prisma.careerPrediction.create({
      data: {
        candidate_id: candidateId,
        current_role: prediction.current_role,
        predicted_roles: JSON.stringify(prediction.predicted_roles),
        career_path: JSON.stringify(prediction.career_path),
        skill_gaps: JSON.stringify(prediction.skill_gaps),
        salary_prediction: JSON.stringify(prediction.salary_prediction),
        confidence_score: prediction.confidence_score || 0.7,
        ai_model_version: "gemini-0.5",
        input_data_summary: `Skills: ${candidateData.skills.length}, Experience: ${candidateData.experience.length}`,
      },
    });

    return prediction;
  } catch (error) {
    console.error("Error generating career prediction:", error);
    const serviceError: CandidateServiceError = new Error("Failed to generate career prediction");
    serviceError.code = "PREDICTION_FAILED";
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

// ==================== FIXED: DB vector update succeeds even if Pinecone fails ====================
export const updateCandidateVector = async (
  candidateId: string
): Promise<{ success: boolean; pinecone_ok?: boolean }> => {
  const candidate = await prisma.user.findUnique({
    where: { user_id: candidateId },
    include: { candidateProfile: true, candidateSkills: true },
  });

  if (!candidate) throw new Error("Candidate not found");

  const headlineText = candidate.candidateProfile?.headline || "";

  const skillsText = candidate.candidateSkills
    .map((s) => `${s.skill_name}${s.proficiency ? ` (${s.proficiency})` : ""}`)
    .join(", ");

  const experienceText = candidate.candidateProfile?.experience
    ? JSON.parse(candidate.candidateProfile.experience)
        .map((exp: any) => `${exp.job_title || ""} ${exp.company ? `at ${exp.company}` : ""}`.trim())
        .filter(Boolean)
        .join(", ")
    : "";

  const educationText = candidate.candidateProfile?.education
    ? JSON.parse(candidate.candidateProfile.education)
        .map((edu: any) => `${edu.degree || ""} ${edu.field ? `in ${edu.field}` : ""}`.trim())
        .filter(Boolean)
        .join(", ")
    : "";

  const combinedText = `Headline: ${headlineText}. Skills: ${skillsText}. Experience: ${experienceText}. Education: ${educationText}`;

  const combinedVector = await createEmbedding(combinedText);
  const skillVector = skillsText ? await createEmbedding(skillsText) : [];
  const experienceVector = experienceText ? await createEmbedding(experienceText) : [];
  const educationVector = educationText ? await createEmbedding(educationText) : [];

  const existingVector = await prisma.candidateVector.findUnique({
    where: { candidate_id: candidateId },
  });

  const vectorData = {
    skill_vector: skillVector,
    experience_vector: experienceVector,
    education_vector: educationVector,
    combined_vector: combinedVector,
    vector_version: "v1.1",
  };

  if (existingVector) {
    await prisma.candidateVector.update({
      where: { candidate_id: candidateId },
      data: vectorData,
    });
  } else {
    await prisma.candidateVector.create({
      data: { candidate_id: candidateId, ...vectorData },
    });
  }

  // ✅ Pinecone is best-effort — never throw
  try {
    await storeCandidateVector(candidateId, combinedVector, {
      skills_count: candidate.candidateSkills.length,
      full_name: candidate.full_name,
      email: candidate.email,
      headline: headlineText,
    });
    return { success: true, pinecone_ok: true };
  } catch (e: any) {
    console.warn("⚠️ Pinecone store failed (ignored):", e?.message || e);
    return { success: true, pinecone_ok: false };
  }
};

const calculateProfileCompleteness = async (candidateId: string) => {
  const { calculateProfileCompleteness } = await import("../candidate.service");
  await calculateProfileCompleteness(candidateId);
};