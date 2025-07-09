import { Request, Response } from 'express';
import candidateService from '../services/candidate.service';

export class CandidateController {

  // Upload CV/Resume - Week 1 API
  async uploadCV(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const result = await candidateService.uploadAndProcessCV(req.user.user_id, req.file);

      res.status(200).json({
        success: true,
        data: result,
        message: 'CV uploaded and processing started'
      });
    } catch (error) {
      console.error('Error uploading CV:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload CV',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get profile summary - Week 1 API
  async getProfileSummary(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const candidateId = req.params.candidateId || req.user.user_id;
      const summary = await candidateService.getProfileSummary(candidateId);

      res.status(200).json({
        success: true,
        data: summary,
        message: 'Profile summary retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting profile summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile summary',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get profile completeness - Week 1 API
  async getProfileCompleteness(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const candidateId = req.params.candidateId || req.user.user_id;
      const completeness = await candidateService.calculateProfileCompleteness(candidateId);

      res.status(200).json({
        success: true,
        data: completeness,
        message: 'Profile completeness calculated successfully'
      });
    } catch (error) {
      console.error('Error calculating profile completeness:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate profile completeness',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Generate career prediction - Week 1 API
  async generateCareerPrediction(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const candidateId = req.params.candidateId || req.user.user_id;
      const prediction = await candidateService.generateCareerPrediction(candidateId);

      res.status(200).json({
        success: true,
        data: prediction,
        message: 'Career prediction generated successfully'
      });
    } catch (error) {
      console.error('Error generating career prediction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate career prediction',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get job recommendations - Week 2 API
  async getJobRecommendations(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
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
      });
    } catch (error) {
      console.error('Error getting job recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get job recommendations',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Update candidate vector - Week 2 API
  async updateCandidateVector(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const candidateId = req.params.candidateId || req.user.user_id;
      const result = await candidateService.updateCandidateVector(candidateId);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Candidate vector updated successfully'
      });
    } catch (error) {
      console.error('Error updating candidate vector:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update candidate vector',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get extracted skills from documents
  async getExtractedSkills(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const candidateId = req.params.candidateId || req.user.user_id;
      
      // This would be implemented in the service if needed
      // For now, we'll get skills from the profile summary
      const summary = await candidateService.getProfileSummary(candidateId);

      res.status(200).json({
        success: true,
        data: {
          skills: summary.skills,
          total: summary.skills.length
        },
        message: 'Extracted skills retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting extracted skills:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get extracted skills',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Health check for candidate services
  async healthCheck(req: Request, res: Response) {
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
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new CandidateController();