import { Request, Response } from 'express';
import * as companyService from '../../services/company.service';


export const createProfileController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Check if user role is company (accept company or company_admin)
    const roleLower = (req.user.role || '').toString().toLowerCase();
    if (roleLower !== 'company' && roleLower !== 'company_admin') {
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
  } catch (error: any) {
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

export const getProfileController = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    console.error('Error getting company profile:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get company profile'
    });
  }
};

export const updateProfileController = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    console.error('Error updating company profile:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update company profile'
    });
  }
};

export const getCompanyStatsController = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    console.error('Error getting company stats:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get company stats'
    });
  }
};
