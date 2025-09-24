"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  CheckCircle, 
  AlertCircle,
  Star,
  BookOpen,
  Award,
  BarChart3
} from 'lucide-react';

interface SkillStrength {
  name: string;
  score: number;
  category: string;
  description: string;
  confidence: number;
}

interface SkillWeakness {
  name: string;
  score: number;
  category: string;
  description: string;
  improvement: string;
  priority: 'high' | 'medium' | 'low';
}

interface SkillLevel {
  skill: string;
  currentLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  targetLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  progress: number; // 0-100
  marketValue: string;
}

interface SkillBreakdownProps {
  skillName: string;
  overallScore: number;
  skillLevel: string;
  strengths: SkillStrength[];
  weaknesses: SkillWeakness[];
  skillLevels?: SkillLevel[];
  recommendations?: string[];
  marketInsights?: {
    salaryRange: string;
    demandLevel: 'high' | 'medium' | 'low';
    trendDirection: 'up' | 'down' | 'stable';
    jobOpenings: number;
  };
  className?: string;
}

const SkillBreakdown: React.FC<SkillBreakdownProps> = ({
  skillName,
  overallScore,
  skillLevel,
  strengths,
  weaknesses,
  skillLevels,
  recommendations = [],
  marketInsights,
  className = ''
}) => {
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getSkillLevelColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'EXPERT':
        return 'bg-purple-100 text-purple-800';
      case 'ADVANCED':
        return 'bg-blue-100 text-blue-800';
      case 'INTERMEDIATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'BEGINNER':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'low':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Overall Score Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#222] mb-2">{skillName} Assessment Results</h2>
            <span className={`px-3 py-1 rounded-md text-sm font-medium ${getSkillLevelColor(skillLevel)}`}>
              {skillLevel} Level
            </span>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold mb-1 ${getScoreColor(overallScore).split(' ')[0]}`}>
              {overallScore}%
            </div>
            <div className="text-sm text-[#757575]">Overall Score</div>
          </div>
        </div>
        
        {/* Score breakdown visual */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <motion.div
            className={`h-3 rounded-full ${getScoreColor(overallScore).split(' ')[1]}`}
            initial={{ width: 0 }}
            animate={{ width: `${overallScore}%` }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      {/* Strengths Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-gray-200 rounded-lg p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg">
            <Star className="h-5 w-5 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-[#222]">Your Strengths</h3>
          <span className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-md">
            {strengths.length} areas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strengths.map((strength, index) => (
            <motion.div
              key={strength.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-green-50 border border-green-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-green-800">{strength.name}</h4>
                <span className="text-lg font-bold text-green-600">{strength.score}%</span>
              </div>
              <p className="text-sm text-green-700 mb-2">{strength.description}</p>
              <div className="flex items-center justify-between text-xs text-green-600">
                <span className="px-2 py-1 bg-green-100 rounded">{strength.category}</span>
                <span>Confidence: {strength.confidence}%</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Weaknesses Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white border border-gray-200 rounded-lg p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Target className="h-5 w-5 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-[#222]">Areas for Improvement</h3>
          <span className="px-2 py-1 bg-orange-50 text-orange-600 text-xs rounded-md">
            {weaknesses.length} areas
          </span>
        </div>

        <div className="space-y-4">
          {weaknesses.map((weakness, index) => (
            <motion.div
              key={weakness.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`border rounded-lg p-4 ${getPriorityColor(weakness.priority)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{weakness.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded-md ${
                      weakness.priority === 'high' ? 'bg-red-200 text-red-800' :
                      weakness.priority === 'medium' ? 'bg-orange-200 text-orange-800' :
                      'bg-yellow-200 text-yellow-800'
                    }`}>
                      {weakness.priority} priority
                    </span>
                  </div>
                  <p className="text-sm mb-2">{weakness.description}</p>
                </div>
                <span className="text-lg font-bold ml-4">{weakness.score}%</span>
              </div>
              
              <div className="bg-white/50 rounded-md p-3 mt-3">
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 mt-0.5 text-blue-600" />
                  <div>
                    <span className="text-sm font-medium text-blue-800">Improvement Suggestion:</span>
                    <p className="text-sm text-blue-700 mt-1">{weakness.improvement}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Skill Levels Progress */}
      {skillLevels && skillLevels.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-gray-200 rounded-lg p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#222]">Skill Level Progression</h3>
          </div>

          <div className="space-y-4">
            {skillLevels.map((skill, index) => (
              <div key={skill.skill} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-[#222]">{skill.skill}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-md ${getSkillLevelColor(skill.currentLevel)}`}>
                      {skill.currentLevel}
                    </span>
                    <span className="text-xs text-[#757575]">→</span>
                    <span className={`px-2 py-1 text-xs rounded-md ${getSkillLevelColor(skill.targetLevel)}`}>
                      {skill.targetLevel}
                    </span>
                  </div>
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between text-sm text-[#757575] mb-1">
                    <span>Progress to {skill.targetLevel}</span>
                    <span>{skill.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="bg-[#005DDC] h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.progress}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                    />
                  </div>
                </div>
                
                <div className="text-xs text-[#757575]">
                  Market Value: {skill.marketValue}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Market Insights */}
      {marketInsights && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white border border-gray-200 rounded-lg p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Award className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-[#222]">Market Insights</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">{marketInsights.salaryRange}</div>
              <div className="text-sm text-blue-700">Salary Range</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className={`text-2xl font-bold ${
                  marketInsights.demandLevel === 'high' ? 'text-green-600' :
                  marketInsights.demandLevel === 'medium' ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {marketInsights.demandLevel.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-green-700">Demand Level</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                {getTrendIcon(marketInsights.trendDirection)}
                <span className="text-lg font-bold text-purple-600">
                  {marketInsights.trendDirection.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-purple-700">Trend Direction</div>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {marketInsights.jobOpenings.toLocaleString()}
              </div>
              <div className="text-sm text-orange-700">Job Openings</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white border border-gray-200 rounded-lg p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#005DDC]/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-[#005DDC]" />
            </div>
            <h3 className="text-lg font-semibold text-[#222]">Recommendations</h3>
          </div>

          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="p-1 bg-[#005DDC] rounded-full mt-1">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <p className="text-sm text-[#005DDC] font-medium">{recommendation}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SkillBreakdown;