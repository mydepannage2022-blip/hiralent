"use client"
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileText,
  Code,
  Target,
  Zap,
  TrendingUp,
  Award,
  Sparkles,
  Eye,
  Calendar,
  User,
  Shield,
  Activity
} from 'lucide-react';

interface Question {
  id: string;
  title: string;
  description: string;
  problemStatement: string;
  difficulty: string;
  skillTags: string[];
  type: string;
  canonicalSolution: string;
  testCases: Array<{ input: string; output: string }>;
  status: string;
  aiGenerated: boolean;
  createdBy?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

const ReviewQueuePage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  // Load pending questions
  const loadPendingQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/questions?status=draft');
      const data = await response.json();
      if (data.success && data.questions) {
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error('Failed to load pending questions:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPendingQuestions();
  }, []);

  const handleApprove = async (questionId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/questions/${questionId}/approve`, {
        method: 'PATCH'
      });
      const data = await response.json();
      if (data.success) {
        setQuestions(questions.filter(q => q.id !== questionId));
        setSelectedQuestion(null);
        alert('✅ Question approved!');
      }
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Failed to approve question');
    }
  };

  const handleReject = async (questionId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/questions/${questionId}/reject`, {
        method: 'PATCH'
      });
      const data = await response.json();
      if (data.success) {
        setQuestions(questions.filter(q => q.id !== questionId));
        setSelectedQuestion(null);
        alert('Question rejected');
      }
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('Failed to reject question');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      {/* Header with Enhanced Hiralent Blue Theme */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] text-white">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <motion.div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}
            animate={{ 
              backgroundPosition: ['0px 0px', '40px 40px'],
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
        </div>

        {/* Floating orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
            }}
            transition={{ duration: 20, repeat: Infinity }}
            style={{ top: '10%', left: '10%' }}
          />
          <motion.div
            className="absolute w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"
            animate={{
              x: [0, -100, 0],
              y: [0, 50, 0],
            }}
            transition={{ duration: 15, repeat: Infinity }}
            style={{ bottom: '10%', right: '10%' }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                  className="relative"
                >
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  {/* Pulsing ring */}
                  <motion.div
                    className="absolute -inset-1 border-2 border-white/30 rounded-2xl"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
                
                <div>
                  <motion.h1 
                    className="text-5xl font-black tracking-tight"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    Review Queue
                  </motion.h1>
                  <motion.p 
                    className="text-blue-100 mt-1 flex items-center gap-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Shield className="w-4 h-4" />
                    Quality Control & Validation Center
                  </motion.p>
                </div>
              </div>

              {/* Live indicator */}
              <motion.div
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-sm font-bold">LIVE</span>
              </motion.div>
            </div>

            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mt-8">
              {[
                { 
                  label: 'Pending Review', 
                  value: questions.length, 
                  icon: AlertTriangle, 
                  color: 'yellow',
                  bgGradient: 'from-yellow-500/30 to-amber-500/30'
                },
                { 
                  label: 'Approved Today', 
                  value: 0, 
                  icon: CheckCircle2, 
                  color: 'green',
                  bgGradient: 'from-green-500/30 to-emerald-500/30'
                },
                { 
                  label: 'Quality Score', 
                  value: '95%', 
                  icon: Award, 
                  color: 'purple',
                  bgGradient: 'from-purple-500/30 to-pink-500/30'
                },
                { 
                  label: 'Active Reviewers', 
                  value: 1, 
                  icon: User, 
                  color: 'blue',
                  bgGradient: 'from-blue-500/30 to-cyan-500/30'
                }
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className={`bg-gradient-to-br ${stat.bgGradient} backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl relative overflow-hidden group cursor-pointer`}
                >
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, delay: idx * 0.5 }}
                  />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <stat.icon className="w-6 h-6 text-white" />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      >
                        <Activity className="w-4 h-4 text-white/60" />
                      </motion.div>
                    </div>
                    <div className="text-4xl font-black text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-white/90 font-medium">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Enhanced Wave Separator */}
        <div className="relative h-16">
          <svg viewBox="0 0 1440 120" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <motion.path 
              d="M0,60 C240,100 480,20 720,60 C960,100 1200,20 1440,60 L1440,120 L0,120 Z" 
              fill="rgb(249 250 251)"
              initial={{ d: "M0,60 C240,100 480,20 720,60 C960,100 1200,20 1440,60 L1440,120 L0,120 Z" }}
              animate={{ d: "M0,80 C240,40 480,80 720,40 C960,80 1200,40 1440,80 L1440,120 L0,120 Z" }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <motion.div
                className="w-20 h-20 border-4 border-blue-200 border-t-[#1B73E8] rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-0 w-20 h-20 border-4 border-transparent border-b-purple-500 rounded-full"
                animate={{ rotate: -360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#1B73E8]" />
              </div>
            </div>
            <div className="ml-6">
              <p className="text-gray-900 font-bold text-lg">Analyzing Questions...</p>
              <p className="text-gray-600 text-sm">Loading review queue</p>
            </div>
          </div>
        ) : questions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-gray-200 p-16 text-center shadow-xl relative overflow-hidden"
          >
            {/* Celebration confetti */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full"
                initial={{ 
                  top: '50%', 
                  left: '50%',
                  scale: 0 
                }}
                animate={{ 
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  scale: [0, 1, 0],
                  rotate: Math.random() * 360
                }}
                transition={{ 
                  duration: 2,
                  delay: i * 0.1,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              />
            ))}
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl relative"
            >
              <CheckCircle2 className="w-16 h-16 text-white" />
              <motion.div
                className="absolute -inset-4 border-4 border-green-300 rounded-full"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
            
            <h3 className="text-3xl font-black text-gray-900 mb-3">All Clear! </h3>
            <p className="text-gray-600 text-lg max-w-md mx-auto">
              No questions pending review. Your queue is empty and all systems are green!
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Questions List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <Eye className="w-6 h-6 text-[#1B73E8]" />
                  Pending Questions
                </h2>
                <span className="px-3 py-1 bg-[#1B73E8] text-white rounded-full text-sm font-bold">
                  {questions.length} items
                </span>
              </div>

              {questions.map((question, idx) => (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedQuestion(question)}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`bg-white rounded-2xl border-2 p-6 cursor-pointer transition-all relative overflow-hidden group ${
                    selectedQuestion?.id === question.id
                      ? 'border-[#1B73E8] shadow-2xl shadow-blue-500/20'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-xl'
                  }`}
                >
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 via-blue-50/50 to-blue-50/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.6 }}
                  />

                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <motion.span 
                          whileHover={{ scale: 1.1 }}
                          className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${
                            question.difficulty === 'easy' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                            question.difficulty === 'medium' ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white' :
                            'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                          }`}
                        >
                          {question.difficulty.toUpperCase()}
                        </motion.span>

                        {question.aiGenerated && (
                          <motion.span 
                            whileHover={{ scale: 1.1 }}
                            className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-xs font-bold shadow-md flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            AI
                          </motion.span>
                        )}
                      </div>

                      <motion.div
                        animate={{ rotate: selectedQuestion?.id === question.id ? 90 : 0 }}
                        className="w-6 h-6 flex items-center justify-center"
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          selectedQuestion?.id === question.id ? 'bg-[#1B73E8]' : 'bg-gray-300'
                        }`} />
                      </motion.div>
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight group-hover:text-[#1B73E8] transition-colors">
                      {question.title}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                      {question.description}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {question.skillTags && question.skillTags.slice(0, 2).map(tag => (
                          <span key={tag} className="px-2 py-1 bg-blue-50 text-[#1B73E8] rounded-lg text-xs font-medium border border-blue-100">
                            {tag}
                          </span>
                        ))}
                        {question.skillTags && question.skillTags.length > 2 && (
                          <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium border border-gray-200">
                            +{question.skillTags.length - 2}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(question.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Question Details Panel */}
            <AnimatePresence mode="wait">
              {selectedQuestion ? (
                <motion.div
                  key={selectedQuestion.id}
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-6 h-fit shadow-xl"
                >
                  {/* Header with gradient */}
                  <div className="bg-gradient-to-r from-[#1B73E8] to-[#1557B0] -m-6 mb-6 p-6 rounded-t-2xl">
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                      <Shield className="w-6 h-6" />
                      Quality Review
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">Detailed Question Analysis</p>
                  </div>

                  {/* Problem Statement */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#1B73E8]" />
                      </div>
                      <h3 className="font-bold text-gray-900">Problem Statement</h3>
                    </div>
                    <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl p-4 border border-gray-200">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedQuestion.problemStatement}
                      </p>
                    </div>
                  </div>

                  {/* Canonical Solution */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Code className="w-5 h-5 text-green-600" />
                      </div>
                      <h3 className="font-bold text-gray-900">Canonical Solution</h3>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-700 relative overflow-hidden">
                      <motion.div
                        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <pre className="text-xs text-green-400 overflow-x-auto pt-2">
                        <code>{selectedQuestion.canonicalSolution}</code>
                      </pre>
                    </div>
                  </div>

                  {/* Test Cases */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Target className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="font-bold text-gray-900">Test Cases</h3>
                      <span className="ml-auto px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                        {selectedQuestion.testCases.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {selectedQuestion.testCases.map((testCase, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-gradient-to-br from-gray-50 to-purple-50/20 rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-[#1B73E8] text-white rounded text-xs flex items-center justify-center font-bold">
                              {idx + 1}
                            </div>
                            <span className="text-xs text-gray-600 font-bold">TEST CASE #{idx + 1}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-white rounded p-2 border border-gray-200">
                              <span className="text-gray-500 font-bold block mb-1">INPUT:</span>
                              <pre className="text-gray-700 font-mono">{testCase.input}</pre>
                            </div>
                            <div className="bg-white rounded p-2 border border-gray-200">
                              <span className="text-green-600 font-bold block mb-1">OUTPUT:</span>
                              <pre className="text-gray-700 font-mono">{testCase.output}</pre>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <motion.button
                      onClick={() => handleApprove(selectedQuestion.id)}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/30 relative overflow-hidden group"
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <CheckCircle2 className="w-5 h-5 relative z-10" />
                      <span className="relative z-10">Approve</span>
                    </motion.button>
                    
                    <motion.button
                      onClick={() => handleReject(selectedQuestion.id)}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/30 relative overflow-hidden group"
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <XCircle className="w-5 h-5 relative z-10" />
                      <span className="relative z-10">Reject</span>
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gradient-to-br from-gray-100 to-blue-50 rounded-2xl border-2 border-dashed border-gray-300 p-16 text-center sticky top-6"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-gray-600 mb-2">Select a Question</h3>
                  <p className="text-gray-500">
                    Click on any question from the list to review its details
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewQueuePage;