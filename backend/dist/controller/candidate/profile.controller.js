"use strict";
// controllers/profile.controller.ts
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadApplicationResumeController = exports.bulkUpdateProfileController = exports.updateJobBenefitsController = exports.deleteLinkController = exports.addLinkController = exports.updateLinksController = exports.addEducationController = exports.updateEducationController = exports.addExperienceController = exports.updateExperienceController = exports.deleteSkillController = exports.addSkillController = exports.updateSkillsController = exports.updateBasicInfoController = void 0;
const profileService = __importStar(require("../../services/profile.service"));
// ==================== BASIC INFO CONTROLLER ====================
const updateBasicInfoController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const result = await profileService.updateBasicInfo(req.user.user_id, req.body);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Basic info updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating basic info:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update basic info',
            error: error.message
        });
    }
};
exports.updateBasicInfoController = updateBasicInfoController;
// ==================== SKILLS CONTROLLERS ====================
const updateSkillsController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const result = await profileService.updateSkills(req.user.user_id, req.body);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Skills updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating skills:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update skills',
            error: error.message
        });
    }
};
exports.updateSkillsController = updateSkillsController;
const addSkillController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const result = await profileService.addSkill(req.user.user_id, req.body);
        res.status(201).json({
            success: true,
            data: result,
            message: 'Skill added successfully'
        });
    }
    catch (error) {
        console.error('Error adding skill:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to add skill',
            error: error.message
        });
    }
};
exports.addSkillController = addSkillController;
const deleteSkillController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const skillId = req.params.skillId;
        if (!skillId) {
            res.status(400).json({
                success: false,
                message: 'Skill ID is required'
            });
            return;
        }
        const result = await profileService.deleteSkill(req.user.user_id, skillId);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Skill deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting skill:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to delete skill',
            error: error.message
        });
    }
};
exports.deleteSkillController = deleteSkillController;
// ==================== EXPERIENCE CONTROLLERS ====================
const updateExperienceController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const result = await profileService.updateExperience(req.user.user_id, req.body);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Experience updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating experience:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update experience',
            error: error.message
        });
    }
};
exports.updateExperienceController = updateExperienceController;
const addExperienceController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const result = await profileService.addExperience(req.user.user_id, req.body);
        res.status(201).json({
            success: true,
            data: result,
            message: 'Experience added successfully'
        });
    }
    catch (error) {
        console.error('Error adding experience:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to add experience',
            error: error.message
        });
    }
};
exports.addExperienceController = addExperienceController;
// ==================== EDUCATION CONTROLLERS ====================
const updateEducationController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const result = await profileService.updateEducation(req.user.user_id, req.body);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Education updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating education:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update education',
            error: error.message
        });
    }
};
exports.updateEducationController = updateEducationController;
const addEducationController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const result = await profileService.addEducation(req.user.user_id, req.body);
        res.status(201).json({
            success: true,
            data: result,
            message: 'Education added successfully'
        });
    }
    catch (error) {
        console.error('Error adding education:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to add education',
            error: error.message
        });
    }
};
exports.addEducationController = addEducationController;
// ==================== LINKS CONTROLLERS ====================
const updateLinksController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const result = await profileService.updateLinks(req.user.user_id, req.body);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Social links updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating links:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update links',
            error: error.message
        });
    }
};
exports.updateLinksController = updateLinksController;
const addLinkController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const result = await profileService.addLink(req.user.user_id, req.body);
        res.status(201).json({
            success: true,
            data: result,
            message: 'Social link added successfully'
        });
    }
    catch (error) {
        console.error('Error adding link:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to add link',
            error: error.message
        });
    }
};
exports.addLinkController = addLinkController;
const deleteLinkController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const linkIndex = parseInt(req.params.index);
        if (isNaN(linkIndex)) {
            res.status(400).json({
                success: false,
                message: 'Valid link index is required'
            });
            return;
        }
        const result = await profileService.deleteLink(req.user.user_id, linkIndex);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Social link deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting link:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to delete link',
            error: error.message
        });
    }
};
exports.deleteLinkController = deleteLinkController;
// ==================== JOB BENEFITS CONTROLLER ====================
const updateJobBenefitsController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const result = await profileService.updateJobBenefits(req.user.user_id, req.body);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Job benefits updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating job benefits:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update job benefits',
            error: error.message
        });
    }
};
exports.updateJobBenefitsController = updateJobBenefitsController;
// ==================== BULK UPDATE CONTROLLER ====================
const bulkUpdateProfileController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const result = await profileService.bulkUpdateProfile(req.user.user_id, req.body);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Profile updated successfully'
        });
    }
    catch (error) {
        console.error('Error in bulk profile update:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update profile',
            error: error.message
        });
    }
};
exports.bulkUpdateProfileController = bulkUpdateProfileController;
const uploadApplicationResumeController = async (req, res) => {
    try {
        // User is guaranteed to exist due to checkAuth middleware
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
                error_code: 'UNAUTHORIZED'
            });
            return;
        }
        // File is guaranteed to exist due to validation middleware
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'No resume file provided',
                error_code: 'NO_FILE'
            });
            return;
        }
        console.log(`Application resume upload initiated for user: ${req.user.user_id}`);
        console.log(`File details:`, {
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
        // Upload to Cloudinary and update database
        const result = await profileService.uploadApplicationResume(req.user.user_id, req.file);
        console.log(`Application resume upload completed for user: ${req.user.user_id}`);
        res.status(200).json({
            success: true,
            data: result.data,
            message: 'Application resume uploaded successfully'
        });
    }
    catch (error) {
        console.error('Controller error - Application resume upload:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload application resume',
            error_code: 'UPLOAD_FAILED',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.uploadApplicationResumeController = uploadApplicationResumeController;
