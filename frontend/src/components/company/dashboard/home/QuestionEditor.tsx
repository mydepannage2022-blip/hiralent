"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  X, 
  Play, 
  TestTube, 
  Code, 
  FileText, 
  Sparkles,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Zap,
  Tag,
  Hash,
  ArrowRight,
  Target,
  Lightbulb,
  Terminal,
  FlaskConical
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
}

interface QuestionEditorProps {
  question?: Question;
  onSave: (question: Partial<Question>) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  onSave,
  onCancel,
  mode
}) => {
  const [formData, setFormData] = useState<Partial<Question>>({
    title: '',
    description: '',
    problemStatement: '',
    difficulty: 'medium',
    skillTags: [],
    type: 'coding',
    canonicalSolution: '',
    testCases: [{ input: '', output: '' }],
    status: 'draft'
  });

  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'solution' | 'tests'>('details');

  useEffect(() => {
    if (question) {
      setFormData(question);
    }
  }, [question]);

  const handleAddTag = () => {
    if (newTag.trim() && !formData.skillTags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        skillTags: [...(prev.skillTags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skillTags: prev.skillTags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleAddTestCase = () => {
    setFormData(prev => ({
      ...prev,
      testCases: [...(prev.testCases || []), { input: '', output: '' }]
    }));
  };

  const handleTestCaseChange = (index: number, field: 'input' | 'output', value: string) => {
    setFormData(prev => ({
      ...prev,
      testCases: prev.testCases?.map((testCase, i) => 
        i === index ? { ...testCase, [field]: value } : testCase
      ) || []
    }));
  };

  const handleRemoveTestCase = (index: number) => {
    setFormData(prev => ({
      ...prev,
      testCases: prev.testCases?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const difficultyConfig = {
    easy: { 
      bg: 'bg-green-50', 
      text: 'text-green-700', 
      border: 'border-green-200', 
      icon: CheckCircle,
      label: 'Easy'
    },
    medium: { 
      bg: 'bg-yellow-50', 
      text: 'text-yellow-700', 
      border: 'border-yellow-200', 
      icon: Target,
      label: 'Medium'
    },
    hard: { 
      bg: 'bg-red-50', 
      text: 'text-red-700', 
      border: 'border-red-200', 
      icon: Zap,
      label: 'Hard'
    }
  };

  const currentDifficulty = difficultyConfig[formData.difficulty as keyof typeof difficultyConfig];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl"
      >
        {/* Compact Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] text-white">
          <div className="absolute inset-0 opacity-10">
            <motion.div 
              className="absolute inset-0" 
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '30px 30px'
              }}
              animate={{ 
                backgroundPosition: ['0px 0px', '30px 30px'],
              }}
              transition={{ 
                duration: 20, 
                repeat: Infinity, 
                ease: "linear" 
              }}
            />
          </div>

          <div className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  {mode === 'create' ? (
                    <Sparkles className="w-5 h-5 text-white" />
                  ) : (
                    <Code className="w-5 h-5 text-white" />
                  )}
                </motion.div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">
                    {mode === 'create' ? 'Create New Question' : 'Edit Question'}
                  </h2>
                  <p className="text-blue-100 text-xs">
                    {mode === 'create' ? 'Design a new assessment challenge' : 'Update question details'}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={onCancel}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Compact Tab Navigation */}
            <div className="flex gap-2 mt-4">
              {[
                { id: 'details', label: 'Details', icon: FileText },
                { id: 'solution', label: 'Solution', icon: Code },
                { id: 'tests', label: 'Tests', icon: TestTube }
              ].map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-[#1B73E8] shadow-md'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Compact Wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 32h1440V16c-157.5 0-315-16-472.5-16S652.5 16 495 16 180 0 0 0v32z" fill="white" />
            </svg>
          </div>
        </div>

        {/* Compact Form Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 180px)' }}>
          <AnimatePresence mode="wait">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Title & Difficulty */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                      <FileText className="w-3.5 h-3.5 text-[#1B73E8]" />
                      Question Title
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8] focus:bg-white transition-all"
                      placeholder="Enter a descriptive title..."
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                      <Target className="w-3.5 h-3.5 text-[#1B73E8]" />
                      Difficulty
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.difficulty || 'medium'}
                      onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                      className={`w-full px-3 py-2 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 transition-all font-bold ${
                        currentDifficulty?.bg
                      } ${currentDifficulty?.text} ${currentDifficulty?.border}`}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                    <Lightbulb className="w-3.5 h-3.5 text-[#1B73E8]" />
                    Short Description
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.description || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8] focus:bg-white transition-all resize-none"
                    placeholder="Brief description..."
                  />
                </div>

                {/* Problem Statement */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                    <Code className="w-3.5 h-3.5 text-[#1B73E8]" />
                    Problem Statement
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      required
                      value={formData.problemStatement || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, problemStatement: e.target.value }))}
                      rows={5}
                      className="w-full px-3 py-2 text-sm bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8] transition-all resize-none"
                      placeholder="Detailed problem statement..."
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white px-2 py-0.5 rounded shadow-sm">
                      <Hash className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formData.problemStatement?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Skills Tags */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
                    <Tag className="w-3.5 h-3.5 text-[#1B73E8]" />
                    Skills Tags
                  </label>
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        className="flex-1 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8]"
                        placeholder="Type a skill tag..."
                      />
                      <motion.button
                        type="button"
                        onClick={handleAddTag}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-1.5 text-sm bg-[#1B73E8] text-white rounded hover:bg-[#1557B0] transition-colors font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </motion.button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <AnimatePresence>
                        {formData.skillTags?.map(tag => (
                          <motion.span
                            key={tag}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </motion.span>
                        ))}
                      </AnimatePresence>
                      {formData.skillTags?.length === 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 italic">
                          <AlertCircle className="w-3 h-3" />
                          <span>No tags added yet</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Solution Tab */}
            {activeTab === 'solution' && (
              <motion.div
                key="solution"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                      <Terminal className="w-3.5 h-3.5 text-[#1B73E8]" />
                      Canonical Solution
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <AlertCircle className="w-3 h-3" />
                      <span>Used to validate test cases</span>
                    </div>
                  </div>
                  <div className="relative">
                    <textarea
                      required
                      value={formData.canonicalSolution || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, canonicalSolution: e.target.value }))}
                      rows={14}
                      className="w-full px-3 py-2 bg-gray-900 text-green-400 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B73E8] font-mono text-xs resize-none"
                      placeholder="def solution(input):\n    # Write your canonical solution here\n    pass"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-bold">
                        <Code className="w-3 h-3" />
                        Python
                      </div>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-xs">
                        <Hash className="w-3 h-3" />
                        {formData.canonicalSolution?.split('\n').length || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Test Cases Tab */}
            {activeTab === 'tests' && (
              <motion.div
                key="tests"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                      <FlaskConical className="w-3.5 h-3.5 text-[#1B73E8]" />
                      Test Cases
                      <span className="text-red-500">*</span>
                      <span className="ml-1 px-2 py-0.5 bg-blue-100 text-[#1B73E8] rounded-full text-xs font-bold flex items-center gap-1">
                        <TestTube className="w-2.5 h-2.5" />
                        {formData.testCases?.length || 0}
                      </span>
                    </label>
                    <motion.button
                      type="button"
                      onClick={handleAddTestCase}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </motion.button>
                  </div>
                  
                  <div className="space-y-3">
                    <AnimatePresence>
                      {formData.testCases?.map((testCase, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          className="bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-gray-200 rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-[#1B73E8] text-white rounded text-xs flex items-center justify-center font-bold">
                                {index + 1}
                              </div>
                              <span className="text-xs font-bold text-gray-700">Test Case #{index + 1}</span>
                            </div>
                            {formData.testCases && formData.testCases.length > 1 && (
                              <motion.button
                                type="button"
                                onClick={() => handleRemoveTestCase(index)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </motion.button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="flex items-center gap-1 text-xs font-bold text-gray-600 mb-1.5">
                                <ArrowRight className="w-3 h-3" />
                                Input
                              </label>
                              <textarea
                                value={testCase.input}
                                onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                                rows={2}
                                className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8] font-mono resize-none"
                                placeholder="Test input..."
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-1 text-xs font-bold text-gray-600 mb-1.5">
                                <CheckCircle className="w-3 h-3" />
                                Expected Output
                              </label>
                              <textarea
                                value={testCase.output}
                                onChange={(e) => handleTestCaseChange(index, 'output', e.target.value)}
                                rows={2}
                                className="w-full px-2 py-1.5 text-xs bg-white border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8] font-mono resize-none"
                                placeholder="Expected output..."
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* Compact Footer */}
        <div className="bg-gray-50 border-t-2 border-gray-200 px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <AlertCircle className="w-3 h-3" />
              <span>Fields with</span>
              <span className="text-red-500 font-bold">*</span>
              <span>are required</span>
            </div>
            <div className="flex gap-2">
              <motion.button
                type="button"
                onClick={onCancel}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-2 text-sm border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-bold flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                onClick={handleSubmit}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-5 py-2 text-sm bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white rounded-lg hover:shadow-lg transition-all font-bold flex items-center gap-1.5"
              >
                {mode === 'create' ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QuestionEditor;