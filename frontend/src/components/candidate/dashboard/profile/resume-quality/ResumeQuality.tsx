// src/components/profile/resume-quality/ResumeQuality.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { ResumeQualityData } from '@/src/types/profile';

interface ResumeQualityProps {
  data: ResumeQualityData;
  className?: string;
}

export const ResumeQuality: React.FC<ResumeQualityProps> = ({
  data,
  className = ''
}) => {
  const { completionPercentage, suggestions } = data;
  
  return (
    <Card className={`w-full max-w-sm ${className}`}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Your Resume Quality
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Circular Progress */}
        <div className="flex justify-center">
          <CircularProgress 
            percentage={completionPercentage}
            size={120}
            strokeWidth={8}
          />
        </div>
        
        {/* Status Message */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Your resume is only{' '}
            <span className="font-semibold text-gray-900">
              {completionPercentage}% complete!
            </span>{' '}
            Let's improve it
          </p>
        </div>
        
        {/* Suggestions */}
        <div className="space-y-2">
          {suggestions.map((suggestion) => (
            <div 
              key={suggestion.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Badge 
                variant="outline" 
                className="shrink-0 bg-blue-50 text-blue-600 border-blue-200 font-medium"
              >
                +{suggestion.percentage}%
              </Badge>
              <span className={`text-sm flex-1 ${
                suggestion.completed 
                  ? 'text-gray-400 line-through' 
                  : 'text-gray-700'
              }`}>
                {suggestion.text}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};