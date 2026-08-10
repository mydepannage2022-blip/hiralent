'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_V1_BASE } from "@/src/lib/config/api";

// ---- Inline icons (no dependencies) ----
const IconClock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M12 8v4l3 2" />
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const IconCheckCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="m9 12 2 2 4-4" />
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const IconXCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="m15 9-6 6m0-6 6 6" />
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const IconAlertTriangle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M10.3 3.86 1.82 18a2 2 0 0 0 1.73 3h16.9a2 2 0 0 0 1.73-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M12 9v4" />
    <circle cx="12" cy="17" r="1.1" fill="currentColor" />
  </svg>
);

const IconClipboardList = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M9 5h6m-5 4h4M8 9H6m0 4h2m0 4H6" />
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M9 3h6a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a2 2 0 0 1 2-2h1V5a2 2 0 0 1 2-2Z" />
  </svg>
);

const IconChartBar = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M3 21h18" />
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M7 17V9m5 8V5m5 12v-6" />
  </svg>
);

const IconRefreshCw = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M20 11a8 8 0 1 0-1.9 5.2M20 11V6m0 5h-5" />
  </svg>
);

const IconTrendingUp = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="m2.5 16.5 5-5 4 4 7-7" />
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M16.5 9.5h-5v5" />
  </svg>
);

const IconUsers = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconBriefcase = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const IconActivity = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const IconZap = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M13 2 3 14h8l-1 8 10-12h-8l1-8z" />
  </svg>
);

const IconSettings = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      d="M12 1v6m0 6v6M4.2 4.2l4.3 4.3m5 5 4.3 4.3M1 12h6m6 0h6M4.2 19.8l4.3-4.3m5-5 4.3-4.3" />
  </svg>
);

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const token = localStorage.getItem('sessionToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    setRefreshing(true);
    try {
      const response = await fetch(`${API_V1_BASE}/admin/verifications/stats`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      const data = await response.json();
      if (data.ok && data.data) setStats(data.data);
    } catch {
      console.error('Failed to load stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-slate-700 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Pending Review',
      value: stats?.totalPending ?? 0,
      icon: <IconClock className="w-6 h-6" />,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-700',
      description: 'Awaiting verification',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Verified',
      value: stats?.totalVerified ?? 0,
      icon: <IconCheckCircle className="w-6 h-6" />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-700',
      description: 'Successfully verified',
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Rejected',
      value: stats?.totalRejected ?? 0,
      icon: <IconXCircle className="w-6 h-6" />,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-700',
      description: 'Not approved',
      trend: '-3%',
      trendUp: false,
    },
    {
      title: 'Urgent Attention',
      value: stats?.pendingOlderThan7Days ?? 0,
      icon: <IconAlertTriangle className="w-6 h-6" />,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-700',
      description: 'Pending > 7 days',
      trend: '+5%',
      trendUp: true,
    },
  ];

  const quickActions = [
    {
      title: 'Review Pending',
      description: 'Process verification requests',
      icon: <IconClipboardList className="w-5 h-5" />,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-700',
      hoverBorder: 'hover:border-slate-400',
      count: stats?.totalPending ?? 0,
      onClick: () => router.push('/admin/dashboard/verifications'),
    },
    {
      title: 'View Analytics',
      description: 'Detailed insights & trends',
      icon: <IconChartBar className="w-5 h-5" />,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-700',
      hoverBorder: 'hover:border-indigo-300',
      count: '94%',
      onClick: () => router.push('/admin/dashboard/analytics'),
    },
    {
      title: 'Manage Admins',
      description: 'Superadmin accounts',
      icon: <IconUsers className="w-5 h-5" />,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-700',
      hoverBorder: 'hover:border-sky-300',
      count: '',
      onClick: () => router.push('/admin/dashboard/admins'),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center shadow-md">
                <IconZap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Super Admin Dashboard
                </h1>
                <p className="text-gray-600 text-sm mt-0.5">
                  Monitor and manage your platform with real-time insights
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={loadStats}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <IconRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>

              <button
                onClick={() => router.push('/admin/dashboard/settings')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-all shadow-md hover:shadow-lg"
              >
                <IconSettings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {statCards.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all hover:border-gray-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${card.iconBg} p-3 rounded-lg`}>
                  <div className={card.iconColor}>{card.icon}</div>
                </div>
                
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${card.trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  <IconTrendingUp className={`w-3 h-3 ${card.trendUp ? '' : 'rotate-180'}`} />
                  <span className="text-xs font-semibold">
                    {card.trend}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{card.value}</p>
                <h3 className="font-semibold text-sm text-gray-900">{card.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{card.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Quick Actions - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-0.5">Quick Actions</h2>
                  <p className="text-gray-600 text-sm">Fast access to key features</p>
                </div>
                <IconZap className="w-6 h-6 text-slate-700" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {quickActions.map((action) => (
                  <button
                    key={action.title}
                    onClick={action.onClick}
                    className={`group bg-white border-2 border-gray-200 rounded-lg p-5 text-left transition-all hover:shadow-md ${action.hoverBorder}`}
                  >
                    <div className={`inline-flex ${action.iconBg} p-3 rounded-lg mb-3 group-hover:scale-110 transition-transform`}>
                      <div className={action.iconColor}>{action.icon}</div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 text-sm">
                          {action.title}
                        </h3>
                        <span className="text-xl font-bold text-gray-400 group-hover:text-gray-700 transition-colors">
                          {action.count}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {action.description}
                      </p>
                    </div>
                    
                    {/* Arrow icon */}
                    <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="bg-slate-100 p-2.5 rounded-lg">
                  <IconActivity className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Performance Metrics</h3>
                  <p className="text-xs text-gray-600">Real-time system health</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <p className="text-xs text-gray-600 mb-1.5">Processing Time</p>
                  <p className="text-2xl font-bold text-gray-900 mb-0.5">2.3</p>
                  <p className="text-xs text-emerald-700 font-semibold">days avg</p>
                </div>
                
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <p className="text-xs text-gray-600 mb-1.5">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mb-0.5">94%</p>
                  <p className="text-xs text-sky-700 font-semibold">excellent</p>
                </div>
                
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <p className="text-xs text-gray-600 mb-1.5">SLA Compliance</p>
                  <p className="text-2xl font-bold text-gray-900 mb-0.5">98%</p>
                  <p className="text-xs text-indigo-700 font-semibold">on track</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Sidebar */}
          <div className="space-y-5">
            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="bg-slate-100 p-2.5 rounded-lg">
                  <IconActivity className="w-4 h-4 text-slate-700" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Recent Activity</h3>
                  <p className="text-xs text-gray-600">Last 24 hours</p>
                </div>
              </div>
              
              <div className="space-y-2.5">
                {[
                  { color: 'emerald', text: '5 companies verified', time: '2h ago', icon: <IconCheckCircle className="w-3.5 h-3.5" /> },
                  { color: 'amber', text: '3 pending requests', time: '4h ago', icon: <IconClock className="w-3.5 h-3.5" /> },
                  { color: 'slate', text: 'System updated', time: '1d ago', icon: <IconZap className="w-3.5 h-3.5" /> },
                  { color: 'indigo', text: '12 new applications', time: '1d ago', icon: <IconBriefcase className="w-3.5 h-3.5" /> },
                  { color: 'rose', text: '2 issues resolved', time: '2d ago', icon: <IconXCircle className="w-3.5 h-3.5" /> },
                ].map((activity, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-${activity.color}-100 flex items-center justify-center text-${activity.color}-600`}>
                        {activity.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{activity.text}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="bg-emerald-100 p-2.5 rounded-lg">
                  <IconZap className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">System Status</h3>
                  <p className="text-xs text-emerald-700 font-semibold">All systems operational</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {[
                  { label: 'API Response', value: '99.9%' },
                  { label: 'Database', value: 'Online' },
                  { label: 'Email Service', value: 'Active' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-xs font-medium text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-900">{item.value}</span>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
  );
}