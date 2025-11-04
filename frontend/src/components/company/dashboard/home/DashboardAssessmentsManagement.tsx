"use client";

import React, { useState } from 'react';
import { Plus, Search, Filter, Play, Pause, Edit, Trash2, BarChart3 } from 'lucide-react';

interface Assessment {
  id: string;
  title: string;
  jobTitle: string;
  status: 'active' | 'paused' | 'draft';
  questions: number;
  candidates: number;
  createdDate: string;
  type: 'ai-chat' | 'parsed' | 'manual';
}

const AssessmentsManagement: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([
    {
      id: '1',
      title: 'Frontend Technical Assessment',
      jobTitle: 'Senior Frontend Developer',
      status: 'active',
      questions: 15,
      candidates: 23,
      createdDate: '2024-01-10',
      type: 'ai-chat'
    },
    {
      id: '2',
      title: 'UI/UX Design Challenge',
      jobTitle: 'UI/UX Designer',
      status: 'active',
      questions: 8,
      candidates: 45,
      createdDate: '2024-01-08',
      type: 'parsed'
    },
    {
      id: '3',
      title: 'Backend System Design',
      jobTitle: 'Backend Engineer',
      status: 'draft',
      questions: 5,
      candidates: 0,
      createdDate: '2024-01-15',
      type: 'manual'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || assessment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getTypeBadge = (type: string) => {
    const types = {
      'ai-chat': { label: 'AI Chat', color: 'bg-purple-100 text-purple-800' },
      'parsed': { label: 'Parsed JD', color: 'bg-blue-100 text-blue-800' },
      'manual': { label: 'Manual', color: 'bg-gray-100 text-gray-800' }
    };
    return types[type as keyof typeof types] || types.manual;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessment Management</h1>
          <p className="text-gray-600">Create and manage candidate assessments</p>
        </div>
        <div className="flex gap-3">
          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50">
            <Plus size={20} />
            New Assessment
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-gray-600 text-sm">Total Assessments</p>
          <p className="text-2xl font-bold">{assessments.length}</p>
          <p className="text-green-600 text-sm">▲ 2 this month</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-gray-600 text-sm">Active Assessments</p>
          <p className="text-2xl font-bold">{assessments.filter(a => a.status === 'active').length}</p>
          <p className="text-green-600 text-sm">All running well</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-gray-600 text-sm">Total Candidates</p>
          <p className="text-2xl font-bold">{assessments.reduce((acc, curr) => acc + curr.candidates, 0)}</p>
          <p className="text-blue-600 text-sm">View analytics</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-gray-600 text-sm">Completion Rate</p>
          <p className="text-2xl font-bold">78%</p>
          <p className="text-green-600 text-sm">▲ 5% this week</p>
        </div>
      </div>

      {/* Creation Methods */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <h3 className="text-lg font-semibold mb-4">Create New Assessment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-purple-600 font-bold">AI</span>
            </div>
            <h4 className="font-semibold text-gray-900">Chat with AI</h4>
            <p className="text-sm text-gray-600 mt-1">Interactive AI assistant to build assessments</p>
          </button>
          
          <button className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-blue-600 font-bold">JD</span>
            </div>
            <h4 className="font-semibold text-gray-900">Parse Job Description</h4>
            <p className="text-sm text-gray-600 mt-1">Upload JD to auto-generate assessment</p>
          </button>
          
          <button className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="text-gray-600" size={24} />
            </div>
            <h4 className="font-semibold text-gray-900">Create Manually</h4>
            <p className="text-sm text-gray-600 mt-1">Build assessment from scratch</p>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search assessments..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Assessments Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Questions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssessments.map((assessment) => {
                const typeBadge = getTypeBadge(assessment.type);
                return (
                  <tr key={assessment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{assessment.title}</p>
                      <p className="text-sm text-gray-500">Created {assessment.createdDate}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{assessment.jobTitle}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${typeBadge.color}`}>
                        {typeBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        assessment.status === 'active' ? 'bg-green-100 text-green-800' :
                        assessment.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{assessment.questions} questions</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{assessment.candidates} candidates</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded" title="Analytics">
                          <BarChart3 size={16} className="text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Edit">
                          <Edit size={16} className="text-gray-600" />
                        </button>
                        {assessment.status === 'active' ? (
                          <button className="p-1 hover:bg-gray-100 rounded" title="Pause">
                            <Pause size={16} className="text-yellow-600" />
                          </button>
                        ) : (
                          <button className="p-1 hover:bg-gray-100 rounded" title="Activate">
                            <Play size={16} className="text-green-600" />
                          </button>
                        )}
                        <button className="p-1 hover:bg-gray-100 rounded" title="Delete">
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AssessmentsManagement;