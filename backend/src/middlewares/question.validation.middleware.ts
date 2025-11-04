import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  createQuestionSchema,
  updateQuestionSchema,
  questionFiltersSchema,
  generateQuestionSchema,
  bulkOperationSchema,
  questionIdParamSchema
} from '../validation/question.validator';

/**
 * Valide les données pour créer une question
 */
export function validateCreateQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = createQuestionSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Invalid question data',
        details: errors
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal validation error'
    });
  }
}

/**
 * Valide les données pour mettre à jour une question
 */
export function validateUpdateQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = updateQuestionSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Invalid update data',
        details: errors
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal validation error'
    });
  }
}

/**
 * Valide les données pour générer une question avec AI
 */
export function validateGenerateQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = generateQuestionSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Invalid generation parameters',
        details: errors
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal validation error'
    });
  }
}

/**
 * Valide les filtres de recherche de questions
 */
export function validateQuestionFilters(req: Request, res: Response, next: NextFunction) {
  try {
    req.query = questionFiltersSchema.parse(req.query) as any;
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Invalid filter parameters',
        details: errors
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal validation error'
    });
  }
}

/**
 * Valide l'ID de question dans les paramètres de route
 */
export function validateQuestionId(req: Request, res: Response, next: NextFunction) {
  try {
    req.params = questionIdParamSchema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Invalid question ID',
        details: errors
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal validation error'
    });
  }
}

/**
 * Valide les opérations en masse (bulk operations)
 */
export function validateBulkOperation(req: Request, res: Response, next: NextFunction) {
  try {
    req.body = bulkOperationSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Invalid bulk operation data',
        details: errors
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal validation error'
    });
  }
}