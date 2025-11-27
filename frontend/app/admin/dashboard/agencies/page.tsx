'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Eye,
  Check,
  X,
  ExternalLink
} from 'lucide-react';

interface Agency {
  agency_id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  status: string;
  service_description: string | null;
  website: string | null;
  operating_countries: string[];
  service_categories: string[];
  business_license_url: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string;
}

interface Stats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  thisWeek: number;
  urgent: number;
  avgProcessingDays: number;
}

type TabType = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    thisWeek: 0,
    urgent: 0,
    avgProcessingDays: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('PENDING');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'PENDING', label: 'Pending', count: stats.totalPending },
    { key: 'APPROVED', label: 'Approved', count: stats.totalApproved },
    { key: 'REJECTED', label: 'Rejected', count: stats.totalRejected },
    { key: 'ALL', label: 'All', count: stats.totalPending + stats.totalApproved + stats.totalRejected },
  ];

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/admin/agencies/stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchAgencies = async (status?: TabType) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('adminToken');
      const url = status === 'ALL' 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/admin/agencies/all`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/admin/agencies/all?status=${status}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch agencies');
      }

      setAgencies(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAll = async () => {
    await Promise.all([fetchAgencies(activeTab), fetchStats()]);
  };

  useEffect(() => {
    fetchAll();
  }, [activeTab]);

  useEffect(() => {
    if (toast?.show) {
        const timer = setTimeout(() => setToast(null), 7000);
        return () => clearTimeout(timer);
    }
    }, [toast]);

  const handleApprove = async (agencyId: string) => {
    try {
      setActionLoading(agencyId);
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/admin/agencies/${agencyId}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to approve agency');
      }

      await fetchAll();
      setSelectedAgency(null);
      setShowDetailModal(false);
      
      setToast({
        show: true,
        message: `Agency approved! Temporary password: ${data.data.temp_password}`,
        type: 'success'
        });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (agencyId: string) => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setActionLoading(agencyId);
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/admin/agencies/${agencyId}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: rejectReason }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reject agency');
      }

      await fetchAll();
      setSelectedAgency(null);
      setShowRejectModal(false);
      setShowDetailModal(false);
      setRejectReason('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'VISA': return 'bg-purple-100 text-purple-700';
      case 'RELOCATION': return 'bg-blue-100 text-blue-700';
      case 'INTEGRATION': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'APPROVED': return 'bg-green-100 text-green-700';
      case 'REJECTED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Agency Applications</h1>
              <p className="text-slate-500">Review and process agency applications</p>
            </div>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
            <div className="flex items-center gap-2 text-yellow-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Total Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700">{stats.totalPending}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Urgent (&gt;7 days)</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{stats.urgent}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Approved</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{stats.totalApproved}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Avg Processing</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {stats.avgProcessingDays > 0 ? `${stats.avgProcessingDays}d` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.key
                  ? 'bg-blue-400 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchAll}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        ) : agencies.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">No Applications</h3>
            <p className="text-slate-500">No {activeTab.toLowerCase()} applications found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {agencies.map((agency) => (
              <motion.div
                key={agency.agency_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-800">{agency.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(agency.type)}`}>
                        {agency.type}
                      </span>
                      {activeTab === 'ALL' && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(agency.status)}`}>
                          {agency.status}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                      <p><span className="font-medium">Email:</span> {agency.email}</p>
                      <p><span className="font-medium">Phone:</span> {agency.phone}</p>
                      {agency.website && (
                        <p>
                          <span className="font-medium">Website:</span>{' '}
                          <a href={agency.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            {agency.website}
                          </a>
                        </p>
                      )}
                      <p><span className="font-medium">Applied:</span> {formatDate(agency.created_at)}</p>
                      {agency.approved_at && (
                        <p><span className="font-medium">Processed:</span> {formatDate(agency.approved_at)}</p>
                      )}
                    </div>
                    {agency.rejection_reason && (
                      <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-sm text-red-700">
                          <span className="font-medium">Rejection Reason:</span> {agency.rejection_reason}
                        </p>
                      </div>
                    )}
                    {agency.operating_countries.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {agency.operating_countries.map((country, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                            {country}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedAgency(agency);
                        setShowDetailModal(true);
                      }}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    {agency.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(agency.agency_id)}
                          disabled={actionLoading === agency.agency_id}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Approve"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAgency(agency);
                            setShowRejectModal(true);
                          }}
                          disabled={actionLoading === agency.agency_id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Reject"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAgency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-800">Agency Details</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold">{selectedAgency.name}</h4>
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(selectedAgency.type)}`}>
                      {selectedAgency.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selectedAgency.status)}`}>
                      {selectedAgency.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Email</p>
                  <p className="font-medium">{selectedAgency.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Phone</p>
                  <p className="font-medium">{selectedAgency.phone}</p>
                </div>
                {selectedAgency.website && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-500 mb-1">Website</p>
                    <a href={selectedAgency.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-500 hover:underline flex items-center gap-1">
                      {selectedAgency.website} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {selectedAgency.service_description && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Description</p>
                  <p className="text-slate-700">{selectedAgency.service_description}</p>
                </div>
              )}

              {selectedAgency.operating_countries.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Operating Countries</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgency.operating_countries.map((country, i) => (
                      <span key={i} className="px-3 py-1 bg-slate-100 rounded-full text-sm">{country}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedAgency.service_categories.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Service Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgency.service_categories.map((cat, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">{cat}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedAgency.rejection_reason && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-xs text-red-500 mb-1">Rejection Reason</p>
                  <p className="text-red-700">{selectedAgency.rejection_reason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                <p><span className="font-medium">Applied:</span> {formatDate(selectedAgency.created_at)}</p>
                {selectedAgency.approved_at && (
                  <p><span className="font-medium">Processed:</span> {formatDate(selectedAgency.approved_at)}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            {selectedAgency.status === 'PENDING' && (
              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setShowRejectModal(true);
                  }}
                  className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(selectedAgency.agency_id)}
                  disabled={actionLoading === selectedAgency.agency_id}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium disabled:opacity-50"
                >
                  {actionLoading === selectedAgency.agency_id ? 'Approving...' : 'Approve'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedAgency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md"
          >
            <h3 className="text-xl font-semibold text-slate-800 mb-4">Reject Application</h3>
            <p className="text-slate-600 mb-4">
              Are you sure you want to reject <strong>{selectedAgency.name}</strong>?
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="w-full p-3 border border-slate-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedAgency.agency_id)}
                disabled={actionLoading === selectedAgency.agency_id}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {actionLoading === selectedAgency.agency_id ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Toast Notification */}
        {toast?.show && (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50"
        >
            <div className={`px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 ${
            toast.type === 'success' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}>
            {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
            ) : (
                <XCircle className="w-5 h-5" />
            )}
            <div>
                <p className="font-medium">{toast.message}</p>
            </div>
            <button
                onClick={() => setToast(null)}
                className="ml-4 p-1 hover:bg-white/20 rounded"
            >
                <X className="w-4 h-4" />
            </button>
            </div>
        </motion.div>
        )}
    </div>
  );
}