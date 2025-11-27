'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  Building2,
  Users,
  FileText,
  Clock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  TrendingUp,
} from 'lucide-react';

export default function VerificationsPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    setRefreshing(true);
    const token = localStorage.getItem('sessionToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/v1/admin/verifications/pending', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();
      if (data.ok && data.data) {
        setCompanies(data.data);
      }
    } catch (err) {
      console.error('Failed to load verifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const getUrgencyLevel = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days >= 7) return 'urgent';
    if (days >= 3) return 'medium';
    return 'normal';
  };

  const filteredCompanies = companies.filter(company =>
    company.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.registration_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-200 rounded-xl w-1/3"></div>
          <div className="h-5 bg-slate-200 rounded-lg w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-slate-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800">
                Company Verifications
              </h1>
            </div>
            <p className="text-slate-600 text-sm">
              Review and process pending company verification requests
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadVerifications}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-semibold text-slate-700">
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-600">Total Pending</span>
            </div>
            <p className="text-2xl font-black text-slate-800">{companies.length}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold text-orange-600">Urgent</span>
            </div>
            <p className="text-2xl font-black text-slate-800">
              {companies.filter(c => getUrgencyLevel(c.verification_submitted_at) === 'urgent').length}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-600">This Week</span>
            </div>
            <p className="text-2xl font-black text-slate-800">
              {companies.filter(c => {
                const days = Math.floor((new Date().getTime() - new Date(c.verification_submitted_at).getTime()) / (1000 * 60 * 60 * 24));
                return days <= 7;
              }).length}
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-600">Avg Time</span>
            </div>
            <p className="text-2xl font-black text-slate-800">2.3d</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company name, industry, or registration number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all">
            <Filter className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-semibold text-slate-700">Filters</span>
          </button>
        </div>
      </div>

      {/* Companies List */}
      <div className="space-y-4">
        {filteredCompanies.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 mb-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              {searchQuery ? 'No Results Found' : 'All Caught Up!'}
            </h3>
            <p className="text-slate-600">
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'No pending verifications at the moment.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredCompanies.map((company) => {
              const urgency = getUrgencyLevel(company.verification_submitted_at);
              const urgencyColors = {
                urgent: {
                  border: 'border-red-200',
                  bg: 'bg-red-50',
                  badge: 'bg-red-100 text-red-700 border-red-200',
                  glow: 'shadow-red-100',
                },
                medium: {
                  border: 'border-amber-200',
                  bg: 'bg-amber-50',
                  badge: 'bg-amber-100 text-amber-700 border-amber-200',
                  glow: 'shadow-amber-100',
                },
                normal: {
                  border: 'border-blue-200',
                  bg: 'bg-blue-50',
                  badge: 'bg-blue-100 text-blue-700 border-blue-200',
                  glow: 'shadow-blue-100',
                },
              };
              
              const colors = urgencyColors[urgency];

              return (
                <div
                  key={company.company_id}
                  onClick={() => router.push(`/admin/dashboard/verifications/${company.company_id}`)}
                  className={`group relative bg-white rounded-2xl border ${colors.border} p-6 hover:shadow-xl transition-all duration-300 cursor-pointer ${colors.glow}`}
                >
                  {/* Gradient Overlay */}
                  <div className={`absolute inset-0 ${colors.bg} opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300`} />
                  
                  <div className="relative">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md">
                            <Building2 className="w-4 h-4 text-white" />
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                            {company.company_name}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2.5 py-1 ${colors.badge} text-xs font-semibold rounded-lg border`}>
                            {urgency === 'urgent' ? '⚡ Urgent' : urgency === 'medium' ? '⏰ Medium' : '📋 Pending'}
                          </span>
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">
                            {getTimeAgo(company.verification_submitted_at)}
                          </span>
                        </div>
                      </div>

                      <button className="ml-4 p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md group-hover:scale-110 transition-transform duration-300">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-purple-100">
                          <FileText className="w-3.5 h-3.5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-0.5">Industry</p>
                          <p className="text-sm font-semibold text-slate-800">{company.industry}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-blue-100">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-0.5">Company Size</p>
                          <p className="text-sm font-semibold text-slate-800">{company.company_size}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-emerald-100">
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-0.5">Registration Number</p>
                          <p className="text-sm font-semibold text-slate-800">{company.registration_number}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-cyan-100">
                            <Mail className="w-3.5 h-3.5 text-cyan-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500 mb-0.5">Contact Email</p>
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {company.user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 font-medium">Click to review details</span>
                        <div className="flex items-center gap-1 text-blue-600 font-semibold group-hover:gap-2 transition-all">
                          <span>Review</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}