"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Ban, 
  Clock,
  X,
  CheckCircle
} from 'lucide-react';

interface SecurityViolation {
  id: string;
  type: 'TAB_SWITCH' | 'WINDOW_BLUR' | 'COPY_PASTE' | 'RIGHT_CLICK' | 'DEV_TOOLS' | 'INACTIVE_TIME';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
}

interface SecurityMonitorProps {
  isActive?: boolean;
  maxViolations?: number;
  onViolation?: (violation: SecurityViolation) => void;
  onTerminate?: () => void;
  inactivityThreshold?: number; // seconds
  showWarnings?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

const SecurityMonitor: React.FC<SecurityMonitorProps> = ({
  isActive = true,
  maxViolations = 3,
  onViolation,
  onTerminate,
  inactivityThreshold = 120, // 2 minutes
  showWarnings = true,
  position = 'top-right',
  className = ''
}) => {
  const [violations, setViolations] = useState<SecurityViolation[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(isActive);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showViolationAlert, setShowViolationAlert] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<SecurityViolation | null>(null);

  const violationCount = violations.length;
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const violationId = useRef(0);

  // Position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  const createViolation = (type: SecurityViolation['type'], message: string, severity: SecurityViolation['severity'] = 'medium'): SecurityViolation => {
    return {
      id: `violation-${++violationId.current}`,
      type,
      message,
      timestamp: new Date(),
      severity
    };
  };

  const logViolation = (violation: SecurityViolation) => {
    setViolations(prev => [...prev, violation]);
    onViolation?.(violation);

    if (showWarnings) {
      setCurrentAlert(violation);
      setShowViolationAlert(true);
      setTimeout(() => setShowViolationAlert(false), 3000);
    }

    // Check if max violations reached
    if (violations.length + 1 >= maxViolations) {
      onTerminate?.();
    }
  };

  // Tab switching detection
  useEffect(() => {
    if (!isMonitoring) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const violation = createViolation('TAB_SWITCH', 'Tab switching detected', 'high');
        logViolation(violation);
      }
    };

    const handleWindowBlur = () => {
      const violation = createViolation('WINDOW_BLUR', 'Window lost focus', 'medium');
      logViolation(violation);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isMonitoring, violations.length]);

  // Copy/Paste and keyboard shortcuts prevention
  useEffect(() => {
    if (!isMonitoring) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common shortcuts
      const blockedKeys = [
        { ctrl: true, key: 'c' }, // Copy
        { ctrl: true, key: 'v' }, // Paste
        { ctrl: true, key: 'x' }, // Cut
        { ctrl: true, key: 'a' }, // Select all
        { ctrl: true, key: 's' }, // Save
        { key: 'F12' }, // Dev tools
        { ctrl: true, shift: true, key: 'I' }, // Dev tools
        { ctrl: true, shift: true, key: 'J' }, // Console
      ];

      const isBlocked = blockedKeys.some(blocked => {
        const ctrlMatch = blocked.ctrl ? e.ctrlKey : !e.ctrlKey;
        const shiftMatch = blocked.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = blocked.key.toLowerCase() === e.key.toLowerCase();
        return ctrlMatch && shiftMatch && keyMatch;
      });

      if (isBlocked) {
        e.preventDefault();
        const violation = createViolation('COPY_PASTE', `Blocked shortcut: ${e.key}`, 'medium');
        logViolation(violation);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const violation = createViolation('RIGHT_CLICK', 'Right-click detected', 'low');
      logViolation(violation);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isMonitoring, violations.length]);

  // Activity tracking
  useEffect(() => {
    if (!isMonitoring) return;

    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [isMonitoring]);

  // Inactivity monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    inactivityTimer.current = setInterval(() => {
      const inactiveTime = (Date.now() - lastActivity) / 1000;
      
      if (inactiveTime > inactivityThreshold) {
        const violation = createViolation('INACTIVE_TIME', `Inactive for ${Math.round(inactiveTime)}s`, 'medium');
        logViolation(violation);
        setLastActivity(Date.now()); // Reset to avoid repeated violations
      }
    }, 10000); // Check every 10 seconds

    return () => {
      if (inactivityTimer.current) {
        clearInterval(inactivityTimer.current);
      }
    };
  }, [isMonitoring, lastActivity, inactivityThreshold]);

  const getSeverityColor = (severity: SecurityViolation['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'medium':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'low':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getViolationIcon = (type: SecurityViolation['type']) => {
    switch (type) {
      case 'TAB_SWITCH':
      case 'WINDOW_BLUR':
        return <Eye className="h-4 w-4" />;
      case 'COPY_PASTE':
        return <Ban className="h-4 w-4" />;
      case 'RIGHT_CLICK':
        return <Ban className="h-4 w-4" />;
      case 'DEV_TOOLS':
        return <AlertTriangle className="h-4 w-4" />;
      case 'INACTIVE_TIME':
        return <Clock className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  if (!isMonitoring) return null;

  return (
    <>
      {/* Security Status Indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`fixed ${getPositionClasses()} z-50 ${className}`}
      >
        <div className={`bg-white border rounded-lg p-3 shadow-lg ${
          violationCount >= maxViolations ? 'border-red-500' :
          violationCount > 0 ? 'border-orange-500' : 'border-green-500'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-full ${
              violationCount >= maxViolations ? 'bg-red-100' :
              violationCount > 0 ? 'bg-orange-100' : 'bg-green-100'
            }`}>
              {violationCount >= maxViolations ? (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              ) : violationCount > 0 ? (
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              ) : (
                <Shield className="h-4 w-4 text-green-600" />
              )}
            </div>
            
            <div className="text-xs">
              <div className={`font-medium ${
                violationCount >= maxViolations ? 'text-red-600' :
                violationCount > 0 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {violationCount >= maxViolations ? 'Critical' :
                 violationCount > 0 ? 'Warning' : 'Secure'}
              </div>
              <div className="text-gray-500">
                {violationCount}/{maxViolations} violations
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Violation Alerts */}
      <AnimatePresence>
        {showViolationAlert && currentAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className={`border rounded-lg p-4 shadow-lg max-w-md ${getSeverityColor(currentAlert.severity)}`}>
              <div className="flex items-start gap-3">
                {getViolationIcon(currentAlert.type)}
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Security Alert</h4>
                  <p className="text-sm">{currentAlert.message}</p>
                  <p className="text-xs mt-2 opacity-75">
                    Violation {violationCount} of {maxViolations}
                  </p>
                </div>
                <button
                  onClick={() => setShowViolationAlert(false)}
                  className="p-1 hover:bg-black/10 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Termination Warning */}
      {violationCount >= maxViolations - 1 && violationCount < maxViolations && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="text-center">
              <div className="p-3 bg-red-100 rounded-full inline-block mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">Final Warning</h3>
              <p className="text-gray-600 mb-4">
                You have {maxViolations - violationCount} violation{maxViolations - violationCount !== 1 ? 's' : ''} remaining.
                One more violation will terminate your assessment.
              </p>
              <button
                onClick={() => setShowViolationAlert(false)}
                className="bg-[#005DDC] text-white px-4 py-2 rounded-md hover:bg-[#004EB7] transition-colors"
              >
                I Understand
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default SecurityMonitor;