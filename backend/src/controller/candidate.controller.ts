import { Request, Response } from 'express';
import * as candidateService from '../services/candidate.service';
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
  UpdateSalaryInput
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
    const prediction = await candidateService.generateCareerPrediction(candidateId);

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
    const result = await candidateService.updateCandidateVector(candidateId);

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
    const userId = (req.user as any).id;
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
    const userId = (req.user as any).id;
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
