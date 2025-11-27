// backend/src/controller/session.controller.ts

import { Request, Response } from 'express';
import * as sessionService from '../../services/auth/session.service';
import { getClientIP } from '../../utils/locationDetector.util';

// Get all active sessions for current user
export const getUserSessionsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({ 
        error: true, 
        message: 'User not authenticated' 
      });
    }

    const sessions = await sessionService.getUserSessions(userId);
    
    res.status(200).json({
      success: true,
      data: sessions,
      count: sessions.length
    });
  } catch (error: any) {
    console.error('Get User Sessions Error:', error);
    res.status(500).json({ 
      error: true, 
      message: error.message || 'Failed to fetch sessions' 
    });
  }
};

// Get current session details
export const getCurrentSessionController = async (req: Request, res: Response) => {
  try {
    const sessionId = req.user?.session_id;
    const userId = req.user?.user_id;
    
    if (!sessionId || !userId) {
      return res.status(401).json({ 
        error: true, 
        message: 'Session not found' 
      });
    }

    const sessions = await sessionService.getUserSessions(userId);
    const currentSession = sessions.find(s => s.session_id === sessionId);
    
    if (!currentSession) {
      return res.status(404).json({ 
        error: true, 
        message: 'Current session not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: currentSession
    });
  } catch (error: any) {
    console.error('Get Current Session Error:', error);
    res.status(500).json({ 
      error: true, 
      message: error.message || 'Failed to fetch current session' 
    });
  }
};

// Terminate specific session
export const terminateSessionController = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const currentUserId = req.user?.user_id;
    const currentSessionId = req.user?.session_id;
    
    if (!currentUserId) {
      return res.status(401).json({ 
        error: true, 
        message: 'User not authenticated' 
      });
    }

    // Prevent terminating current session via this endpoint
    if (sessionId === currentSessionId) {
      return res.status(400).json({ 
        error: true, 
        message: 'Cannot terminate current session. Use logout instead.' 
      });
    }

    // Verify session belongs to current user
    const isValid = await sessionService.validateSession(sessionId, currentUserId);
    if (!isValid) {
      return res.status(404).json({ 
        error: true, 
        message: 'Session not found or already terminated' 
      });
    }

    const success = await sessionService.terminateSession(sessionId, currentUserId);
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Session terminated successfully'
      });
    } else {
      res.status(400).json({ 
        error: true, 
        message: 'Failed to terminate session' 
      });
    }
  } catch (error: any) {
    console.error('Terminate Session Error:', error);
    res.status(500).json({ 
      error: true, 
      message: error.message || 'Failed to terminate session' 
    });
  }
};

// Terminate all other sessions (keep current one)
export const terminateOtherSessionsController = async (req: Request, res: Response) => {
  try {
    const currentSessionId = req.user?.session_id;
    const userId = req.user?.user_id;
    
    if (!currentSessionId || !userId) {
      return res.status(401).json({ 
        error: true, 
        message: 'User not authenticated' 
      });
    }

    const terminatedCount = await sessionService.terminateOtherSessions(currentSessionId, userId);
    
    res.status(200).json({
      success: true,
      message: `Terminated ${terminatedCount} other sessions`,
      terminated_count: terminatedCount
    });
  } catch (error: any) {
    console.error('Terminate Other Sessions Error:', error);
    res.status(500).json({ 
      error: true, 
      message: error.message || 'Failed to terminate other sessions' 
    });
  }
};

// Terminate all sessions (logout everywhere)
export const terminateAllSessionsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({ 
        error: true, 
        message: 'User not authenticated' 
      });
    }

    const terminatedCount = await sessionService.terminateAllSessions(userId);
    
    res.status(200).json({
      success: true,
      message: `Terminated all ${terminatedCount} sessions. Please login again.`,
      terminated_count: terminatedCount
    });
  } catch (error: any) {
    console.error('Terminate All Sessions Error:', error);
    res.status(500).json({ 
      error: true, 
      message: error.message || 'Failed to terminate all sessions' 
    });
  }
};

// Update session activity (called internally by middleware)
export const updateSessionActivityController = async (req: Request, res: Response) => {
  try {
    const sessionId = req.user?.session_id;
    
    if (!sessionId) {
      return res.status(401).json({ 
        error: true, 
        message: 'Session not found' 
      });
    }

    await sessionService.updateSessionActivity(sessionId);
    
    res.status(200).json({
      success: true,
      message: 'Session activity updated'
    });
  } catch (error: any) {
    console.error('Update Session Activity Error:', error);
    res.status(500).json({ 
      error: true, 
      message: error.message || 'Failed to update session activity' 
    });
  }
};

// Create session on login (called by auth controller)
export const createSessionController = async (req: Request, res: Response) => {
  try {
    const { userId, jwtToken } = req.body;
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = getClientIP(req);
    
    // Optional additional data
    const screenResolution = req.body.screenResolution;
    const timezone = req.body.timezone;
    const language = req.body.language;

    if (!userId || !jwtToken) {
      return res.status(400).json({ 
        error: true, 
        message: 'User ID and JWT token are required' 
      });
    }

    const sessionId = await sessionService.createSession({
      userId,
      jwtToken,
      userAgent,
      ipAddress,
      screenResolution,
      timezone,
      language
    });
    
    res.status(201).json({
      success: true,
      session_id: sessionId,
      message: 'Session created successfully'
    });
  } catch (error: any) {
    console.error('Create Session Error:', error);
    res.status(500).json({ 
      error: true, 
      message: error.message || 'Failed to create session' 
    });
  }
};

// Admin endpoint: Get sessions for any user
export const getSessionsForUserController = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserRole = req.user?.role;
    
    // Only admins can view other users' sessions
    if (currentUserRole !== 'superadmin' && currentUserRole !== 'admin') {
      return res.status(403).json({ 
        error: true, 
        message: 'Admin access required' 
      });
    }

    const sessions = await sessionService.getUserSessions(userId);
    
    res.status(200).json({
      success: true,
      data: sessions,
      count: sessions.length,
      user_id: userId
    });
  } catch (error: any) {
    console.error('Get Sessions For User Error:', error);
    res.status(500).json({ 
      error: true, 
      message: error.message || 'Failed to fetch user sessions' 
    });
  }
};
