import { Request, Response } from 'express';
import * as candidateService from '../services/candidate.service';
import { generateCareerPrediction , updateCandidateVector} from '../services/candidate/documentProcessor.service'; 
import { AuthUser } from '../types/express';
import { 
  APIResponse, 
  CVUploadResponse, 
  CandidateProfileSummary, 
  ProfileCompletenessScore,
  CareerPredictionResult,
  JobRecommendation,
  HealthCheckResponse,
  UpdateLocationInput,
  UpdateSalaryInput,
  ProfilePictureUploadResponse,
  UpdateHeadlineInput,        // NEW - Add this import
  HeadlineUpdateResult 
} from '../types/candidate.types';


// Extend Request interface for better type safety
interface AuthenticatedRequest extends Request {
  user: AuthUser; // Make user required for authenticated routes
  params: {
    candidateId?: string;
  };
  query: {
    limit?: string;
  };
}

// Upload CV/Resume - Week 1 API
export const uploadCVController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded'
      } as APIResponse);
      return;
    }

    const result = await candidateService.uploadAndProcessCV(req.user.user_id, req.file);

    res.status(200).json({
      success: true,
      data: result,
      message: 'CV uploaded and processing started'
    } as APIResponse<CVUploadResponse>);
  } catch (error) {
    console.error('Error uploading CV:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload CV',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

// Get profile summary - Week 1 API
export const getProfileSummaryController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const candidateId = req.params.candidateId || req.user.user_id;
    const summary = await candidateService.getProfileSummary(candidateId);

    res.status(200).json({
      success: true,
      data: summary,
      message: 'Profile summary retrieved successfully'
    } as APIResponse<CandidateProfileSummary>);
  } catch (error) {
    console.error('Error getting profile summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

// Get profile completeness - Week 1 API
export const getProfileCompletenessController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const candidateId = req.params.candidateId || req.user.user_id;
    const completeness = await candidateService.calculateProfileCompleteness(candidateId);

    res.status(200).json({
      success: true,
      data: completeness,
      message: 'Profile completeness calculated successfully'
    } as APIResponse<ProfileCompletenessScore>);
  } catch (error) {
    console.error('Error calculating profile completeness:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate profile completeness',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

// Generate career prediction - Week 1 API
export const generateCareerPredictionController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const candidateId = req.params.candidateId || req.user.user_id;
    const prediction = await generateCareerPrediction(candidateId);

    res.status(200).json({
      success: true,
      data: prediction,
      message: 'Career prediction generated successfully'
    } as APIResponse<CareerPredictionResult>);
  } catch (error) {
    console.error('Error generating career prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate career prediction',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

// Get job recommendations - Week 2 API
export const getJobRecommendationsController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const candidateId = req.params.candidateId || req.user.user_id;
    const limit = parseInt(req.query.limit as string) || 20;
    const recommendations = await candidateService.getJobRecommendations(candidateId, limit);

    res.status(200).json({
      success: true,
      data: recommendations,
      message: 'Job recommendations retrieved successfully',
      meta: {
        total: recommendations.length,
        limit
      }
    } as APIResponse<JobRecommendation[]>);
  } catch (error) {
    console.error('Error getting job recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get job recommendations',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

// Update candidate vector - Week 2 API
export const updateCandidateVectorController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const candidateId = req.params.candidateId || req.user.user_id;
    const result = await updateCandidateVector(candidateId);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Candidate vector updated successfully'
    } as APIResponse);
  } catch (error) {
    console.error('Error updating candidate vector:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update candidate vector',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

// Get extracted skills from documents
export const getExtractedSkillsController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
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
    } as APIResponse);
  } catch (error) {
    console.error('Error getting extracted skills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get extracted skills',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

// Health check for candidate services
export const healthCheckController = async (req: Request, res: Response): Promise<void> => {
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
    } as HealthCheckResponse);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

export async function updateLocationHandler(req: Request, res: Response) {
  try {
     console.log("REQ BODY:", req.body);
   const userId = req.user.user_id;
    const input: UpdateLocationInput = req.body;
    const updatedProfile = await candidateService.updateCandidateLocation(userId, input);

    res.status(200).json({
      success: true,
      data: updatedProfile,
      message: 'Location updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update location',
      error: error.message,
    });
  }
}

export async function updateSalaryHandler(req: Request, res: Response) {
  try {
     const userId = req.user.user_id;
    const input: UpdateSalaryInput = req.body;
    const updatedProfile = await candidateService.updateCandidateSalary(userId, input);

    res.status(200).json({
      success: true,
      data: updatedProfile,
      message: 'Minimum salary updated successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update minimum salary',
      error: error.message,
    });
  }
}

export const uploadProfilePictureController = async (
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

    // File is guaranteed to exist due to validateUploadedImage middleware
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No image file provided',
        error_code: 'NO_FILE'
      } as APIResponse);
      return;
    }

    console.log(`Profile picture upload initiated for user: ${req.user.user_id}`);
    console.log(`File details:`, {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Upload to Cloudinary and update database
    const result = await candidateService.uploadProfilePicture(
      req.user.user_id, 
      req.file
    );

    console.log(`Profile picture upload completed for user: ${req.user.user_id}`);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Profile picture uploaded successfully'
    } as APIResponse<ProfilePictureUploadResponse>);

  } catch (error) {
    console.error('Controller error - Profile picture upload:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture',
      error_code: 'UPLOAD_FAILED',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

// Update candidate headline controller
export const updateHeadlineController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const userId = req.user.user_id;
    const input: UpdateHeadlineInput = req.body;
    
    const result = await candidateService.updateCandidateHeadline(userId, input);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Headline updated successfully',
    } as APIResponse<HeadlineUpdateResult>);
    
  } catch (error: any) {
    console.error('Error updating headline:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update headline',
      error: error.message,
    } as APIResponse);
  }
};

export const getHeadlineController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
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
    } as APIResponse);
    
  } catch (error: any) {
    console.error('Error getting headline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get headline',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

export const getProfileController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      } as APIResponse);
      return;
    }

    const candidateId = req.params.candidateId || req.user.user_id;
    const profile = await candidateService.getCandidateProfile(candidateId);

    res.status(200).json({
      success: true,
      data: profile,
      message: 'Profile retrieved successfully'
    } as APIResponse);
  } catch (error) {
    console.error('Error getting candidate profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};

// ==================== PUBLIC PROFILE CONTROLLER ====================

export const getPublicProfileController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { candidateId } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(candidateId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid candidate ID format'
      } as APIResponse);
      return;
    }

    const profile = await candidateService.getPublicProfile(candidateId);

    res.status(200).json({
      success: true,
      data: profile,
      message: 'Public profile retrieved successfully'
    } as APIResponse);
  } catch (error: any) {
    console.error('Error getting public profile:', error);
    
    if (error.message === 'Candidate profile not found') {
      res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      } as APIResponse);
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get public profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
};
