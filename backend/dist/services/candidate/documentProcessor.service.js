"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCandidateVector = exports.generateCareerPrediction = exports.processDocumentAsync = void 0;
const client_1 = require("@prisma/client");
const openai_1 = require("../../lib/openai");
const pinecone_1 = require("../../lib/pinecone");
const documentParser_util_1 = require("../../utils/documentParser.util");
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const prisma = new client_1.PrismaClient();
const processDocumentAsync = async (documentId, candidateId, cloudinaryUrl) => {
    try {
        // Update status to processing
        await prisma.candidateDocument.update({
            where: { document_id: documentId },
            data: { extraction_status: "processing" },
        });
        // Get document info
        const document = await prisma.candidateDocument.findUnique({
            where: { document_id: documentId },
        });
        if (!document) {
            throw new Error("Document not found");
        }
        // Download file from Cloudinary for AI processing using axios
        console.log("Downloading file from Cloudinary for processing...");
        console.log("Direct download URL:", cloudinaryUrl);
        // Use direct URL without any transformations or flags
        const response = await (0, axios_1.default)({
            method: 'GET',
            url: cloudinaryUrl, // Use direct secure_url
            responseType: 'arraybuffer',
            timeout: 30000, // 30 second timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        if (response.status !== 200) {
            throw new Error(`Failed to download file from Cloudinary: ${response.status} ${response.statusText}`);
        }
        console.log("File downloaded successfully, size:", response.data.byteLength);
        // Convert arraybuffer to buffer
        const buffer = Buffer.from(response.data);
        // Create temporary file for processing
        const tempFilePath = `./temp_processing_${documentId}.pdf`;
        fs_1.default.writeFileSync(tempFilePath, buffer);
        console.log("Temporary file created for processing:", tempFilePath);
        try {
            // Parse document text
            const parsedDoc = await (0, documentParser_util_1.parseDocument)(tempFilePath, document.file_type);
            const processedText = (0, documentParser_util_1.preprocessText)(parsedDoc.text);
            console.log("Text extraction completed, length:", processedText.length);
            // Update document with extracted text
            await prisma.candidateDocument.update({
                where: { document_id: documentId },
                data: {
                    processed_text: processedText,
                    extraction_status: "completed",
                },
            });
            // Create skill extraction record
            const skillExtraction = await prisma.skillExtraction.create({
                data: {
                    document_id: documentId,
                    candidate_id: candidateId,
                    status: "processing",
                    ai_provider: "gemini",
                },
            });
            // Extract skills using AI
            console.log("Starting AI skill extraction...");
            const startTime = Date.now();
            const extractedData = await (0, openai_1.extractSkillsFromText)(processedText);
            const processingTime = Date.now() - startTime;
            // Update skill extraction record
            await prisma.skillExtraction.update({
                where: { extraction_id: skillExtraction.extraction_id },
                data: {
                    status: "completed",
                    raw_response: JSON.stringify(extractedData),
                    extracted_skills: JSON.stringify(extractedData),
                    processing_time: processingTime,
                },
            });
            // Save extracted skills to database
            if (extractedData.skills && Array.isArray(extractedData.skills)) {
                console.log(`Saving ${extractedData.skills.length} extracted skills...`);
                for (const skill of extractedData.skills) {
                    await prisma.candidateSkill.create({
                        data: {
                            candidate_id: candidateId,
                            skill_name: skill.name,
                            skill_category: skill.category || "technical",
                            proficiency: skill.proficiency || "intermediate",
                            years_experience: skill.years_experience || 0,
                            confidence_score: 0.85,
                            source_type: "cv_extraction",
                            source_document_id: documentId,
                        },
                    });
                }
            }
            // Update candidate profile with extracted data
            await updateCandidateProfile(candidateId, extractedData);
            // Generate new career prediction
            await (0, exports.generateCareerPrediction)(candidateId);
            // Update candidate vector for job matching
            await (0, exports.updateCandidateVector)(candidateId);
            // Recalculate profile completeness
            await calculateProfileCompleteness(candidateId);
            console.log("✅ Document processing completed successfully");
        }
        finally {
            // Always clean up temporary processing file
            if (fs_1.default.existsSync(tempFilePath)) {
                fs_1.default.unlinkSync(tempFilePath);
                console.log("Temporary processing file cleaned up");
            }
        }
    }
    catch (error) {
        console.error("❌ Error processing document:", error);
        // Update extraction status to failed
        await prisma.skillExtraction.updateMany({
            where: {
                document_id: documentId,
                status: "processing",
            },
            data: {
                status: "failed",
                error_message: error instanceof Error ? error.message : "Unknown error",
            },
        });
        // Update document status to failed
        await prisma.candidateDocument.update({
            where: { document_id: documentId },
            data: { extraction_status: "failed" },
        });
    }
};
exports.processDocumentAsync = processDocumentAsync;
// Helper function to update candidate profile
const updateCandidateProfile = async (candidateId, extractedData) => {
    try {
        const existingProfile = await prisma.candidateProfile.findUnique({
            where: { candidate_id: candidateId },
        });
        // Get all skill IDs that were extracted and saved
        const extractedSkills = await prisma.candidateSkill.findMany({
            where: {
                candidate_id: candidateId,
                source_type: "cv_extraction"
            },
            select: { skill_id: true }
        });
        const skillIds = extractedSkills.map(skill => skill.skill_id);
        const profileData = {
            headline: extractedData.headline ? extractedData.headline.substring(0, 120) : undefined,
            skills: skillIds,
            education: JSON.stringify(extractedData.education || []),
            experience: JSON.stringify(extractedData.experience || []),
            languages: extractedData.languages ? JSON.stringify(extractedData.languages) : undefined,
        };
        if (existingProfile) {
            // Merge existing skill IDs with new ones (avoid duplicates)
            const existingSkillIds = existingProfile.skills || [];
            const mergedSkillIds = [...new Set([...existingSkillIds, ...skillIds])];
            await prisma.candidateProfile.update({
                where: { candidate_id: candidateId },
                data: {
                    ...profileData,
                    skills: mergedSkillIds, // Merged skill IDs
                },
            });
        }
        else {
            await prisma.candidateProfile.create({
                data: {
                    candidate_id: candidateId,
                    ...profileData,
                },
            });
        }
        // Log results
        console.log(`Profile updated with ${skillIds.length} new skill IDs`);
        if (extractedData.headline) {
            console.log("Headline extracted and stored:", extractedData.headline);
        }
    }
    catch (error) {
        console.error("Error updating candidate profile:", error);
    }
};
// Helper function to generate career prediction
const generateCareerPrediction = async (candidateId) => {
    try {
        // Get candidate data
        const candidate = await prisma.user.findUnique({
            where: { user_id: candidateId },
            include: {
                candidateProfile: true,
                candidateSkills: true,
            },
        });
        if (!candidate) {
            throw new Error("Candidate not found");
        }
        // Prepare data for AI prediction
        const candidateData = {
            skills: candidate.candidateSkills.map((s) => ({
                name: s.skill_name,
                category: s.skill_category || "technical",
                proficiency: s.proficiency || "intermediate",
                years_experience: s.years_experience || 0,
            })),
            education: candidate.candidateProfile?.education
                ? JSON.parse(candidate.candidateProfile.education)
                : [],
            experience: candidate.candidateProfile?.experience
                ? JSON.parse(candidate.candidateProfile.experience)
                : [],
        };
        // Generate prediction using AI (you'll need to import this function)
        const { predictCareerPath } = await Promise.resolve().then(() => __importStar(require("../../lib/openai")));
        const prediction = await predictCareerPath(candidateData);
        // Save prediction
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
    }
    catch (error) {
        console.error("Error generating career prediction:", error);
        const serviceError = new Error("Failed to generate career prediction");
        serviceError.code = "PREDICTION_FAILED";
        serviceError.statusCode = 500;
        throw serviceError;
    }
};
exports.generateCareerPrediction = generateCareerPrediction;
const updateCandidateVector = async (candidateId) => {
    try {
        const candidate = await prisma.user.findUnique({
            where: { user_id: candidateId },
            include: {
                candidateProfile: true,
                candidateSkills: true // Get skills from CandidateSkill table directly
            },
        });
        if (!candidate) {
            throw new Error("Candidate not found");
        }
        // Create text representation for embedding
        const headlineText = candidate.candidateProfile?.headline || "";
        // Use actual skill names from CandidateSkill table (not profile JSON)
        const skillsText = candidate.candidateSkills
            .map((s) => `${s.skill_name} (${s.proficiency})`)
            .join(", ");
        const experienceText = candidate.candidateProfile?.experience
            ? JSON.parse(candidate.candidateProfile.experience)
                .map((exp) => `${exp.job_title} at ${exp.company}`)
                .join(", ")
            : "";
        const educationText = candidate.candidateProfile?.education
            ? JSON.parse(candidate.candidateProfile.education)
                .map((edu) => `${edu.degree} in ${edu.field}`)
                .join(", ")
            : "";
        // Include headline in combined text
        const combinedText = `Headline: ${headlineText}. Skills: ${skillsText}. Experience: ${experienceText}. Education: ${educationText}`;
        // Create embeddings
        const combinedVector = await (0, openai_1.createEmbedding)(combinedText);
        const skillVector = skillsText ? await (0, openai_1.createEmbedding)(skillsText) : [];
        const experienceVector = experienceText
            ? await (0, openai_1.createEmbedding)(experienceText)
            : [];
        const educationVector = educationText
            ? await (0, openai_1.createEmbedding)(educationText)
            : [];
        // Save to database
        const existingVector = await prisma.candidateVector.findUnique({
            where: { candidate_id: candidateId },
        });
        const vectorData = {
            skill_vector: skillVector,
            experience_vector: experienceVector,
            education_vector: educationVector,
            combined_vector: combinedVector,
            vector_version: "v1.1", // Updated version for new skill flow
        };
        if (existingVector) {
            await prisma.candidateVector.update({
                where: { candidate_id: candidateId },
                data: vectorData,
            });
        }
        else {
            await prisma.candidateVector.create({
                data: {
                    candidate_id: candidateId,
                    ...vectorData,
                },
            });
        }
        // Store in Pinecone - include headline in metadata
        await (0, pinecone_1.storeCandidateVector)(candidateId, combinedVector, {
            skills_count: candidate.candidateSkills.length,
            full_name: candidate.full_name,
            email: candidate.email,
            headline: headlineText,
        });
        return { success: true };
    }
    catch (error) {
        console.error("Error updating candidate vector:", error);
        const serviceError = new Error("Failed to update candidate vector");
        serviceError.code = "VECTOR_UPDATE_FAILED";
        serviceError.statusCode = 500;
        throw serviceError;
    }
};
exports.updateCandidateVector = updateCandidateVector;
// Helper function to calculate profile completeness
const calculateProfileCompleteness = async (candidateId) => {
    try {
        // Import the function from main service
        const { calculateProfileCompleteness } = await Promise.resolve().then(() => __importStar(require("../candidate.service")));
        await calculateProfileCompleteness(candidateId);
    }
    catch (error) {
        console.error("Error calculating profile completeness:", error);
    }
};
