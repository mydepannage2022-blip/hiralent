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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfileController = exports.getHeadlineController = exports.updateHeadlineController = exports.uploadProfilePictureController = exports.healthCheckController = exports.getExtractedSkillsController = exports.updateCandidateVectorController = exports.getJobRecommendationsController = exports.generateCareerPredictionController = exports.getProfileCompletenessController = exports.getProfileSummaryController = exports.uploadCVController = void 0;
exports.updateLocationHandler = updateLocationHandler;
exports.updateSalaryHandler = updateSalaryHandler;
const candidateService = __importStar(require("../services/candidate.service"));
const documentProcessor_service_1 = require("../services/candidate/documentProcessor.service");
// Upload CV/Resume - Week 1 API
const uploadCVController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
            return;
        }
        const result = await candidateService.uploadAndProcessCV(req.user.user_id, req.file);
        res.status(200).json({
            success: true,
            data: result,
            message: 'CV uploaded and processing started'
        });
    }
    catch (error) {
        console.error('Error uploading CV:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload CV',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.uploadCVController = uploadCVController;
// Get profile summary - Week 1 API
const getProfileSummaryController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const candidateId = req.params.candidateId || req.user.user_id;
        const summary = await candidateService.getProfileSummary(candidateId);
        res.status(200).json({
            success: true,
            data: summary,
            message: 'Profile summary retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting profile summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile summary',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getProfileSummaryController = getProfileSummaryController;
// Get profile completeness - Week 1 API
const getProfileCompletenessController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const candidateId = req.params.candidateId || req.user.user_id;
        const completeness = await candidateService.calculateProfileCompleteness(candidateId);
        res.status(200).json({
            success: true,
            data: completeness,
            message: 'Profile completeness calculated successfully'
        });
    }
    catch (error) {
        console.error('Error calculating profile completeness:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate profile completeness',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getProfileCompletenessController = getProfileCompletenessController;
// Generate career prediction - Week 1 API
const generateCareerPredictionController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const candidateId = req.params.candidateId || req.user.user_id;
        const prediction = await (0, documentProcessor_service_1.generateCareerPrediction)(candidateId);
        res.status(200).json({
            success: true,
            data: prediction,
            message: 'Career prediction generated successfully'
        });
    }
    catch (error) {
        console.error('Error generating career prediction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate career prediction',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.generateCareerPredictionController = generateCareerPredictionController;
// Get job recommendations - Week 2 API
const getJobRecommendationsController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const candidateId = req.params.candidateId || req.user.user_id;
        const limit = parseInt(req.query.limit) || 20;
        const recommendations = await candidateService.getJobRecommendations(candidateId, limit);
        res.status(200).json({
            success: true,
            data: recommendations,
            message: 'Job recommendations retrieved successfully',
            meta: {
                total: recommendations.length,
                limit
            }
        });
    }
    catch (error) {
        console.error('Error getting job recommendations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get job recommendations',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getJobRecommendationsController = getJobRecommendationsController;
// Update candidate vector - Week 2 API
const updateCandidateVectorController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const candidateId = req.params.candidateId || req.user.user_id;
        const result = await (0, documentProcessor_service_1.updateCandidateVector)(candidateId);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Candidate vector updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating candidate vector:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update candidate vector',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.updateCandidateVectorController = updateCandidateVectorController;
// Get extracted skills from documents
const getExtractedSkillsController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const candidateId = req.params.candidateId || req.user.user_id;
        // Get skills from the profile summary
        const summary = await candidateService.getProfileSummary(candidateId);
        res.status(200).json({
            success: true,
            data: {
                skills: summary.skills,
                total: summary.skills.length
            },
            message: 'Extracted skills retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting extracted skills:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get extracted skills',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getExtractedSkillsController = getExtractedSkillsController;
// Health check for candidate services
const healthCheckController = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Candidate service is healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                ai_services: 'available',
                vector_db: 'available'
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.healthCheckController = healthCheckController;
async function updateLocationHandler(req, res) {
    try {
        console.log("REQ BODY:", req.body);
        const userId = req.user.user_id;
        const input = req.body;
        const updatedProfile = await candidateService.updateCandidateLocation(userId, input);
        res.status(200).json({
            success: true,
            data: updatedProfile,
            message: 'Location updated successfully',
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update location',
            error: error.message,
        });
    }
}
async function updateSalaryHandler(req, res) {
    try {
        const userId = req.user.user_id;
        const input = req.body;
        const updatedProfile = await candidateService.updateCandidateSalary(userId, input);
        res.status(200).json({
            success: true,
            data: updatedProfile,
            message: 'Minimum salary updated successfully',
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update minimum salary',
            error: error.message,
        });
    }
}
const uploadProfilePictureController = async (req, res) => {
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
        // File is guaranteed to exist due to validateUploadedImage middleware
        if (!req.file) {
            res.status(400).json({
                success: false,
                message: 'No image file provided',
                error_code: 'NO_FILE'
            });
            return;
        }
        console.log(`Profile picture upload initiated for user: ${req.user.user_id}`);
        console.log(`File details:`, {
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
        // Upload to Cloudinary and update database
        const result = await candidateService.uploadProfilePicture(req.user.user_id, req.file);
        console.log(`Profile picture upload completed for user: ${req.user.user_id}`);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Profile picture uploaded successfully'
        });
    }
    catch (error) {
        console.error('Controller error - Profile picture upload:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload profile picture',
            error_code: 'UPLOAD_FAILED',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.uploadProfilePictureController = uploadProfilePictureController;
// Update candidate headline controller
const updateHeadlineController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const userId = req.user.user_id;
        const input = req.body;
        const result = await candidateService.updateCandidateHeadline(userId, input);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Headline updated successfully',
        });
    }
    catch (error) {
        console.error('Error updating headline:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update headline',
            error: error.message,
        });
    }
};
exports.updateHeadlineController = updateHeadlineController;
const getHeadlineController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const candidateId = req.params.candidateId || req.user.user_id;
        // Use existing service to get profile summary which now includes headline
        const summary = await candidateService.getProfileSummary(candidateId);
        res.status(200).json({
            success: true,
            data: {
                headline: summary.basic_info.headline || null
            },
            message: 'Headline retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting headline:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get headline',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getHeadlineController = getHeadlineController;
const getProfileController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const candidateId = req.params.candidateId || req.user.user_id;
        const profile = await candidateService.getCandidateProfile(candidateId);
        res.status(200).json({
            success: true,
            data: profile,
            message: 'Profile retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting candidate profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getProfileController = getProfileController;
