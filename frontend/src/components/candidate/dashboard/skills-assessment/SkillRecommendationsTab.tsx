// frontend/src/components/candidate/dashboard/skills-assessment/SkillRecommendationsTab.tsx

"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  ExternalLink, 
  BookOpen, 
  Video, 
  FileText, 
  Code,
  Award,
  ChevronRight,
  Filter,
  Search,
  Star
} from 'lucide-react';
import { useSkillRecommendations } from '@/src/lib/profile/assessment.queries'; 
import { SkillRecommendation, RecommendationResource } from '@/src/types/assessment.types';

interface SkillRecommendationsTabProps {
  className?: string;
}

const SkillRecommendationsTab: React.FC<SkillRecommendationsTabProps> = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const { 
    data: recommendationsData, 
    isLoading, 
    error 
  } = useSkillRecommendations();

  const recommendations = recommendationsData?.data?.recommendations || [];
  const totalSkills = recommendationsData?.data?.totalSkills || 0;
  const nextAssessments = recommendationsData?.data?.nextAssessments || [];

  // Get unique categories for filter
  const availableCategories = Array.from(new Set(recommendations.map(r => r.category)));

  // Filter recommendations
  const filteredRecommendations = recommendations.filter(rec => {
    const matchesSearch = rec.skillName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rec.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || rec.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || rec.category === categoryFilter;
    
    return matchesSearch && matchesPriority && matchesCategory;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'medium':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'low':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔥';
      case 'medium':
        return '⚡';
      case 'low':
        return '✨';
      default:
        return '📌';
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <Video className="h-4 w-4" />;
      case 'tutorial':
        return <BookOpen className="h-4 w-4" />;
      case 'documentation':
        return <FileText className="h-4 w-4" />;
      case 'practice':
        return <Code className="h-4 w-4" />;
      case 'book':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  const getDemandColor = (demand: string) => {
    switch (demand) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-6 border border-gray-200 mb-4">
              <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-2/3 mb-4"></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-3 bg-gray-300 rounded"></div>
                <div className="h-3 bg-gray-300 rounded"></div>
                <div className="h-3 bg-gray-300 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 text-center ${className}`}>
        <div className="text-red-500 text-4xl mb-2">⚠️</div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Recommendations</h3>
        <p className="text-red-600">We couldn't load your skill recommendations. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-800">Skills to Improve</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{recommendations.length}</p>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">High Priority</span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {recommendations.filter(r => r.priority === 'high').length}
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Award className="h-5 w-5 text-purple-600" />
            <span className="font-medium text-purple-800">Next Assessments</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">{nextAssessments.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {availableCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredRecommendations.length > 0 ? (
          filteredRecommendations.map((recommendation, index) => (
            <motion.div
              key={`${recommendation.skillName}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {recommendation.skillName}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(recommendation.priority)}`}>
                        {getPriorityIcon(recommendation.priority)} {recommendation.priority}
                      </span>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md">
                        {recommendation.category}
                      </span>
                    </div>

                    <p className="text-gray-600 mb-4">{recommendation.reasoning}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span className="text-gray-600">
                          {recommendation.currentLevel} → {recommendation.recommendedLevel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-500" />
                        <span className="text-gray-600">{recommendation.estimatedTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className={`font-medium ${getDemandColor(recommendation.jobMarketDemand)}`}>
                          {recommendation.jobMarketDemand} demand
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedCard(
                      expandedCard === recommendation.skillName ? null : recommendation.skillName
                    )}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ChevronRight 
                      className={`h-5 w-5 transition-transform ${
                        expandedCard === recommendation.skillName ? 'rotate-90' : ''
                      }`} 
                    />
                  </button>
                </div>

                {/* Expanded Resources */}
                {expandedCard === recommendation.skillName && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-200 pt-4"
                  >
                    <h4 className="font-medium text-gray-900 mb-3">Recommended Resources</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {recommendation.resources.map((resource, resourceIndex) => (
                        <div
                          key={resourceIndex}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="text-blue-500">
                            {getResourceIcon(resource.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 text-sm">
                                {resource.title}
                              </span>
                              {resource.url && (
                                <a
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <span className="capitalize">{resource.type}</span>
                              {resource.duration && (
                                <>
                                  <span>•</span>
                                  <span>{resource.duration}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="capitalize">{resource.difficulty}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
            <div className="text-gray-400 text-6xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recommendations Found</h3>
            <p className="text-gray-600">
              {searchQuery || priorityFilter !== 'all' || categoryFilter !== 'all' 
                ? 'No recommendations match your current filters. Try adjusting your search criteria.' 
                : 'Complete more assessments to get personalized skill recommendations!'
              }
            </p>
          </div>
        )}
      </div>

      {/* Next Assessment Suggestions */}
      {nextAssessments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Recommended Next Assessments</h3>
          <div className="flex flex-wrap gap-2">
            {nextAssessments.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full border border-blue-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillRecommendationsTab;