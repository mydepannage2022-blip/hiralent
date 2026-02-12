// backend/src/controller/employer.controller.ts

import { Request, Response } from "express";
import * as employerService from "../services/employer.service";
import type { AuthenticatedRequest } from "../types/session.types";

// Helper: Check if user is company user
const isCompanyUser = (role: string): boolean => {
  const roleLower = (role || "").toLowerCase();
  return roleLower === "company" || roleLower === "company_admin" || roleLower === "hr";
};

// Get company profile (dashboard)
export const getProfileController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const user_id = authenticatedReq.user?.user_id;

    if (!user_id) {
      return res.status(401).json({
        error: true,
        message: "User not authenticated",
      });
    }

    if (!isCompanyUser(authenticatedReq.user?.role || "")) {
      return res.status(403).json({
        error: true,
        message: "Only company users can access this resource",
      });
    }

    const profile = await employerService.getCompanyProfile(user_id);

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error: any) {
    console.error("Get employer profile error:", error);
    const message = error.message || "Failed to get company profile";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: true, message });
  }
};

// Update company info
export const updateCompanyInfoController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const user_id = authenticatedReq.user?.user_id;

    if (!user_id) {
      return res.status(401).json({
        error: true,
        message: "User not authenticated",
      });
    }

    if (!isCompanyUser(authenticatedReq.user?.role || "")) {
      return res.status(403).json({
        error: true,
        message: "Only company users can update company info",
      });
    }

    const profile = await employerService.updateCompanyInfo(user_id, req.body);

    res.status(200).json({
      success: true,
      message: "Company info updated successfully",
      profile,
    });
  } catch (error: any) {
    console.error("Update company info error:", error);
    const message = error.message || "Failed to update company info";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: true, message });
  }
};

// Update contact details
export const updateContactController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const user_id = authenticatedReq.user?.user_id;

    if (!user_id) {
      return res.status(401).json({
        error: true,
        message: "User not authenticated",
      });
    }

    if (!isCompanyUser(authenticatedReq.user?.role || "")) {
      return res.status(403).json({
        error: true,
        message: "Only company users can update contact details",
      });
    }

    const profile = await employerService.updateContact(user_id, req.body);

    res.status(200).json({
      success: true,
      message: "Contact details updated successfully",
      profile,
    });
  } catch (error: any) {
    console.error("Update contact error:", error);
    const message = error.message || "Failed to update contact details";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: true, message });
  }
};

// Update business details
export const updateBusinessDetailsController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const user_id = authenticatedReq.user?.user_id;

    if (!user_id) {
      return res.status(401).json({
        error: true,
        message: "User not authenticated",
      });
    }

    if (!isCompanyUser(authenticatedReq.user?.role || "")) {
      return res.status(403).json({
        error: true,
        message: "Only company users can update business details",
      });
    }

    const profile = await employerService.updateBusinessDetails(user_id, req.body);

    res.status(200).json({
      success: true,
      message: "Business details updated successfully",
      profile,
    });
  } catch (error: any) {
    console.error("Update business details error:", error);
    const message = error.message || "Failed to update business details";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: true, message });
  }
};

// Update hiring preferences
export const updateHiringPreferencesController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const user_id = authenticatedReq.user?.user_id;

    if (!user_id) {
      return res.status(401).json({
        error: true,
        message: "User not authenticated",
      });
    }

    if (!isCompanyUser(authenticatedReq.user?.role || "")) {
      return res.status(403).json({
        error: true,
        message: "Only company users can update hiring preferences",
      });
    }

    const profile = await employerService.updateHiringPreferences(user_id, req.body);

    res.status(200).json({
      success: true,
      message: "Hiring preferences updated successfully",
      profile,
    });
  } catch (error: any) {
    console.error("Update hiring preferences error:", error);
    const message = error.message || "Failed to update hiring preferences";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: true, message });
  }
};

// Update social links
export const updateSocialLinksController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const user_id = authenticatedReq.user?.user_id;

    if (!user_id) {
      return res.status(401).json({
        error: true,
        message: "User not authenticated",
      });
    }

    if (!isCompanyUser(authenticatedReq.user?.role || "")) {
      return res.status(403).json({
        error: true,
        message: "Only company users can update social links",
      });
    }

    const profile = await employerService.updateSocialLinks(user_id, req.body);

    res.status(200).json({
      success: true,
      message: "Social links updated successfully",
      profile,
    });
  } catch (error: any) {
    console.error("Update social links error:", error);
    const message = error.message || "Failed to update social links";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: true, message });
  }
};

// Upload logo
export const uploadLogoController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const user_id = authenticatedReq.user?.user_id;

    if (!user_id) {
      return res.status(401).json({
        error: true,
        message: "User not authenticated",
      });
    }

    if (!isCompanyUser(authenticatedReq.user?.role || "")) {
      return res.status(403).json({
        error: true,
        message: "Only company users can upload logo",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: "No file uploaded",
      });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: true,
        message: "Invalid file type. Allowed: JPG, PNG, WebP, GIF",
      });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        error: true,
        message: "File too large. Maximum size is 5MB",
      });
    }

    const result = await employerService.uploadLogo(user_id, req.file);

    res.status(200).json({
      success: true,
      message: "Logo uploaded successfully",
      logo_url: result.logo_url,
    });
  } catch (error: any) {
    console.error("Upload logo error:", error);
    const message = error.message || "Failed to upload logo";
    res.status(400).json({ error: true, message });
  }
};

// Remove logo
export const removeLogoController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const user_id = authenticatedReq.user?.user_id;

    if (!user_id) {
      return res.status(401).json({
        error: true,
        message: "User not authenticated",
      });
    }

    if (!isCompanyUser(authenticatedReq.user?.role || "")) {
      return res.status(403).json({
        error: true,
        message: "Only company users can remove logo",
      });
    }

    await employerService.removeLogo(user_id);

    res.status(200).json({
      success: true,
      message: "Logo removed successfully",
    });
  } catch (error: any) {
    console.error("Remove logo error:", error);
    const message = error.message || "Failed to remove logo";
    res.status(400).json({ error: true, message });
  }
};

// Upload cover image
export const uploadCoverController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const user_id = authenticatedReq.user?.user_id;

    if (!user_id) {
      return res.status(401).json({
        error: true,
        message: "User not authenticated",
      });
    }

    if (!isCompanyUser(authenticatedReq.user?.role || "")) {
      return res.status(403).json({
        error: true,
        message: "Only company users can upload cover image",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: "No file uploaded",
      });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: true,
        message: "Invalid file type. Allowed: JPG, PNG, WebP",
      });
    }

    // Validate file size (max 10MB for cover)
    const maxSize = 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({
        error: true,
        message: "File too large. Maximum size is 10MB",
      });
    }

    const result = await employerService.uploadCover(user_id, req.file);

    res.status(200).json({
      success: true,
      message: "Cover image uploaded successfully",
      cover_image_url: result.cover_image_url,
    });
  } catch (error: any) {
    console.error("Upload cover error:", error);
    const message = error.message || "Failed to upload cover image";
    res.status(400).json({ error: true, message });
  }
};

// Remove cover image
export const removeCoverController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const user_id = authenticatedReq.user?.user_id;

    if (!user_id) {
      return res.status(401).json({
        error: true,
        message: "User not authenticated",
      });
    }

    if (!isCompanyUser(authenticatedReq.user?.role || "")) {
      return res.status(403).json({
        error: true,
        message: "Only company users can remove cover image",
      });
    }

    await employerService.removeCover(user_id);

    res.status(200).json({
      success: true,
      message: "Cover image removed successfully",
    });
  } catch (error: any) {
    console.error("Remove cover error:", error);
    const message = error.message || "Failed to remove cover image";
    res.status(400).json({ error: true, message });
  }
};

// Check slug availability
export const checkSlugController = async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const user_id = authenticatedReq.user?.user_id;
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        error: true,
        message: "Slug is required",
      });
    }

    // Get company_id to exclude from check (if user is authenticated)
    let exclude_company_id: string | undefined;
    if (user_id && isCompanyUser(authenticatedReq.user?.role || "")) {
      try {
        exclude_company_id = await employerService.getCompanyIdFromUserId(user_id);
      } catch {
        // Ignore - user might not have company profile yet
      }
    }

    const result = await employerService.checkSlugAvailability(slug, exclude_company_id);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Check slug error:", error);
    const message = error.message || "Failed to check slug availability";
    res.status(400).json({ error: true, message });
  }
};

// Get public company profile (no auth required)
export const getPublicProfileController = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        error: true,
        message: "Company slug is required",
      });
    }

    const profile = await employerService.getPublicCompanyProfile(slug);

    if (!profile) {
      return res.status(404).json({
        error: true,
        message: "Company not found",
      });
    }

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error: any) {
    console.error("Get public profile error:", error);
    const message = error.message || "Failed to get company profile";
    res.status(400).json({ error: true, message });
  }
};

// Get public company jobs (no auth required)
export const getPublicJobsController = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!slug) {
      return res.status(400).json({
        error: true,
        message: "Company slug is required",
      });
    }

    const result = await employerService.getPublicCompanyJobs(slug, page, limit);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Get public jobs error:", error);
    const message = error.message || "Failed to get company jobs";
    res.status(400).json({ error: true, message });
  }
};
