"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  FileText,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Building2,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Agency {
  agency_id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Document {
  document_id: string;
  document_type: string;
  file_name: string;
  status: string;
  created_at: string;
}

interface Case {
  case_id: string;
  case_number: string;
  service_type: string;
  priority_level: string;
  status: string;
  origin_country: string;
  destination_country: string;
  destination_city?: string;
  estimated_completion?: string;
  estimated_cost?: number;
  created_at: string;
  agency: Agency;
  documents: Document[];
}

export default function CasesPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/candidates/cases`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch cases');
      }

      const data = await response.json();
      setCases(data.data || []);
    } catch (err) {
      console.error('Fetch cases error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cases');
      toast.error('Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'pending_documents':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'initiated':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading your cases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchCases}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8 bg-linear-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              My Relocation Cases
            </h1>
            <p className="text-slate-600">
              Track your relocation cases and upload required documents
            </p>
          </div>
          <button
            onClick={fetchCases}
            className="p-3 bg-white hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 hover:border-blue-300 shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cases List */}
      {cases.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-20 h-20 bg-linear-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Cases Yet</h3>
          <p className="text-slate-500">
            Your relocation cases will appear here once created by your agency
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {cases.map((caseItem, index) => (
            <motion.div
              key={caseItem.case_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => router.push(`/candidate/dashboard/cases/${caseItem.case_id}`)}
              className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              {/* Case Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-slate-800">
                      {caseItem.case_number}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        caseItem.status
                      )}`}
                    >
                      {caseItem.status.replace('_', ' ')}
                    </span>
                    <div
                      className={`w-2 h-2 rounded-full ${getPriorityColor(
                        caseItem.priority_level
                      )}`}
                      title={`${caseItem.priority_level} priority`}
                    />
                  </div>
                  <p className="text-sm text-slate-500">
                    {caseItem.service_type.replace('_', ' ')}
                  </p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

              {/* Case Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Route</p>
                    <p className="text-sm font-medium text-slate-700">
                      {caseItem.origin_country} → {caseItem.destination_country}
                      {caseItem.destination_city && ` (${caseItem.destination_city})`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Agency</p>
                    <p className="text-sm font-medium text-slate-700">
                      {caseItem.agency.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Created</p>
                    <p className="text-sm font-medium text-slate-700">
                      {formatDate(caseItem.created_at)}
                    </p>
                  </div>
                </div>

                {caseItem.estimated_completion && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Est. Completion</p>
                      <p className="text-sm font-medium text-slate-700">
                        {formatDate(caseItem.estimated_completion)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Documents Status */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {caseItem.documents.length} document{caseItem.documents.length !== 1 ? 's' : ''} uploaded
                  </span>
                </div>
                <span className="text-sm font-medium text-blue-600 group-hover:underline">
                  View Details →
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}