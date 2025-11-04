"use client"
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Search, 
  CheckCircle2, 
  Clock, 
  FileText,
  Zap,
  TrendingUp,
  Award,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Grid3x3,
  List
} from 'lucide-react';
import QuestionEditor from './QuestionEditor'; // ← ADD THIS IMPORT

interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  skillTags: string[];
  status: string;
  createdAt: string;
  views?: number;
  submissions?: number;
  successRate?: number;
}

const QuestionBankPage: React.FC = () => {
  // ALL HOOKS MUST BE INSIDE THE COMPONENT FUNCTION
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({ difficulty: '', status: '', search: '' });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');

  // Stats
  const stats = {
    total: questions.length,
    approved: questions.filter(q => q.status === 'approved').length,
    pending: questions.filter(q => q.status === 'pending_review').length,
    draft: questions.filter(q => q.status === 'draft').length,
  };

  // Load questions
  const loadQuestions = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading questions from API...');
      
      const response = await fetch('http://localhost:5000/api/questions');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 API Response:', data);
      
      if (data.success && data.questions) {
        setQuestions(data.questions);
        console.log(`✅ Loaded ${data.questions.length} questions`);
      } else {
        console.warn('⚠️ No questions in response:', data);
        setQuestions([]);
      }
    } catch (error) {
      console.error('❌ Failed to load questions:', error);
      setQuestions([]);
    }
    setLoading(false);
  };

  // Generate new question with AI
  const generateQuestion = async () => {
    setGenerating(true);
    try {
      const topic = prompt('🎯 Enter topic for AI-generated question (e.g., Python lists, React hooks):');
      if (topic) {
        const response = await fetch('http://localhost:5000/api/questions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, difficulty: 'medium' })
        });
        const data = await response.json();
        if (data.success && data.question) {
          setQuestions([data.question, ...questions]);
        } else {
          alert('Failed to generate question: ' + (data.error || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Failed to generate question:', error);
      alert('Network error during question generation.');
    }
    setGenerating(false);
  };

  // Approve question
  const approveQuestion = async (questionId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/questions/${questionId}/approve`, {
        method: 'PATCH'
      });
      const data = await response.json();
      if (data.success) {
        // Update local state instead of reloading
        setQuestions(questions.map(q => 
          q.id === questionId ? { ...q, status: 'approved' } : q
        ));
      } else {
        alert('Failed to approve question: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to approve question:', error);
      alert('Network error during approval.');
    }
  };

  // Editor functions
  const handleCreateQuestion = () => {
    setEditorMode('create');
    setEditingQuestion(null);
    setShowEditor(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditorMode('edit');
    setEditingQuestion(question);
    setShowEditor(true);
  };

  const handleSaveQuestion = async (questionData: Partial<Question>) => {
    try {
      const url = editorMode === 'create' 
        ? 'http://localhost:5000/api/questions' 
        : `http://localhost:5000/api/questions/${editingQuestion?.id}`;
      
      const method = editorMode === 'create' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowEditor(false);
        loadQuestions(); // Reload the list
      } else {
        alert('Failed to save question: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save question:', error);
      alert('Network error while saving question.');
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []); // Removed filters dependency for now

  // Filter questions by search
  const filteredQuestions = questions.filter(q => 
    q.title.toLowerCase().includes(filters.search.toLowerCase()) ||
    (q.skillTags && q.skillTags.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase())))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Hiralent Blue Theme */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] text-white">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight">Question Bank</h1>
                <p className="text-blue-100 mt-1">AI-Powered Assessment Library</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mt-8">
              {[
                { label: 'Total Questions', value: stats.total, icon: FileText, bgColor: 'bg-white/20', iconColor: 'text-white' },
                { label: 'Approved', value: stats.approved, icon: CheckCircle2, bgColor: 'bg-green-500/30', iconColor: 'text-white' },
                { label: 'Pending Review', value: stats.pending, icon: Clock, bgColor: 'bg-yellow-500/30', iconColor: 'text-white' },
                { label: 'Draft', value: stats.draft, icon: Edit, bgColor: 'bg-gray-500/30', iconColor: 'text-white' },
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`${stat.bgColor} backdrop-blur-sm rounded-2xl p-5 border border-white/20`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                    <TrendingUp className="w-4 h-4 text-white/60" />
                  </div>
                  <div className="text-3xl font-black text-white">{stat.value}</div>
                  <div className="text-sm text-white/80 mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 48h1440V24c-157.5 0-315-24-472.5-24S652.5 24 495 24 180 0 0 0v48z" fill="rgb(249 250 251)" />
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Controls Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions by title or skills..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8] focus:bg-white transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'grid' 
                      ? 'bg-white text-[#1B73E8] shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'table' 
                      ? 'bg-white text-[#1B73E8] shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Table
                </button>
              </div>

              {/* Difficulty Filter */}
              <select 
                value={filters.difficulty}
                onChange={(e) => setFilters({...filters, difficulty: e.target.value})}
                className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8] text-sm font-medium text-gray-700"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              {/* Status Filter */}
              <select 
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-[#1B73E8] text-sm font-medium text-gray-700"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
              </select>

              {/* Create Question Button */}
              <motion.button
                onClick={handleCreateQuestion}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative overflow-hidden bg-[#1B73E8] hover:bg-[#1557B0] text-white px-6 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Create Question
              </motion.button>

              {/* AI Generate Button */}
              <motion.button
                onClick={generateQuestion}
                disabled={generating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative overflow-hidden bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Zap className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Generating...' : 'AI Generate'}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Questions Display */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-[#1B73E8] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading questions...</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredQuestions.map((question, idx) => (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)' }}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden group cursor-pointer transition-all"
                >
                  {/* Card Header - Difficulty Color */}
                  <div className={`h-2 ${
                    question.difficulty === 'easy' ? 'bg-green-500' :
                    question.difficulty === 'medium' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />

                  <div className="p-6">
                    {/* Status & Difficulty Badges */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                        question.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                        question.status === 'pending_review' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                        'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}>
                        {question.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                        {question.status === 'pending_review' && <Clock className="w-3 h-3" />}
                        {question.status.replace('_', ' ').toUpperCase()}
                      </span>

                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        question.difficulty === 'easy' ? 'bg-green-50 text-green-700 border-green-200' :
                        question.difficulty === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {question.difficulty.toUpperCase()}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-[#1B73E8] transition-colors">
                      {question.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {question.description}
                    </p>

                    {/* Skills Tags */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {question.skillTags && question.skillTags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-blue-50 text-[#1B73E8] rounded-lg text-xs font-medium border border-blue-100">
                          {tag}
                        </span>
                      ))}
                      {question.skillTags && question.skillTags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium border border-gray-200">
                          +{question.skillTags.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{question.views || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BarChart3 className="w-4 h-4" />
                        <span>{question.submissions || 0}</span>
                      </div>
                      {question.successRate && (
                        <div className="flex items-center gap-1 ml-auto">
                          <Award className="w-4 h-4 text-green-600" />
                          <span className="font-bold text-green-600">{question.successRate}%</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex items-center gap-2">
                      {question.status !== 'approved' && (
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            approveQuestion(question.id);
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </motion.button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditQuestion(question);
                        }}
                        className="p-2 bg-blue-50 text-[#1B73E8] rounded-lg hover:bg-blue-100 transition-colors border border-blue-100"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          // Table View
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Question</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Difficulty</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Skills</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Stats</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredQuestions.map((question) => (
                  <motion.tr 
                    key={question.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 hover:text-[#1B73E8] cursor-pointer">{question.title}</div>
                      <div className="text-sm text-gray-500 mt-1 line-clamp-1">{question.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        question.difficulty === 'easy' ? 'bg-green-50 text-green-700 border-green-200' :
                        question.difficulty === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {question.difficulty.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {question.skillTags && question.skillTags.slice(0, 2).map(tag => (
                          <span key={tag} className="px-2 py-1 bg-blue-50 text-[#1B73E8] rounded-lg text-xs font-medium border border-blue-100">
                            {tag}
                          </span>
                        ))}
                        {question.skillTags && question.skillTags.length > 2 && (
                          <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs border border-gray-200">
                            +{question.skillTags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${
                        question.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                        question.status === 'pending_review' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                        'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}>
                        {question.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                        {question.status === 'pending_review' && <Clock className="w-3 h-3" />}
                        {question.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {question.views || 0}
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4" />
                          {question.submissions || 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {question.status !== 'approved' && (
                          <button
                            onClick={() => approveQuestion(question.id)}
                            className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
                            title="Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleEditQuestion(question)}
                          className="p-2 bg-blue-50 text-[#1B73E8] rounded-lg hover:bg-blue-100 transition-colors border border-blue-100" 
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-100" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {/* Empty State */}
            {filteredQuestions.length === 0 && (
              <div className="py-16 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No questions found</h3>
                <p className="text-gray-600 mb-6">Create your first question to get started!</p>
                <motion.button
                  onClick={handleCreateQuestion}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-[#1B73E8] hover:bg-[#1557B0] text-white px-8 py-3 rounded-xl font-bold shadow-md inline-flex items-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  Create Question
                </motion.button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Question Editor Modal */}
      {showEditor && (
        <QuestionEditor
          question={editingQuestion || undefined}
          onSave={handleSaveQuestion}
          onCancel={() => setShowEditor(false)}
          mode={editorMode}
        />
      )}
    </div>
  );
};

export default QuestionBankPage;