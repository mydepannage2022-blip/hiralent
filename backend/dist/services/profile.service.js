"use strict";
// services/profile.service.ts
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
exports.uploadApplicationResume = exports.bulkUpdateProfile = exports.updateJobBenefits = exports.deleteLink = exports.addLink = exports.updateLinks = exports.addEducation = exports.updateEducation = exports.addExperience = exports.updateExperience = exports.deleteSkill = exports.addSkill = exports.updateSkills = exports.updateBasicInfo = void 0;
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const cloudinary_1 = require("cloudinary");
// Import heavy operations from separate service
const profileSection_service_1 = require("./candidate/profileSection.service");
const cleanup_service_1 = require("./candidate/cleanup.service");
const prisma = new client_1.PrismaClient();
// ==================== BASIC INFO MANAGEMENT ====================
const updateBasicInfo = async (candidateId, data) => {
    try {
        console.log("Updating basic info for candidate:", candidateId, data);
        const updatedFields = [];
        // Update User table fields
        const userUpdateData = {};
        if (data.full_name !== undefined) {
            userUpdateData.full_name = data.full_name;
            updatedFields.push('full_name');
        }
        if (data.phone_number !== undefined) {
            userUpdateData.phone_number = data.phone_number;
            updatedFields.push('phone_number');
        }
        // Update CandidateProfile table fields
        const profileUpdateData = {};
        if (data.about_me !== undefined) {
            profileUpdateData.about_me = data.about_me;
            updatedFields.push('about_me');
        }
        if (data.location !== undefined) {
            profileUpdateData.location = data.location;
            updatedFields.push('location');
        }
        // Update User if there are fields to update
        if (Object.keys(userUpdateData).length > 0) {
            await prisma.user.update({
                where: { user_id: candidateId },
                data: userUpdateData
            });
        }
        // Update CandidateProfile if there are fields to update
        if (Object.keys(profileUpdateData).length > 0) {
            await prisma.candidateProfile.upsert({
                where: { candidate_id: candidateId },
                update: {
                    ...profileUpdateData,
                    updated_at: new Date()
                },
                create: {
                    candidate_id: candidateId,
                    ...profileUpdateData
                }
            });
        }
        // Recalculate profile completeness
        const { calculateProfileCompleteness } = await Promise.resolve().then(() => __importStar(require("./candidate.service")));
        await calculateProfileCompleteness(candidateId);
        return {
            success: true,
            message: `Successfully updated ${updatedFields.join(', ')}`,
            updated_fields: updatedFields
        };
    }
    catch (error) {
        console.error("Error updating basic info:", error);
        throw new Error(`Failed to update basic info: ${error.message || "Unknown error"}`);
    }
};
exports.updateBasicInfo = updateBasicInfo;
// ==================== SKILLS MANAGEMENT ====================
const updateSkills = async (candidateId, data) => {
    try {
        // Use heavy operation service
        const result = await (0, profileSection_service_1.processSkillsUpdate)(candidateId, data.skills);
        // Recalculate profile completeness
        const { calculateProfileCompleteness } = await Promise.resolve().then(() => __importStar(require("./candidate.service")));
        await calculateProfileCompleteness(candidateId);
        return {
            success: true,
            message: `Successfully updated ${data.skills.length} skills`,
            skills_count: result.skillsCount
        };
    }
    catch (error) {
        console.error("Error updating skills:", error);
        throw new Error(`Failed to update skills: ${error.message || "Unknown error"}`);
    }
};
exports.updateSkills = updateSkills;
const addSkill = async (candidateId, data) => {
    try {
        // Check if skill already exists
        const existingSkill = await prisma.candidateSkill.findFirst({
            where: {
                candidate_id: candidateId,
                skill_name: { equals: data.skill_name, mode: 'insensitive' }
            }
        });
        if (existingSkill) {
            throw new Error("Skill already exists");
        }
        // Add new skill
        await prisma.candidateSkill.create({
            data: {
                candidate_id: candidateId,
                skill_name: data.skill_name,
                skill_category: data.skill_category,
                proficiency: data.proficiency,
                years_experience: data.years_experience || 0,
                confidence_score: 1.0,
                source_type: "manual_entry",
                is_verified: true
            }
        });
        // Get updated skills count
        const skillsCount = await prisma.candidateSkill.count({
            where: { candidate_id: candidateId }
        });
        // Recalculate profile completeness
        const { calculateProfileCompleteness } = await Promise.resolve().then(() => __importStar(require("./candidate.service")));
        await calculateProfileCompleteness(candidateId);
        return {
            success: true,
            message: `Successfully added skill: ${data.skill_name}`,
            skills_count: skillsCount
        };
    }
    catch (error) {
        console.error("Error adding skill:", error);
        throw new Error(`Failed to add skill: ${error.message || "Unknown error"}`);
    }
};
exports.addSkill = addSkill;
const deleteSkill = async (candidateId, skillId) => {
    try {
        // Verify skill belongs to candidate
        const skill = await prisma.candidateSkill.findFirst({
            where: {
                skill_id: skillId,
                candidate_id: candidateId
            }
        });
        if (!skill) {
            throw new Error("Skill not found");
        }
        // Delete skill
        await prisma.candidateSkill.delete({
            where: { skill_id: skillId }
        });
        // Get updated skills count
        const skillsCount = await prisma.candidateSkill.count({
            where: { candidate_id: candidateId }
        });
        // Recalculate profile completeness
        const { calculateProfileCompleteness } = await Promise.resolve().then(() => __importStar(require("./candidate.service")));
        await calculateProfileCompleteness(candidateId);
        return {
            success: true,
            message: `Successfully deleted skill: ${skill.skill_name}`,
            skills_count: skillsCount
        };
    }
    catch (error) {
        console.error("Error deleting skill:", error);
        throw new Error(`Failed to delete skill: ${error.message || "Unknown error"}`);
    }
};
exports.deleteSkill = deleteSkill;
// ==================== EXPERIENCE MANAGEMENT ====================
const updateExperience = async (candidateId, data) => {
    try {
        // Use heavy operation service
        await (0, profileSection_service_1.processExperienceUpdate)(candidateId, data.experiences);
        // Recalculate profile completeness
        const { calculateProfileCompleteness } = await Promise.resolve().then(() => __importStar(require("./candidate.service")));
        await calculateProfileCompleteness(candidateId);
        return {
            success: true,
            message: `Successfully updated ${data.experiences.length} experience entries`,
            experiences_count: data.experiences.length
        };
    }
    catch (error) {
        console.error("Error updating experience:", error);
        throw new Error(`Failed to update experience: ${error.message || "Unknown error"}`);
    }
};
exports.updateExperience = updateExperience;
const addExperience = async (candidateId, data) => {
    try {
        // Get existing experience
        const profile = await prisma.candidateProfile.findUnique({
            where: { candidate_id: candidateId }
        });
        let experiences = [];
        if (profile?.experience) {
            try {
                experiences = JSON.parse(profile.experience);
            }
            catch (e) {
                experiences = [];
            }
        }
        // Add new experience
        experiences.push(data);
        // Update profile
        await prisma.candidateProfile.upsert({
            where: { candidate_id: candidateId },
            update: {
                experience: JSON.stringify(experiences),
                updated_at: new Date()
            },
            create: {
                candidate_id: candidateId,
                experience: JSON.stringify(experiences)
            }
        });
        // Recalculate profile completeness
        const { calculateProfileCompleteness } = await Promise.resolve().then(() => __importStar(require("./candidate.service")));
        await calculateProfileCompleteness(candidateId);
        return {
            success: true,
            message: `Successfully added experience: ${data.job_title} at ${data.company}`,
            experiences_count: experiences.length
        };
    }
    catch (error) {
        console.error("Error adding experience:", error);
        throw new Error(`Failed to add experience: ${error.message || "Unknown error"}`);
    }
};
exports.addExperience = addExperience;
// ==================== EDUCATION MANAGEMENT ====================
const updateEducation = async (candidateId, data) => {
    try {
        // Use heavy operation service
        await (0, profileSection_service_1.processEducationUpdate)(candidateId, data.education);
        // Recalculate profile completeness
        const { calculateProfileCompleteness } = await Promise.resolve().then(() => __importStar(require("./candidate.service")));
        await calculateProfileCompleteness(candidateId);
        return {
            success: true,
            message: `Successfully updated ${data.education.length} education entries`,
            education_count: data.education.length
        };
    }
    catch (error) {
        console.error("Error updating education:", error);
        throw new Error(`Failed to update education: ${error.message || "Unknown error"}`);
    }
};
exports.updateEducation = updateEducation;
const addEducation = async (candidateId, data) => {
    try {
        // Get existing education
        const profile = await prisma.candidateProfile.findUnique({
            where: { candidate_id: candidateId }
        });
        let education = [];
        if (profile?.education) {
            try {
                education = JSON.parse(profile.education);
            }
            catch (e) {
                education = [];
            }
        }
        // Add new education
        education.push(data);
        // Update profile
        await prisma.candidateProfile.upsert({
            where: { candidate_id: candidateId },
            update: {
                education: JSON.stringify(education),
                updated_at: new Date()
            },
            create: {
                candidate_id: candidateId,
                education: JSON.stringify(education)
            }
        });
        // Recalculate profile completeness
        const { calculateProfileCompleteness } = await Promise.resolve().then(() => __importStar(require("./candidate.service")));
        await calculateProfileCompleteness(candidateId);
        return {
            success: true,
            message: `Successfully added education: ${data.degree} from ${data.institution}`,
            education_count: education.length
        };
    }
    catch (error) {
        console.error("Error adding education:", error);
        throw new Error(`Failed to add education: ${error.message || "Unknown error"}`);
    }
};
exports.addEducation = addEducation;
// ==================== LINKS MANAGEMENT ====================
const updateLinks = async (candidateId, data) => {
    try {
        // Validate links
        await (0, profileSection_service_1.validateProfileData)({ links: data.links });
        // Update profile with links
        await prisma.candidateProfile.upsert({
            where: { candidate_id: candidateId },
            update: {
                links: JSON.stringify(data.links),
                updated_at: new Date()
            },
            create: {
                candidate_id: candidateId,
                links: JSON.stringify(data.links)
            }
        });
        return {
            success: true,
            message: `Successfully updated ${data.links.length} social links`,
            links_count: data.links.length
        };
    }
    catch (error) {
        console.error("Error updating links:", error);
        throw new Error(`Failed to update links: ${error.message || "Unknown error"}`);
    }
};
exports.updateLinks = updateLinks;
const addLink = async (candidateId, linkData) => {
    try {
        // Get existing links
        const profile = await prisma.candidateProfile.findUnique({
            where: { candidate_id: candidateId }
        });
        let links = [];
        if (profile?.links) {
            try {
                links = JSON.parse(profile.links);
            }
            catch (e) {
                links = [];
            }
        }
        // Check if platform already exists
        const existingLink = links.find(link => link.platform === linkData.platform);
        if (existingLink) {
            throw new Error(`${linkData.platform} link already exists`);
        }
        // Add new link
        links.push(linkData);
        // Update profile
        await prisma.candidateProfile.upsert({
            where: { candidate_id: candidateId },
            update: {
                links: JSON.stringify(links),
                updated_at: new Date()
            },
            create: {
                candidate_id: candidateId,
                links: JSON.stringify(links)
            }
        });
        return {
            success: true,
            message: `Successfully added ${linkData.platform} link`,
            links_count: links.length
        };
    }
    catch (error) {
        console.error("Error adding link:", error);
        throw new Error(`Failed to add link: ${error.message || "Unknown error"}`);
    }
};
exports.addLink = addLink;
const deleteLink = async (candidateId, linkIndex) => {
    try {
        // Get existing links
        const profile = await prisma.candidateProfile.findUnique({
            where: { candidate_id: candidateId }
        });
        if (!profile?.links) {
            throw new Error("No links found");
        }
        let links = [];
        try {
            links = JSON.parse(profile.links);
        }
        catch (e) {
            throw new Error("Invalid links data");
        }
        if (linkIndex < 0 || linkIndex >= links.length) {
            throw new Error("Link index out of range");
        }
        // Remove link at index
        const deletedLink = links[linkIndex];
        links.splice(linkIndex, 1);
        // Update profile
        await prisma.candidateProfile.update({
            where: { candidate_id: candidateId },
            data: {
                links: JSON.stringify(links),
                updated_at: new Date()
            }
        });
        return {
            success: true,
            message: `Successfully deleted ${deletedLink.platform} link`,
            links_count: links.length
        };
    }
    catch (error) {
        console.error("Error deleting link:", error);
        throw new Error(`Failed to delete link: ${error.message || "Unknown error"}`);
    }
};
exports.deleteLink = deleteLink;
// ==================== JOB BENEFITS MANAGEMENT ====================
const updateJobBenefits = async (candidateId, data) => {
    try {
        // Validate job benefits
        await (0, profileSection_service_1.validateProfileData)({ jobBenefits: data.job_benefits });
        // Update profile with job benefits
        await prisma.candidateProfile.upsert({
            where: { candidate_id: candidateId },
            update: {
                job_benefits: JSON.stringify(data.job_benefits),
                updated_at: new Date()
            },
            create: {
                candidate_id: candidateId,
                job_benefits: JSON.stringify(data.job_benefits)
            }
        });
        return {
            success: true,
            message: `Successfully updated ${data.job_benefits.length} job benefit preferences`,
            benefits_count: data.job_benefits.length
        };
    }
    catch (error) {
        console.error("Error updating job benefits:", error);
        throw new Error(`Failed to update job benefits: ${error.message || "Unknown error"}`);
    }
};
exports.updateJobBenefits = updateJobBenefits;
// ==================== BULK PROFILE UPDATE ====================
const bulkUpdateProfile = async (candidateId, data) => {
    try {
        const updatedSections = [];
        // Update basic info
        if (data.basic_info) {
            await (0, exports.updateBasicInfo)(candidateId, data.basic_info);
            updatedSections.push('basic_info');
        }
        // Update skills
        if (data.skills) {
            await (0, exports.updateSkills)(candidateId, { skills: data.skills });
            updatedSections.push('skills');
        }
        // Update experience
        if (data.experience) {
            await (0, exports.updateExperience)(candidateId, { experiences: data.experience });
            updatedSections.push('experience');
        }
        // Update education
        if (data.education) {
            await (0, exports.updateEducation)(candidateId, { education: data.education });
            updatedSections.push('education');
        }
        // Update links
        if (data.links) {
            await (0, exports.updateLinks)(candidateId, { links: data.links });
            updatedSections.push('links');
        }
        // Update job benefits
        if (data.job_benefits) {
            await (0, exports.updateJobBenefits)(candidateId, { job_benefits: data.job_benefits });
            updatedSections.push('job_benefits');
        }
        // Get updated completion score
        const { calculateProfileCompleteness } = await Promise.resolve().then(() => __importStar(require("./candidate.service")));
        const completeness = await calculateProfileCompleteness(candidateId);
        return {
            success: true,
            message: `Successfully updated ${updatedSections.join(', ')} sections`,
            updated_sections: updatedSections,
            new_completion_score: completeness.overall_score
        };
    }
    catch (error) {
        console.error("Error in bulk profile update:", error);
        throw new Error(`Failed to update profile: ${error.message || "Unknown error"}`);
    }
};
exports.bulkUpdateProfile = bulkUpdateProfile;
// backend/src/services/candidate.service.ts - Add this function
const uploadApplicationResume = async (candidateId, file) => {
    try {
        // Validate inputs
        if (!candidateId) {
            throw new Error("Candidate ID is required");
        }
        if (!file || !fs_1.default.existsSync(file.path)) {
            throw new Error("File not found after upload");
        }
        console.log(`Processing application resume upload for candidate: ${candidateId}`);
        // Get existing profile to check for old application resume
        const existingProfile = await prisma.candidateProfile.findUnique({
            where: { candidate_id: candidateId },
            select: { resume_application_url: true },
        });
        const oldApplicationResumeUrl = existingProfile?.resume_application_url;
        // Upload to Cloudinary  
        console.log("Uploading application resume to Cloudinary...");
        const cloudinaryResult = await cloudinary_1.v2.uploader.upload(file.path, {
            folder: "hiralent-candidate/application-resumes",
            public_id: `application_resume_${candidateId}_${Date.now()}`,
            resource_type: "raw", // For PDF/DOC files
            access_mode: 'public',
            type: 'upload'
        });
        console.log("Cloudinary upload successful:", cloudinaryResult.secure_url);
        // Update candidate profile with new application resume URL
        console.log("Updating database...");
        const updatedProfile = await prisma.candidateProfile.upsert({
            where: { candidate_id: candidateId },
            update: {
                resume_application_url: cloudinaryResult.secure_url,
                updated_at: new Date(),
            },
            create: {
                candidate_id: candidateId,
                resume_application_url: cloudinaryResult.secure_url,
            },
        });
        console.log("Database updated successfully");
        // Clean up temporary file
        (0, cleanup_service_1.cleanupTempFile)(file.path);
        // Delete old application resume from Cloudinary if exists
        if (oldApplicationResumeUrl && oldApplicationResumeUrl !== cloudinaryResult.secure_url) {
            await (0, cleanup_service_1.cleanupOldApplicationResume)(candidateId, oldApplicationResumeUrl);
        }
        return {
            success: true,
            data: {
                resume_application_url: cloudinaryResult.secure_url,
                file_name: file.originalname,
            },
            message: "Application resume uploaded successfully",
        };
    }
    catch (error) {
        console.error("Service error - Application resume upload:", error);
        // Clean up temporary file in case of error
        if (file && fs_1.default.existsSync(file.path)) {
            (0, cleanup_service_1.cleanupTempFile)(file.path);
        }
        // Re-throw with more context
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Application resume upload failed: ${errorMessage}`);
    }
};
exports.uploadApplicationResume = uploadApplicationResume;
