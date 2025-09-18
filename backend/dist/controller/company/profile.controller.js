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
exports.getCompanyStatsController = exports.updateProfileController = exports.getProfileController = exports.createProfileController = void 0;
const companyService = __importStar(require("../../services/company.service"));
const createProfileController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        // Check if user role is company
        if (req.user.role !== 'company_admin') {
            res.status(403).json({
                success: false,
                message: 'Only company users can create company profiles'
            });
            return;
        }
        const result = await companyService.createCompanyProfile(req.user.user_id, req.body);
        res.status(201).json({
            success: true,
            data: result,
            message: 'Company profile created successfully'
        });
    }
    catch (error) {
        console.error('Error creating company profile:', error);
        if (error.message === 'Company profile already exists') {
            res.status(409).json({
                success: false,
                message: error.message
            });
            return;
        }
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to create company profile',
            error: error.message
        });
    }
};
exports.createProfileController = createProfileController;
const getProfileController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const result = await companyService.getCompanyProfile(req.user.user_id);
        if (!result) {
            res.status(404).json({
                success: false,
                message: 'Company profile not found'
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: result,
            message: 'Company profile retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting company profile:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to get company profile'
        });
    }
};
exports.getProfileController = getProfileController;
const updateProfileController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const result = await companyService.updateCompanyProfile(req.user.user_id, req.body);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Company profile updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating company profile:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to update company profile'
        });
    }
};
exports.updateProfileController = updateProfileController;
const getCompanyStatsController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        const result = await companyService.getCompanyStats(req.user.user_id);
        res.status(200).json({
            success: true,
            data: result,
            message: 'Company stats retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting company stats:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to get company stats'
        });
    }
};
exports.getCompanyStatsController = getCompanyStatsController;
