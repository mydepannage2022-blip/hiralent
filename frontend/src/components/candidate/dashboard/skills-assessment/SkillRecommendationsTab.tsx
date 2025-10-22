"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  ExternalLink, 
  Clock, 
  Star, 
  TrendingUp,
  Target,
  CheckCircle,
  ArrowRight,
  Play,
  FileText,
  Award,
  AlertCircle
} from 'lucide-react';
import { useSkillRecommendations } from '@/src/lib/profile/assessment.queries';

interface SkillGap {
  skill: string;
  currentLevel: string;
  targetLevel: string;
  gapAnalysis: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedTimeToImprove: string;
}

interface LearningResource {
  title: string;
  type: 'course' | 'tutorial' | 'practice' | 'certification' | 'documentation';
  url: string;
  provider: string;
  duration: string;
  rating?: number;
  isFree: boolean;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  skillsImproved: string[];
  type: 'course' | 'practice' | 'certification';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  resources?: LearningResource[];
}

interface SkillRecommendationsTabProps {
  assessmentSkill?: string;
  className?: string;
}

const SkillRecommendationsTab: React.FC<SkillRecommendationsTabProps> = ({
  assessmentSkill,
  className = ""
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'courses' | 'practice' | 'certifications'>('all');
  
  const { 
    data: recommendationsResponse, 
    isLoading, 
    error 
  } = useSkillRecommendations();

  // ✅ Extract data from API response
  const recommendations = recommendationsResponse?.success ? recommendationsResponse.data : null;

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'course': return <BookOpen className="h-4 w-4" />;
      case 'tutorial': return <Play className="h-4 w-4" />;
      case 'practice': return <Target className="h-4 w-4" />;
      case 'certification': return <Award className="h-4 w-4" />;
      case 'documentation': return <FileText className="h-4 w-4" />;
      default: return <ExternalLink className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER': return 'text-green-600 bg-green-50 border-green-200';
      case 'INTERMEDIATE': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'ADVANCED': return 'text-red-600 bg-red-50 border-red-200';
      case 'EXPERT': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // ✅ Loading state
  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-2/3 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-300 rounded w-full"></div>
                <div className="h-3 bg-gray-300 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ✅ Error or no data state
  if (error || !recommendations) {
    return (
      <div className={`space-y-6 ${className}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center"
        >
          <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#222] mb-2">
            No Recommendations Available
          </h3>
          <p className="text-[#757575] mb-4">
            {error?.message || 'Unable to load skill recommendations. Please complete an assessment first.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#005DDC] text-white rounded-md hover:bg-[#004EB7] transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  // ✅ Filter learning paths
    const filteredPaths = recommendations.recommendations?.filter((path: any) => {
      if (activeCategory === 'all') return true;
    if (activeCategory === 'courses') return path.type === 'course';
    if (activeCategory === 'practice') return path.resources?.some((r: any) => r.type === 'practice');
    if (activeCategory === 'certifications') return path.resources?.some((r: any) => r.type === 'certification');
    return true;
  }) || [];

  return (
    <div className={`space-y-8 ${className}`}>

      {/* Category Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'all', label: 'All Recommendations' },
            { id: 'courses', label: 'Courses' },
            { id: 'practice', label: 'Practice' },
            { id: 'certifications', label: 'Certifications' }
          ].map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id as any)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                activeCategory === category.id
                  ? 'bg-[#005DDC] text-white border-[#005DDC]'
                  : 'bg-white text-[#757575] border-gray-200 hover:border-[#005DDC] hover:text-[#005DDC]'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Learning Paths */}
      {filteredPaths.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-xl font-semibold text-[#222] mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#005DDC]" />
            Recommended Learning Paths
          </h3>
          <div className="space-y-6">
            {filteredPaths.map((path: any, index: number) => (
              <motion.div
                key={path.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <h4 className="text-lg font-semibold text-[#222]">{path.skill}</h4>
                      <span className={`px-2 py-1 text-xs rounded border ${getPriorityColor('MEDIUM')}`}>
                        Recommended
                      </span>
                    </div>
                    <p className="text-[#757575] mb-4">{path.reason}</p>
                    
                    {/* Path Metadata */}
                    <div className="flex items-center gap-6 mb-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-[#757575]" />
                        <span className="text-[#757575]">{path.estimatedTime}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded border ${getDifficultyColor(path.difficulty)}`}>
                        {path.difficulty}
                      </span>
                    </div>

                    {/* Market Value */}
                    {path.marketValue && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-sm font-medium text-green-800">
                          Market Value: {path.marketValue}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resources */}
                {path.resources && Array.isArray(path.resources) && path.resources.length > 0 && (
                  <div>
                    <h5 className="font-medium text-[#222] mb-3">Learning Resources:</h5>
                    <div className="space-y-3">
                      {path.resources.map((resource: string, resourceIndex: number) => (
                        <div
                          key={resourceIndex}
                          className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="p-2 bg-white rounded-md">
                            <BookOpen className="h-4 w-4 text-[#005DDC]" />
                          </div>
                          <span className="text-[#222]">{resource}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Empty State */}
      {filteredPaths.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center"
        >
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#222] mb-2">
            No Recommendations Yet
          </h3>
          <p className="text-[#757575]">
            Complete assessments to receive personalized learning recommendations.
          </p>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200"
      >
        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-[#005DDC] text-white rounded-lg hover:bg-[#004EB7] transition-colors">
          <Target className="h-4 w-4" />
          Start Learning Path
        </button>
        <button className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-[#757575] rounded-lg hover:bg-gray-50 transition-colors">
          <BookOpen className="h-4 w-4" />
          Save Recommendations
        </button>
      </motion.div>
    </div>
  );
};

export default SkillRecommendationsTab;