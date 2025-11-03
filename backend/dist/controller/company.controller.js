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
exports.uploadDocumentsRedirectController = exports.getCompanyStatsController = exports.updateProfileController = exports.getProfileController = exports.createProfileController = void 0;
const companyService = __importStar(require("../services/company.service"));
const createProfileController = async (req, res) => {
    try {
        const authenticatedReq = req;
        console.log('📝 Create company profile request received from user:', authenticatedReq.user?.user_id);
        const user_id = authenticatedReq.user?.user_id;
        if (!user_id) {
            return res.status(401).json({
                error: true,
                message: "User not authenticated"
            });
        }
        // Accept both 'company' and 'company_admin' role variants
        const roleLower = (authenticatedReq.user?.role || '').toString().toLowerCase();
        if (roleLower !== 'company' && roleLower !== 'company_admin') {
            return res.status(403).json({
                error: true,
                message: "Only company users can create company profiles"
            });
        }
        const data = await companyService.createCompanyProfile(user_id, req.body);
        console.log('✅ Company profile created successfully for user:', user_id);
        res.status(201).json({
            success: true,
            message: "Company profile created successfully",
            profile: data.profile
        });
    }
    catch (error) {
        console.error('❌ Create company profile error:', error);
        const message = error instanceof Error ? error.message : "Failed to create company profile";
        res.status(400).json({
            error: true,
            message
        });
    }
};
exports.createProfileController = createProfileController;
const getProfileController = async (req, res) => {
    try {
        const authenticatedReq = req;
        console.log('📝 Get company profile request received from user:', authenticatedReq.user?.user_id);
        const user_id = authenticatedReq.user?.user_id;
        if (!user_id) {
            return res.status(401).json({
                error: true,
                message: "User not authenticated"
            });
        }
        const data = await companyService.getCompanyProfile(user_id);
        // Check if user has company role (accept company or company_admin)
        const userRoleLower = (data.user.role || '').toString().toLowerCase();
        if (userRoleLower !== 'company' && userRoleLower !== 'company_admin') {
            return res.status(403).json({
                error: true,
                message: "User is not a company"
            });
        }
        console.log('✅ Company profile retrieved successfully for user:', user_id);
        res.status(200).json({
            success: true,
            user: data.user,
            profile: data.profile
        });
    }
    catch (error) {
        console.error('❌ Get company profile error:', error);
        const message = error instanceof Error ? error.message : "Failed to get company profile";
        if (message.includes('not found')) {
            return res.status(404).json({
                error: true,
                message
            });
        }
        res.status(400).json({
            error: true,
            message
        });
    }
};
exports.getProfileController = getProfileController;
const updateProfileController = async (req, res) => {
    try {
        const authenticatedReq = req;
        console.log('📝 Update company profile request received from user:', authenticatedReq.user?.user_id);
        const user_id = authenticatedReq.user?.user_id;
        if (!user_id) {
            return res.status(401).json({
                error: true,
                message: "User not authenticated"
            });
        }
        // Accept both 'company' and 'company_admin' role variants
        const roleLowerUpdate = (authenticatedReq.user?.role || '').toString().toLowerCase();
        if (roleLowerUpdate !== 'company' && roleLowerUpdate !== 'company_admin') {
            return res.status(403).json({
                error: true,
                message: "Only company users can update company profiles"
            });
        }
        const updatedProfile = await companyService.updateCompanyProfile(user_id, req.body);
        console.log('✅ Company profile updated successfully for user:', user_id);
        res.status(200).json({
            success: true,
            message: "Company profile updated successfully",
            profile: updatedProfile
        });
    }
    catch (error) {
        console.error('❌ Update company profile error:', error);
        const message = error instanceof Error ? error.message : "Failed to update company profile";
        if (message.includes('not found')) {
            return res.status(404).json({
                error: true,
                message
            });
        }
        res.status(400).json({
            error: true,
            message
        });
    }
};
exports.updateProfileController = updateProfileController;
const getCompanyStatsController = async (req, res) => {
    try {
        const authenticatedReq = req;
        console.log('📝 Get company stats request received from user:', authenticatedReq.user?.user_id);
        const user_id = authenticatedReq.user?.user_id;
        if (!user_id) {
            return res.status(401).json({
                error: true,
                message: "User not authenticated"
            });
        }
        // Accept both 'company' and 'company_admin' role variants
        const roleLowerStats = (authenticatedReq.user?.role || '').toString().toLowerCase();
        if (roleLowerStats !== 'company' && roleLowerStats !== 'company_admin') {
            return res.status(403).json({
                error: true,
                message: "Only company users can view company stats"
            });
        }
        const stats = await companyService.getCompanyStats(user_id);
        console.log('✅ Company stats retrieved successfully for user:', user_id);
        res.status(200).json({
            success: true,
            ...stats
        });
    }
    catch (error) {
        console.error('❌ Get company stats error:', error);
        const message = error instanceof Error ? error.message : "Failed to get company stats";
        if (message.includes('not found')) {
            return res.status(404).json({
                error: true,
                message
            });
        }
        res.status(400).json({
            error: true,
            message
        });
    }
};
exports.getCompanyStatsController = getCompanyStatsController;
// Controller for document upload redirect (for legacy check email)
const uploadDocumentsRedirectController = async (req, res) => {
    try {
        const authenticatedReq = req;
        console.log('📝 Upload documents redirect request received from user:', authenticatedReq.user?.user_id);
        const user_id = authenticatedReq.user?.user_id;
        if (!user_id) {
            return res.status(401).json({
                error: true,
                message: "User not authenticated"
            });
        }
        // Accept both 'company' and 'company_admin' role variants
        const roleLowerUpload = (authenticatedReq.user?.role || '').toString().toLowerCase();
        if (roleLowerUpload !== 'company' && roleLowerUpload !== 'company_admin') {
            return res.status(403).json({
                error: true,
                message: "Only company users can upload documents"
            });
        }
        console.log('✅ Upload documents redirect successful for user:', user_id);
        res.status(200).json({
            success: true,
            message: "Redirect to document upload page",
            // Align redirect path with frontend and email templates
            redirectUrl: "/company/upload",
            action: "upload_documents",
            user_id: user_id
        });
    }
    catch (error) {
        console.error('❌ Upload documents redirect error:', error);
        const message = error instanceof Error ? error.message : "Failed to process upload request";
        res.status(400).json({
            error: true,
            message
        });
    }
};
exports.uploadDocumentsRedirectController = uploadDocumentsRedirectController;
