"use strict";
// services/candidate/profileSection.service.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfileSectionStats = exports.validateProfileData = exports.processEducationUpdate = exports.processExperienceUpdate = exports.processSkillsUpdate = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ==================== HEAVY SKILLS PROCESSING ====================
const processSkillsUpdate = async (candidateId, skills) => {
    try {
        // Get existing skills
        const existingSkills = await prisma.candidateSkill.findMany({
            where: { candidate_id: candidateId }
        });
        const existingSkillMap = new Map(existingSkills.map(skill => [skill.skill_id, skill]));
        const incomingSkillsWithId = skills.filter(skill => skill.skill_id);
        const incomingSkillsWithoutId = skills.filter(skill => !skill.skill_id);
        // Skills to delete (existing but not in incoming)
        const toDelete = existingSkills.filter(existing => !incomingSkillsWithId.some(incoming => incoming.skill_id === existing.skill_id));
        // Skills to update (have skill_id and exist)
        const toUpdate = incomingSkillsWithId.filter(skill => existingSkillMap.has(skill.skill_id));
        // Skills to create (no skill_id)
        const toCreate = incomingSkillsWithoutId;
        // Execute operations in transaction
        await prisma.$transaction(async (tx) => {
            // Delete removed skills
            if (toDelete.length > 0) {
                await tx.candidateSkill.deleteMany({
                    where: {
                        skill_id: { in: toDelete.map(s => s.skill_id) },
                        candidate_id: candidateId
                    }
                });
            }
            // Update existing skills
            for (const skill of toUpdate) {
                await tx.candidateSkill.update({
                    where: { skill_id: skill.skill_id },
                    data: {
                        skill_name: skill.skill_name.trim(),
                        skill_category: skill.skill_category,
                        proficiency: skill.proficiency,
                        years_experience: skill.years_experience || 0,
                        updated_at: new Date()
                    }
                });
            }
            // Create new skills
            if (toCreate.length > 0) {
                await tx.candidateSkill.createMany({
                    data: toCreate.map(skill => ({
                        candidate_id: candidateId,
                        skill_name: skill.skill_name.trim(),
                        skill_category: skill.skill_category,
                        proficiency: skill.proficiency,
                        years_experience: skill.years_experience || 0,
                        source_type: "manual_entry",
                        is_verified: false
                    }))
                });
            }
        });
        // Return final count
        const finalCount = await prisma.candidateSkill.count({
            where: { candidate_id: candidateId }
        });
        return { skillsCount: finalCount };
    }
    catch (error) {
        console.error("Error in processSkillsUpdate:", error);
        throw new Error(`Skills processing failed: ${error.message || "Unknown error"}`);
    }
};
exports.processSkillsUpdate = processSkillsUpdate;
// ==================== HEAVY EXPERIENCE PROCESSING ====================
const processExperienceUpdate = async (candidateId, experiences) => {
    try {
        // Validate experience data
        const validatedExperiences = experiences.map((exp, index) => {
            if (!exp.job_title || exp.job_title.trim().length === 0) {
                throw new Error(`Experience ${index + 1}: Job title is required`);
            }
            if (!exp.company || exp.company.trim().length === 0) {
                throw new Error(`Experience ${index + 1}: Company name is required`);
            }
            if (!exp.description || exp.description.trim().length < 10) {
                throw new Error(`Experience ${index + 1}: Description must be at least 10 characters`);
            }
            return {
                ...exp,
                job_title: exp.job_title.trim(),
                company: exp.company.trim(),
                description: exp.description.trim(),
                duration: exp.duration.trim(),
                years: Math.max(0, exp.years), // Ensure non-negative
                currently_working: exp.currently_working || false,
                start_date: exp.start_date || null,
                end_date: exp.end_date || null
            };
        });
        // Sort experiences by years (most recent first)
        validatedExperiences.sort((a, b) => {
            if (a.currently_working && !b.currently_working)
                return -1;
            if (!a.currently_working && b.currently_working)
                return 1;
            return b.years - a.years;
        });
        // Update candidate profile
        await prisma.candidateProfile.upsert({
            where: { candidate_id: candidateId },
            update: {
                experience: JSON.stringify(validatedExperiences),
                updated_at: new Date()
            },
            create: {
                candidate_id: candidateId,
                experience: JSON.stringify(validatedExperiences)
            }
        });
        console.log(`Successfully processed ${validatedExperiences.length} experiences for candidate ${candidateId}`);
    }
    catch (error) {
        console.error("Error in processExperienceUpdate:", error);
        throw new Error(`Experience processing failed: ${error.message || "Unknown error"}`);
    }
};
exports.processExperienceUpdate = processExperienceUpdate;
// ==================== HEAVY EDUCATION PROCESSING ====================
const processEducationUpdate = async (candidateId, education) => {
    try {
        // Validate education data
        const validatedEducation = education.map((edu, index) => {
            if (!edu.degree || edu.degree.trim().length === 0) {
                throw new Error(`Education ${index + 1}: Degree is required`);
            }
            if (!edu.institution || edu.institution.trim().length === 0) {
                throw new Error(`Education ${index + 1}: Institution is required`);
            }
            if (!edu.field || edu.field.trim().length === 0) {
                throw new Error(`Education ${index + 1}: Field of study is required`);
            }
            return {
                ...edu,
                degree: edu.degree.trim(),
                institution: edu.institution.trim(),
                field: edu.field.trim(),
                year: edu.year.trim(),
                grade: edu.grade?.trim() || null,
                currently_studying: edu.currently_studying || false
            };
        });
        // Sort education by year (most recent first)
        validatedEducation.sort((a, b) => {
            if (a.currently_studying && !b.currently_studying)
                return -1;
            if (!a.currently_studying && b.currently_studying)
                return 1;
            // Extract year for sorting (handle ranges like "2020-2024")
            const extractYear = (yearStr) => {
                const years = yearStr.match(/\d{4}/g);
                return years ? parseInt(years[years.length - 1]) : 0;
            };
            return extractYear(b.year) - extractYear(a.year);
        });
        // Update candidate profile
        await prisma.candidateProfile.upsert({
            where: { candidate_id: candidateId },
            update: {
                education: JSON.stringify(validatedEducation),
                updated_at: new Date()
            },
            create: {
                candidate_id: candidateId,
                education: JSON.stringify(validatedEducation)
            }
        });
        console.log(`Successfully processed ${validatedEducation.length} education entries for candidate ${candidateId}`);
    }
    catch (error) {
        console.error("Error in processEducationUpdate:", error);
        throw new Error(`Education processing failed: ${error.message || "Unknown error"}`);
    }
};
exports.processEducationUpdate = processEducationUpdate;
// ==================== PROFILE DATA VALIDATION ====================
const validateProfileData = async (data) => {
    try {
        // Validate social links
        if (data.links) {
            const platforms = new Set();
            for (const link of data.links) {
                // Check for duplicate platforms
                if (platforms.has(link.platform)) {
                    throw new Error(`Duplicate platform found: ${link.platform}`);
                }
                platforms.add(link.platform);
                // Validate URL format
                try {
                    new URL(link.url);
                }
                catch {
                    throw new Error(`Invalid URL for ${link.platform}: ${link.url}`);
                }
                // Platform-specific validation
                if (link.platform === 'github' && !link.url.includes('github.com')) {
                    throw new Error("GitHub URL must contain 'github.com'");
                }
                if (link.platform === 'linkedin' && !link.url.includes('linkedin.com')) {
                    throw new Error("LinkedIn URL must contain 'linkedin.com'");
                }
            }
        }
        // Validate job benefits
        if (data.jobBenefits) {
            const benefitTypes = new Set();
            for (const benefit of data.jobBenefits) {
                // Check for duplicate benefit types
                if (benefitTypes.has(benefit.benefit_type)) {
                    throw new Error(`Duplicate benefit type found: ${benefit.benefit_type}`);
                }
                benefitTypes.add(benefit.benefit_type);
                // Validate notes length
                if (benefit.notes && benefit.notes.length > 200) {
                    throw new Error(`Notes for ${benefit.benefit_type} exceed 200 characters`);
                }
            }
        }
        console.log("Profile data validation completed successfully");
    }
    catch (error) {
        console.error("Error in validateProfileData:", error);
        throw new Error(`Profile data validation failed: ${error.message || "Unknown error"}`);
    }
};
exports.validateProfileData = validateProfileData;
// ==================== UTILITY FUNCTIONS ====================
const getProfileSectionStats = async (candidateId) => {
    try {
        const profile = await prisma.candidateProfile.findUnique({
            where: { candidate_id: candidateId }
        });
        const skillsCount = await prisma.candidateSkill.count({
            where: { candidate_id: candidateId }
        });
        let experienceCount = 0;
        let educationCount = 0;
        let linksCount = 0;
        let benefitsCount = 0;
        if (profile) {
            try {
                experienceCount = profile.experience ? JSON.parse(profile.experience).length : 0;
            }
            catch (e) {
                experienceCount = 0;
            }
            try {
                educationCount = profile.education ? JSON.parse(profile.education).length : 0;
            }
            catch (e) {
                educationCount = 0;
            }
            try {
                linksCount = profile.links ? JSON.parse(profile.links).length : 0;
            }
            catch (e) {
                linksCount = 0;
            }
            try {
                benefitsCount = profile.job_benefits ? JSON.parse(profile.job_benefits).length : 0;
            }
            catch (e) {
                benefitsCount = 0;
            }
        }
        return {
            skills: skillsCount,
            experience: experienceCount,
            education: educationCount,
            links: linksCount,
            job_benefits: benefitsCount
        };
    }
    catch (error) {
        console.error("Error getting profile section stats:", error);
        throw new Error("Failed to get profile section statistics");
    }
};
exports.getProfileSectionStats = getProfileSectionStats;
