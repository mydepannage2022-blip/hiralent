// frontend/src/components/candidate/dashboard/skills-assessment/SecurityMonitorWrapper.tsx

"use client";

import React from 'react';
import SecurityMonitor from './SecurityMonitor'; // Your existing component
import { SecurityViolation as AssessmentSecurityViolation } from '@/src/types/assessment.types';

// Existing SecurityMonitor expects different interface
interface ExistingSecurityViolation {
  id: string;
  type: 'TAB_SWITCH' | 'WINDOW_BLUR' | 'COPY_PASTE' | 'RIGHT_CLICK' | 'DEV_TOOLS' | 'INACTIVE_TIME';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
}

interface SecurityMonitorWrapperProps {
  isMonitoring: boolean;
  onViolation: (violation: AssessmentSecurityViolation) => void;
  maxViolations: number;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const SecurityMonitorWrapper: React.FC<SecurityMonitorWrapperProps> = ({
  isMonitoring,
  onViolation,
  maxViolations,
  position
}) => {
  
  // Convert existing SecurityMonitor violation to our Assessment format
  const handleExistingViolation = (existingViolation: ExistingSecurityViolation) => {
    const assessmentViolation: AssessmentSecurityViolation = {
      id: existingViolation.id,
      type: existingViolation.type,
      message: existingViolation.message,
      details: existingViolation.message, // ✅ Map message to details
      severity: existingViolation.severity,
      timestamp: existingViolation.timestamp
    };
    
    onViolation(assessmentViolation);
  };

  return (
    <SecurityMonitor
      isActive={isMonitoring}
      maxViolations={maxViolations}
      onViolation={handleExistingViolation}
      position={position}
      showWarnings={true}
      inactivityThreshold={120}
    />
  );
};

export default SecurityMonitorWrapper;