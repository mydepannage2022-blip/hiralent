import  prisma  from '../../lib/prisma';
import { hashPassword as hash } from '../../utils/hash.util';
import { detectDevice } from '../../utils/deviceDetector.util';
import { getLocationFromIP } from '../../utils/locationDetector.util';
import { 
  CreateSessionData, 
  SessionInfo, 
} from '../../types/session.types';

import * as blacklistService from './blacklist.service';

export const createSession = async (data: CreateSessionData): Promise<string> => {
  try {
    console.log('🔄 Creating session for user:', data.userId);
    
    // Hash the JWT token for security
    const tokenHash = await hash(data.jwtToken);
    console.log('🔐 Token hashed successfully');
    
    // Detect device information
    const deviceInfo = detectDevice(data.userAgent);
    
    // Get location from IP
    const locationInfo = await getLocationFromIP(data.ipAddress);
    
    // Set session expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Create device name
    const deviceName = `${deviceInfo.browser.name} on ${deviceInfo.os.name}`;
    console.log('📱 Device detected:', deviceName);
    
    // Mark all other sessions as not current
    await prisma.userSession.updateMany({
      where: { user_id: data.userId, is_active: true },
      data: { is_current: false }
    });
    
    // Check session limit (max 5 sessions per user)
    const sessionCount = await prisma.userSession.count({
      where: { user_id: data.userId, is_active: true }
    });
    console.log('📊 Current session count:', sessionCount);
    
    if (sessionCount >= 5) {
      // Delete oldest session
      const oldestSession = await prisma.userSession.findFirst({
        where: { user_id: data.userId, is_active: true },
        orderBy: { last_activity: 'asc' }
      });
      
      if (oldestSession) {
        await prisma.userSession.update({
          where: { session_id: oldestSession.session_id },
          data: { 
            is_active: false, 
            terminated_at: new Date(),
            terminated_by: 'system'
          }
        });
        console.log('🗑️ Oldest session terminated');
      }
    }
    
    // Create new session
    const session = await prisma.userSession.create({
      data: {
        user_id: data.userId,
        device_name: deviceName,
        device_type: deviceInfo.device.type,
        browser_name: deviceInfo.browser.name,
        browser_version: deviceInfo.browser.version,
        os_name: deviceInfo.os.name,
        os_version: deviceInfo.os.version,
        ip_address: data.ipAddress,
        location_country: locationInfo.country,
        location_city: locationInfo.city,
        location_region: locationInfo.region,
        jwt_token_hash: tokenHash,
        is_current: true,
        expires_at: expiresAt,
        user_agent: data.userAgent,
        screen_resolution: data.screenResolution,
        timezone: data.timezone,
        language: data.language
      }
    });
    
    console.log('✅ Session created successfully:', session.session_id);
    console.log('🔗 Token hash stored:', tokenHash.substring(0, 10) + '...');
    
    return session.session_id;
  } catch (error: any) {
    console.error('❌ Session creation failed:', error);
    throw new Error('Failed to create session');
  }
};

export const getUserSessions = async (userId: string): Promise<SessionInfo[]> => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: { 
        user_id: userId, 
        is_active: true,
        expires_at: { gt: new Date() }
      },
      orderBy: { last_activity: 'desc' }
    });
    
    return sessions.map(session => ({
      session_id: session.session_id,
      device_name: session.device_name || 'Unknown Device',
      device_type: session.device_type || 'unknown',
      browser_name: session.browser_name || 'Unknown',
      browser_version: session.browser_version || '',
      os_name: session.os_name || 'Unknown OS',
      location_city: session.location_city || 'Unknown',
      location_country: session.location_country || 'Unknown',
      is_current: session.is_current,
      last_activity: session.last_activity,
      login_time: session.login_time,
      ip_address: session.ip_address
    }));
  } catch (error: any) {
    console.error('Get User Sessions Error:', error);
    throw new Error('Failed to fetch sessions');
  }
};

export const terminateSession = async (sessionId: string, userId: string): Promise<boolean> => {
  try {
    const session = await prisma.userSession.findFirst({
      where: { 
        session_id: sessionId, 
        user_id: userId, 
        is_active: true 
      }
    });

    if (!session) return false;

    await blacklistService.addToBlacklist(
      session.jwt_token_hash, 
      sessionId, 
      userId
    );

    await prisma.userSession.update({
      where: { session_id: sessionId },
      data: {
        is_active: false,
        terminated_at: new Date(),
        terminated_by: 'user'
      }
    });

    return true;
  } catch (error: any) {
    console.error('Terminate Session Error:', error);
    return false;
  }
};

export const terminateOtherSessions = async (currentSessionId: string, userId: string): Promise<number> => {
  try {
    // Get all other sessions first (to blacklist their tokens)
    const otherSessions = await prisma.userSession.findMany({
      where: {
        user_id: userId,
        session_id: { not: currentSessionId },
        is_active: true
      }
    });

    // Add all JWT tokens to blacklist
    for (const session of otherSessions) {
      await blacklistService.addToBlacklist(
        session.jwt_token_hash,
        session.session_id,
        userId
      );
    }

    // Update all other sessions as terminated
    const result = await prisma.userSession.updateMany({
      where: {
        user_id: userId,
        session_id: { not: currentSessionId },
        is_active: true
      },
      data: {
        is_active: false,
        terminated_at: new Date(),
        terminated_by: 'user'
      }
    });
    
    return result.count;
  } catch (error: any) {
    console.error('Terminate Other Sessions Error:', error);
    throw new Error('Failed to terminate other sessions');
  }
};

export const terminateAllSessions = async (userId: string): Promise<number> => {
  try {
    const allSessions = await prisma.userSession.findMany({
      where: { user_id: userId, is_active: true }
    });

    for (const session of allSessions) {
      await blacklistService.addToBlacklist(
        session.jwt_token_hash,
        session.session_id,
        userId
      );
    }

    const result = await prisma.userSession.updateMany({
      where: { user_id: userId, is_active: true },
      data: {
        is_active: false,
        terminated_at: new Date(),
        terminated_by: 'user'
      }
    });
    
    return result.count;
  } catch (error: any) {
    console.error('Terminate All Sessions Error:', error);
    throw new Error('Failed to terminate all sessions');
  }
};

export const updateSessionActivity = async (sessionId: string): Promise<boolean> => {
  try {
    await prisma.userSession.update({
      where: { session_id: sessionId, is_active: true },
      data: { last_activity: new Date() }
    });
    
    return true;
  } catch (error: any) {
    // Silently fail to avoid breaking API requests
    console.warn('Update Session Activity Error:', error);
    return false;
  }
};

export const getSessionByToken = async (tokenHash: string) => {
  try {
    console.log('🔍 Looking for session with token hash:', tokenHash.substring(0, 10) + '...');
    
    const session = await prisma.userSession.findFirst({
      where: { 
        jwt_token_hash: tokenHash, 
        is_active: true,
        expires_at: { gt: new Date() }
      },
      include: { user: true }
    });
    
    if (session) {
      console.log('✅ Session found:', session.session_id);
    } else {
      console.log('❌ No session found for token hash');
      
      // Debug: Check all sessions for this user
      const allSessions = await prisma.userSession.findMany({
        where: { is_active: true },
        select: { session_id: true, user_id: true, jwt_token_hash: true }
      });
      console.log('🔍 All active sessions:', allSessions.length);
    }
    
    return session;
  } catch (error: any) {
    console.error('Get Session By Token Error:', error);
    return null;
  }
};

export const cleanupExpiredSessions = async (): Promise<number> => {
  try {
    const result = await prisma.userSession.updateMany({
      where: {
        is_active: true,
        expires_at: { lt: new Date() }
      },
      data: {
        is_active: false,
        terminated_at: new Date(),
        terminated_by: 'system'
      }
    });
    
    console.log(`Cleaned up ${result.count} expired sessions`);
    return result.count;
  } catch (error: any) {
    console.error('Cleanup Expired Sessions Error:', error);
    return 0;
  }
};

export const validateSession = async (sessionId: string, userId: string): Promise<boolean> => {
  try {
    const session = await prisma.userSession.findFirst({
      where: {
        session_id: sessionId,
        user_id: userId,
        is_active: true,
        expires_at: { gt: new Date() }
      }
    });
    
    return !!session;
  } catch (error: any) {
    console.error('Validate Session Error:', error);
    return false;
  }
};
