// frontend/src/components/candidate/dashboard/skills-assessment/SkillRecommendationsTab.tsx

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
import { SkillRecommendations } from '@/src/types/assessment.types';

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

interface FallbackRecommendations {
  learningPaths: LearningPath[];
  skillGaps: SkillGap[];
  nextSteps: string[];
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

  // Transform API response with fallback
  const recommendationsData = recommendationsResponse as SkillRecommendations | undefined;
  const recommendations = recommendationsData?.success ? recommendationsData.data : null;

  // Mock fallback data if API fails
  const fallbackRecommendations: FallbackRecommendations = {
    learningPaths: [
      {
        id: 'js-fundamentals',
        title: 'JavaScript Fundamentals',
        description: 'Master core JavaScript concepts and modern ES6+ features',
        estimatedHours: 40,
        difficulty: 'BEGINNER',
        skillsImproved: ['JavaScript', 'Programming Logic', 'ES6+'],
        type: 'course',
        priority: 'HIGH',
        resources: [
          {
            title: 'JavaScript Basics Course',
            type: 'course',
            url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript',
            provider: 'MDN Web Docs',
            duration: '20 hours',
            rating: 4.8,
            isFree: true
          },
          {
            title: 'JavaScript Practice Problems',
            type: 'practice',
            url: 'https://leetcode.com/tag/javascript/',
            provider: 'LeetCode',
            duration: 'Self-paced',
            rating: 4.5,
            isFree: false
          }
        ]
      },
      {
        id: 'react-advanced',
        title: 'Advanced React Concepts',
        description: 'Deep dive into React hooks, context, and performance optimization',
        estimatedHours: 60,
        difficulty: 'ADVANCED',
        skillsImproved: ['React', 'State Management', 'Performance'],
        type: 'course',
        priority: 'MEDIUM',
        resources: [
          {
            title: 'React Advanced Patterns',
            type: 'course',
            url: 'https://reactjs.org/docs/advanced-guides.html',
            provider: 'React.js',
            duration: '30 hours',
            rating: 4.9,
            isFree: true
          }
        ]
      }
    ],
    skillGaps: [
      {
        skill: assessmentSkill || 'JavaScript',
        currentLevel: 'INTERMEDIATE',
        targetLevel: 'ADVANCED',
        gapAnalysis: 'Focus on advanced concepts like closures, prototypes, and async patterns',
        priority: 'HIGH',
        estimatedTimeToImprove: '6-8 weeks'
      }
    ],
    nextSteps: [
      'Complete advanced JavaScript concepts course',
      'Practice with real-world projects',
      'Consider React or Node.js specialization',
      'Build a portfolio project using modern frameworks'
    ]
  };

  const displayData = recommendations ? 
    (recommendations as any as FallbackRecommendations) : 
    fallbackRecommendations;

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

  // Filter learning paths based on active category
  const filteredPaths = displayData.learningPaths?.filter((path: LearningPath) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'courses') return path.type === 'course';
    if (activeCategory === 'practice') return path.resources?.some((r: LearningResource) => r.type === 'practice');
    if (activeCategory === 'certifications') return path.resources?.some((r: LearningResource) => r.type === 'certification');
    return true;
  }) || [];

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

      {/* Skill Gaps Analysis */}
      {displayData.skillGaps && displayData.skillGaps.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-xl font-semibold text-[#222] mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#005DDC]" />
            Skill Gap Analysis
          </h3>
          <div className="space-y-4">
            {displayData.skillGaps.map((gap: SkillGap, index: number) => (
              <div key={index} className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-[#222] mb-2">{gap.skill}</h4>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#757575]">Current:</span>
                        <span className={`px-2 py-1 text-xs rounded border ${getDifficultyColor(gap.currentLevel)}`}>
                          {gap.currentLevel}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#757575]" />
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#757575]">Target:</span>
                        <span className={`px-2 py-1 text-xs rounded border ${getDifficultyColor(gap.targetLevel)}`}>
                          {gap.targetLevel}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-[#757575] mb-3">{gap.gapAnalysis}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-[#757575]" />
                        <span className="text-[#757575]">{gap.estimatedTimeToImprove}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded border ${getPriorityColor(gap.priority)}`}>
                        {gap.priority} Priority
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Learning Paths */}
      {filteredPaths.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-xl font-semibold text-[#222] mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#005DDC]" />
            Recommended Learning Paths
          </h3>
          <div className="space-y-6">
            {filteredPaths.map((path: LearningPath, index: number) => (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <h4 className="text-lg font-semibold text-[#222]">{path.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded border ${getPriorityColor(path.priority)}`}>
                        {path.priority}
                      </span>
                    </div>
                    <p className="text-[#757575] mb-4">{path.description}</p>
                    
                    {/* Path Metadata */}
                    <div className="flex items-center gap-6 mb-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-[#757575]" />
                        <span className="text-[#757575]">{path.estimatedHours} hours</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded border ${getDifficultyColor(path.difficulty)}`}>
                        {path.difficulty}
                      </span>
                    </div>

                    {/* Skills Improved */}
                    <div className="mb-4">
                      <span className="text-sm font-medium text-[#222] mb-2 block">Skills you'll improve:</span>
                      <div className="flex flex-wrap gap-2">
                        {path.skillsImproved.map((skill: string, skillIndex: number) => (
                          <span
                            key={skillIndex}
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resources */}
                {path.resources && path.resources.length > 0 && (
                  <div>
                    <h5 className="font-medium text-[#222] mb-3">Learning Resources:</h5>
                    <div className="space-y-3">
                      {path.resources.map((resource: LearningResource, resourceIndex: number) => (
                        <div
                          key={resourceIndex}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 bg-white rounded-md">
                              {getResourceIcon(resource.type)}
                            </div>
                            <div className="flex-1">
                              <h6 className="font-medium text-[#222] mb-1">{resource.title}</h6>
                              <div className="flex items-center gap-4 text-sm text-[#757575] mb-2">
                                <span>{resource.provider}</span>
                                <span>{resource.duration}</span>
                                {resource.rating && (
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span>{resource.rating}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  resource.isFree 
                                    ? 'bg-green-50 text-green-700 border border-green-200' 
                                    : 'bg-orange-50 text-orange-700 border border-orange-200'
                                }`}>
                                  {resource.isFree ? 'Free' : 'Paid'}
                                </span>
                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-200 capitalize">
                                  {resource.type}
                                </span>
                              </div>
                            </div>
                          </div>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-[#005DDC] border border-[#005DDC] rounded-md hover:bg-blue-50 transition-colors"
                          >
                            Start Learning
                            <ExternalLink className="h-4 w-4" />
                          </a>
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

      {/* Next Steps */}
      {displayData.nextSteps && displayData.nextSteps.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-xl font-semibold text-[#222] mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-[#005DDC]" />
            Recommended Next Steps
          </h3>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="space-y-4">
              {displayData.nextSteps.map((step: string, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-center justify-center w-6 h-6 bg-[#005DDC] text-white rounded-full text-sm font-medium flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-[#222] font-medium">{step}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
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

      {/* API Error Fallback */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center"
        >
          <AlertCircle className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
          <div className="text-yellow-800 mb-2">Using demo recommendations</div>
          <div className="text-sm text-yellow-700">
            Unable to load personalized recommendations. Showing sample data for demonstration.
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SkillRecommendationsTab;