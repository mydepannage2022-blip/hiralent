// controllers/profile.controller.ts

import { Request, Response } from 'express';
import * as profileService from '../../services/profile.service';
import { APIResponse, SocialLink } from '../../types/candidate.types';

// ==================== BASIC INFO CONTROLLER ====================

export const updateBasicInfoController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const result = await profileService.updateBasicInfo(req.user.user_id, req.body);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Basic info updated successfully'
    } as APIResponse);
  } catch (error: any) {
    console.error('Error updating basic info:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update basic info',
      error: error.message
    } as APIResponse);
  }
};

// ==================== SKILLS CONTROLLERS ====================

export const updateSkillsController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const result = await profileService.updateSkills(req.user.user_id, req.body);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Skills updated successfully'
    } as APIResponse);
  } catch (error: any) {
    console.error('Error updating skills:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update skills',
      error: error.message
    } as APIResponse);
  }
};

export const addSkillController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const result = await profileService.addSkill(req.user.user_id, req.body);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Skill added successfully'
    } as APIResponse);
  } catch (error: any) {
    console.error('Error adding skill:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to add skill',
      error: error.message
    } as APIResponse);
  }
};

export const deleteSkillController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const skillId = req.params.skillId;
    if (!skillId) {
      res.status(400).json({
        success: false,
        message: 'Skill ID is required'
      } as APIResponse);
      return;
    }

    const result = await profileService.deleteSkill(req.user.user_id, skillId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Skill deleted successfully'
    } as APIResponse);
  } catch (error: any) {
    console.error('Error deleting skill:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete skill',
      error: error.message
    } as APIResponse);
  }
};

// ==================== EXPERIENCE CONTROLLERS ====================

export const updateExperienceController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const result = await profileService.updateExperience(req.user.user_id, req.body);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Experience updated successfully'
    } as APIResponse);
  } catch (error: any) {
    console.error('Error updating experience:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update experience',
      error: error.message
    } as APIResponse);
  }
};

export const addExperienceController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const result = await profileService.addExperience(req.user.user_id, req.body);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Experience added successfully'
    } as APIResponse);
  } catch (error: any) {
    console.error('Error adding experience:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to add experience',
      error: error.message
    } as APIResponse);
  }
};

// ==================== EDUCATION CONTROLLERS ====================

export const updateEducationController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const result = await profileService.updateEducation(req.user.user_id, req.body);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Education updated successfully'
    } as APIResponse);
  } catch (error: any) {
    console.error('Error updating education:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update education',
      error: error.message
    } as APIResponse);
  }
};

export const addEducationController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const result = await profileService.addEducation(req.user.user_id, req.body);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Education added successfully'
    } as APIResponse);
  } catch (error: any) {
    console.error('Error adding education:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to add education',
      error: error.message
    } as APIResponse);
  }
};

// ==================== LINKS CONTROLLERS ====================

export const updateLinksController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const result = await profileService.updateLinks(req.user.user_id, req.body);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Social links updated successfully'
    } as APIResponse);
  } catch (error: any) {
    console.error('Error updating links:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update links',
      error: error.message
    } as APIResponse);
  }
};

export const addLinkController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const result = await profileService.addLink(req.user.user_id, req.body);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Social link added successfully'
    } as APIResponse);
  } catch (error: any) {
    console.error('Error adding link:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to add link',
      error: error.message
    } as APIResponse);
  }
};

export const deleteLinkController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const linkIndex = parseInt(req.params.index);
    if (isNaN(linkIndex)) {
      res.status(400).json({
        success: false,
        message: 'Valid link index is required'
      } as APIResponse);
      return;
    }

    const result = await profileService.deleteLink(req.user.user_id, linkIndex);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Social link deleted successfully'
    } as APIResponse);
  } catch (error: any) {
    console.error('Error deleting link:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete link',
      error: error.message
    } as APIResponse);
  }
};

// ==================== JOB BENEFITS CONTROLLER ====================

export const updateJobBenefitsController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const result = await profileService.updateJobBenefits(req.user.user_id, req.body);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Job benefits updated successfully'
    } as APIResponse);
  } catch (error: any) {
    console.error('Error updating job benefits:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update job benefits',
      error: error.message
    } as APIResponse);
  }
};

// ==================== BULK UPDATE CONTROLLER ====================

export const bulkUpdateProfileController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const result = await profileService.bulkUpdateProfile(req.user.user_id, req.body);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Profile updated successfully'
    } as APIResponse);
  } catch (error: any) {
    console.error('Error in bulk profile update:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update profile',
      error: error.message
    } as APIResponse);
  }
};

export const uploadApplicationResumeController = async (
  req: Request, 
  res: Response
): Promise<void> => {
  try {
    // User is guaranteed to exist due to checkAuth middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error_code: 'UNAUTHORIZED'
      } as APIResponse);
      return;
    }

    // File is guaranteed to exist due to validation middleware
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No resume file provided',
        error_code: 'NO_FILE'
      } as APIResponse);
      return;
    }

    console.log(`Application resume upload initiated for user: ${req.user.user_id}`);
    console.log(`File details:`, {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Upload to Cloudinary and update database
    const result = await profileService.uploadApplicationResume(
      req.user.user_id, 
      req.file
    );

    console.log(`Application resume upload completed for user: ${req.user.user_id}`);

    res.status(200).json({
      success: true,
      data: result.data,
      message: 'Application resume uploaded successfully'
    } as APIResponse);

  } catch (error) {
    console.error('Controller error - Application resume upload:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload application resume',
      error_code: 'UPLOAD_FAILED',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};
