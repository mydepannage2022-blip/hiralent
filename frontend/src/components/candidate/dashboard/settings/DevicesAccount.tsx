// src/components/candidate/dashboard/settings/DevicesAccount.tsx

import React, { useState, useEffect } from "react";
import { MonitorSmartphone, Laptop, Smartphone, Tablet, Hand, X, Monitor, Globe, MapPin, Clock } from "lucide-react";

interface Session {
  session_id: string;
  device_name: string;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser_name: string;
  browser_version: string;
  os_name: string;
  location_city: string;
  location_country: string;
  is_current: boolean;
  last_activity: string;
  login_time: string;
  ip_address: string;
}

function DevicesAccount() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState<string | null>(null);
  const [terminatingAll, setTerminatingAll] = useState(false);

  // Get device icon based on type
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone size={20} className="text-gray-600" />;
      case 'tablet':
        return <Tablet size={20} className="text-gray-600" />;
      case 'desktop':
        return <Monitor size={20} className="text-gray-600" />;
      default:
        return <Laptop size={20} className="text-gray-600" />;
    }
  };

  // Format last activity time
  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) return 'Active now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Fetch user sessions
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/sessions/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();
      setSessions(data.data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Terminate specific session
  const terminateSession = async (sessionId: string) => {
    try {
      setTerminating(sessionId);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to terminate session');
      }

      // Remove session from state
      setSessions(prev => prev.filter(session => session.session_id !== sessionId));
    } catch (error) {
      console.error('Error terminating session:', error);
    } finally {
      setTerminating(null);
    }
  };

  // Terminate all other sessions
  const terminateAllOtherSessions = async () => {
    try {
      setTerminatingAll(true);
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/sessions/others/terminate`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to terminate other sessions');
      }

      // Keep only current session
      setSessions(prev => prev.filter(session => session.is_current));
    } catch (error) {
      console.error('Error terminating all sessions:', error);
    } finally {
      setTerminatingAll(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const currentSession = sessions.find(session => session.is_current);
  const otherSessions = sessions.filter(session => !session.is_current);

  if (loading) {
    return (
      <div className="w-full p-5 rounded-xl shadow-sm bg-white">
        <div className="animate-pulse">
          <div className="flex justify-center flex-col items-center mb-4">
            <div className="w-24 h-24 bg-gray-200 rounded mb-2"></div>
            <div className="w-20 h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="w-full h-4 bg-gray-200 rounded"></div>
            <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
            <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-5 rounded-xl shadow-sm bg-white">
      <div className="flex justify-center flex-col items-center mb-4">
        <span>
          <MonitorSmartphone size={96} strokeWidth={1.75} />
        </span>
        <span className="text-lg font-medium">Active Sessions</span>
        <span className="text-sm text-gray-500">{sessions.length} device{sessions.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="w-full space-y-4">
        {/* Current Session */}
        {currentSession && (
          <div>
            <span className="font-medium text-green-600 flex items-center gap-1 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              This device
            </span>

            <div className="flex gap-2 items-center mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
              {getDeviceIcon(currentSession.device_type)}
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium">
                  {currentSession.browser_name} {currentSession.browser_version}
                </span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={12} />
                  {currentSession.location_city}, {currentSession.location_country}
                  <span className="mx-1">•</span>
                  <Clock size={12} />
                  {formatLastActivity(currentSession.last_activity)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Terminate All Button */}
        {otherSessions.length > 0 && (
          <button
            onClick={terminateAllOtherSessions}
            disabled={terminatingAll}
            className="flex gap-2 items-center justify-center border border-red-300 hover:border-red-400 py-2 mb-3 w-full rounded-lg transition-colors disabled:opacity-50"
          >
            <span className="text-red-600">
              <Hand size={20} />
            </span>
            <span className="font-medium text-red-600">
              {terminatingAll ? 'Terminating...' : 'Terminate All Other Sessions'}
            </span>
          </button>
        )}

        {/* Other Active Sessions */}
        {otherSessions.length > 0 && (
          <div>
            <span className="font-medium mb-2 block">Other Sessions ({otherSessions.length})</span>
            
            <div className="space-y-2">
              {otherSessions.map((session) => (
                <div key={session.session_id} className="flex items-center justify-between w-full py-2 px-2 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(session.device_type)}
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-medium">
                        {session.browser_name} {session.browser_version}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={12} />
                        {session.location_city}, {session.location_country}
                        <span className="mx-1">•</span>
                        <Clock size={12} />
                        {formatLastActivity(session.last_activity)}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => terminateSession(session.session_id)}
                    disabled={terminating === session.session_id}
                    className="p-1 rounded-full hover:bg-red-100 transition-colors disabled:opacity-50"
                    title="Terminate session"
                  >
                    {terminating === session.session_id ? (
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <X size={18} className="text-red-600" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Other Sessions */}
        {otherSessions.length === 0 && currentSession && (
          <div className="text-center py-4 text-gray-500">
            <Globe size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No other active sessions</p>
            <p className="text-xs">This is your only signed-in device</p>
          </div>
        )}

        {/* No Sessions At All */}
        {sessions.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No active sessions found</p>
            <button 
              onClick={fetchSessions}
              className="text-blue-600 text-sm mt-2 hover:underline"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DevicesAccount;