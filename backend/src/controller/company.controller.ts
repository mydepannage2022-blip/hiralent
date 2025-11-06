// backend/src/controller/company.controller.ts
import { Request, Response } from "express";
import * as companyService from "../services/company.service";
import type { AuthenticatedRequest } from "../types/session.types";

export const createProfileController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
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
  } catch (error: any) {
    console.error('❌ Create company profile error:', error);
    const message = error instanceof Error ? error.message : "Failed to create company profile";
    res.status(400).json({
      error: true,
      message
    });
  }
};

export const getProfileController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
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
  } catch (error: any) {
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

export const updateProfileController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
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
  } catch (error: any) {
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

export const getCompanyStatsController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
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
  } catch (error: any) {
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

// Controller for document upload redirect (for legacy check email)
export const uploadDocumentsRedirectController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
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
  } catch (error: any) {
    console.error('❌ Upload documents redirect error:', error);
    const message = error instanceof Error ? error.message : "Failed to process upload request";
    res.status(400).json({
      error: true,
      message
    });
  }
};