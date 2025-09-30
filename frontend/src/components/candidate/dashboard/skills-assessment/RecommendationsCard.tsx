"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  PlayCircle, 
  ExternalLink, 
  Clock, 
  Star,
  TrendingUp,
  Users,
  Award,
  ChevronRight,
  CheckCircle,
  Target,
  Lightbulb,
  FileText
} from 'lucide-react';

interface LearningResource {
  id: string;
  title: string;
  type: 'course' | 'article' | 'video' | 'practice' | 'certification';
  provider: string;
  duration: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  rating: number;
  url: string;
  price: 'free' | 'paid' | string;
  description: string;
  tags: string[];
}

interface CareerPath {
  id: string;
  title: string;
  description: string;
  steps: string[];
  timeEstimate: string;
  salaryRange: string;
  demandLevel: 'high' | 'medium' | 'low';
}

interface SkillRecommendation {
  skill: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  marketValue: string;
  timeToLearn: string;
}

interface RecommendationsCardProps {
  skillName: string;
  currentLevel: string;
  overallScore: number;
  learningResources: LearningResource[];
  skillRecommendations: SkillRecommendation[];
  careerPaths: CareerPath[];
  nextSteps: string[];
  className?: string;
}

const RecommendationsCard: React.FC<RecommendationsCardProps> = ({
  skillName,
  currentLevel,
  overallScore,
  learningResources,
  skillRecommendations,
  careerPaths,
  nextSteps,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'resources' | 'skills' | 'careers' | 'steps'>('resources');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="h-4 w-4" />;
      case 'video':
        return <PlayCircle className="h-4 w-4" />;
      case 'article':
        return <FileText className="h-4 w-4" />;
      case 'practice':
        return <Target className="h-4 w-4" />;
      case 'certification':
        return <Award className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'BEGINNER':
        return 'bg-green-100 text-green-700';
      case 'INTERMEDIATE':
        return 'bg-yellow-100 text-yellow-700';
      case 'ADVANCED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-orange-500 bg-orange-50';
      case 'low':
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getDemandColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-orange-600 bg-orange-100';
      case 'low':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const toggleStepCompletion = (step: string) => {
    setCompletedSteps(prev => 
      prev.includes(step) 
        ? prev.filter(s => s !== step)
        : [...prev, step]
    );
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-[#222] mb-1">Personalized Recommendations</h2>
            <p className="text-[#757575]">Based on your {skillName} assessment results</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-[#005DDC]">{currentLevel}</div>
            <div className="text-sm text-[#757575]">Current Level</div>
          </div>
        </div>
        
        {/* Score indicator */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="w-full bg-white/50 rounded-full h-2">
              <motion.div
                className="bg-[#005DDC] h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${overallScore}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
          <span className="text-sm font-medium text-[#005DDC]">{overallScore}%</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'resources', label: 'Learning Resources', icon: <BookOpen className="h-4 w-4" /> },
          { key: 'skills', label: 'Skill Recommendations', icon: <TrendingUp className="h-4 w-4" /> },
          { key: 'careers', label: 'Career Paths', icon: <Award className="h-4 w-4" /> },
          { key: 'steps', label: 'Next Steps', icon: <Target className="h-4 w-4" /> }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#005DDC] text-[#005DDC] bg-blue-50'
                : 'border-transparent text-[#757575] hover:text-[#222] hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {/* Learning Resources Tab */}
          {activeTab === 'resources' && (
            <motion.div
              key="resources"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#222]">Recommended Learning Resources</h3>
                <span className="text-sm text-[#757575]">{learningResources.length} resources</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {learningResources.map((resource, index) => (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-blue-100 rounded text-[#005DDC]">
                          {getTypeIcon(resource.type)}
                        </div>
                        <div>
                          <h4 className="font-medium text-[#222] text-sm">{resource.title}</h4>
                          <p className="text-xs text-[#757575]">{resource.provider}</p>
                        </div>
                      </div>
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <ExternalLink className="h-4 w-4 text-[#757575]" />
                      </a>
                    </div>
                    
                    <p className="text-xs text-[#757575] mb-3 line-clamp-2">{resource.description}</p>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        {renderStars(resource.rating)}
                      </div>
                      <span className="text-xs text-[#757575]">({resource.rating})</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-[#757575]" />
                        <span className="text-[#757575]">{resource.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(resource.difficulty)}`}>
                          {resource.difficulty}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          resource.price === 'free' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {resource.price === 'free' ? 'Free' : 'Paid'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Skill Recommendations Tab */}
          {activeTab === 'skills' && (
            <motion.div
              key="skills"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#222]">Skills to Learn Next</h3>
                <span className="text-sm text-[#757575]">{skillRecommendations.length} skills</span>
              </div>
              
              <div className="space-y-3">
                {skillRecommendations.map((skill, index) => (
                  <motion.div
                    key={skill.skill}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`border-l-4 rounded-lg p-4 ${getPriorityColor(skill.priority)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-[#222] mb-1">{skill.skill}</h4>
                        <p className="text-sm text-[#757575] mb-2">{skill.reason}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-md ${
                        skill.priority === 'high' ? 'bg-red-100 text-red-700' :
                        skill.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {skill.priority} priority
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-[#757575]" />
                          <span className="text-[#757575]">{skill.timeToLearn}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          <span className="text-green-600">{skill.marketValue}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Career Paths Tab */}
          {activeTab === 'careers' && (
            <motion.div
              key="careers"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#222]">Potential Career Paths</h3>
                <span className="text-sm text-[#757575]">{careerPaths.length} paths</span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {careerPaths.map((path, index) => (
                  <motion.div
                    key={path.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-[#222] mb-2">{path.title}</h4>
                        <p className="text-sm text-[#757575] mb-3">{path.description}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-md ${getDemandColor(path.demandLevel)}`}>
                        {path.demandLevel} demand
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-[#222] mb-2">Key Steps:</h5>
                      <ul className="space-y-1">
                        {path.steps.slice(0, 3).map((step, stepIndex) => (
                          <li key={stepIndex} className="flex items-center gap-2 text-sm text-[#757575]">
                            <div className="w-1.5 h-1.5 bg-[#005DDC] rounded-full"></div>
                            {step}
                          </li>
                        ))}
                        {path.steps.length > 3 && (
                          <li className="text-sm text-[#757575] ml-3.5">
                            +{path.steps.length - 3} more steps
                          </li>
                        )}
                      </ul>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-[#757575]" />
                        <span className="text-[#757575]">{path.timeEstimate}</span>
                      </div>
                      <div className="text-[#005DDC] font-medium">{path.salaryRange}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Next Steps Tab */}
          {activeTab === 'steps' && (
            <motion.div
              key="steps"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#222]">Immediate Next Steps</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600">{completedSteps.length} completed</span>
                  <span className="text-sm text-[#757575]">of {nextSteps.length}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {nextSteps.map((step, index) => {
                  const isCompleted = completedSteps.includes(step);
                  return (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                        isCompleted 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                      }`}
                      onClick={() => toggleStepCompletion(step)}
                    >
                      <button className="mt-1">
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-gray-300 rounded-full hover:border-[#005DDC] transition-colors" />
                        )}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${isCompleted ? 'text-green-700 line-through' : 'text-[#222]'}`}>
                          {step}
                        </p>
                      </div>
                      <div className="text-[#757575]">
                        <span className="text-xs bg-white px-2 py-1 rounded border">
                          Step {index + 1}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              {/* Progress Summary */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-5 w-5 text-[#005DDC]" />
                  <span className="font-medium text-[#005DDC]">Progress Summary</span>
                </div>
                <p className="text-sm text-blue-700">
                  Complete these {nextSteps.length} steps to advance your {skillName} skills and reach the next level.
                  You've completed {completedSteps.length} steps so far - keep going!
                </p>
                <div className="mt-3 w-full bg-blue-100 rounded-full h-2">
                  <motion.div
                    className="bg-[#005DDC] h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedSteps.length / nextSteps.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RecommendationsCard;