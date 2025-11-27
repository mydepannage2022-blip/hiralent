'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
      const response = await fetch('http://localhost:5000/api/v1/admin/verifications/stats', {
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
        {/* Animated background gradients */}
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-purple-500/5 rounded-full blur-3xl animate-pulse" />
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto p-4 sm:p-5 space-y-5">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-72 rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
              <div className="h-4 w-96 rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
            </div>
            <div className="h-9 w-32 rounded-xl bg-slate-200 animate-pulse" />
          </div>
          
          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 rounded-2xl bg-white/80 border border-slate-200 animate-pulse" />
            ))}
          </div>
          
          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-80 rounded-2xl bg-white/80 border border-slate-200 animate-pulse" />
            <div className="h-80 rounded-2xl bg-white/80 border border-slate-200 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Pending Review',
      value: stats?.totalPending ?? 0,
      icon: <IconClock className="w-7 h-7" />,
      gradient: 'from-blue-500 via-blue-600 to-cyan-500',
      glowColor: 'rgba(59, 130, 246, 0.5)',
      description: 'Awaiting verification',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Verified',
      value: stats?.totalVerified ?? 0,
      icon: <IconCheckCircle className="w-7 h-7" />,
      gradient: 'from-emerald-500 via-green-500 to-teal-500',
      glowColor: 'rgba(16, 185, 129, 0.5)',
      description: 'Successfully verified',
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Rejected',
      value: stats?.totalRejected ?? 0,
      icon: <IconXCircle className="w-7 h-7" />,
      gradient: 'from-rose-500 via-pink-500 to-red-500',
      glowColor: 'rgba(244, 63, 94, 0.5)',
      description: 'Not approved',
      trend: '-3%',
      trendUp: false,
    },
    {
      title: 'Urgent Attention',
      value: stats?.pendingOlderThan7Days ?? 0,
      icon: <IconAlertTriangle className="w-7 h-7" />,
      gradient: 'from-amber-500 via-orange-500 to-yellow-500',
      glowColor: 'rgba(245, 158, 11, 0.5)',
      description: 'Pending > 7 days',
      trend: '+5%',
      trendUp: true,
    },
  ];

  const quickActions = [
    {
      title: 'Review Pending',
      description: 'Process verification requests',
      icon: <IconClipboardList className="w-6 h-6" />,
      gradient: 'from-blue-500 to-cyan-500',
      count: stats?.totalPending ?? 0,
      onClick: () => router.push('/admin/dashboard/verifications'),
    },
    {
      title: 'View Analytics',
      description: 'Detailed insights & trends',
      icon: <IconChartBar className="w-6 h-6" />,
      gradient: 'from-purple-500 to-indigo-500',
      count: '94%',
      onClick: () => router.push('/admin/dashboard/analytics'),
    },
    {
      title: 'Manage Users',
      description: 'User administration',
      icon: <IconUsers className="w-6 h-6" />,
      gradient: 'from-pink-500 to-rose-500',
      count: '2.4K',
      onClick: () => router.push('/admin/dashboard/users'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-500/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-purple-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-cyan-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 max-w-6xl mx-auto p-4 sm:p-5 space-y-5">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur-lg opacity-30" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <IconZap className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-slate-800 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Super Admin Dashboard
                </h1>
                <p className="text-slate-600 text-sm mt-0.5">
                  Monitor and manage your platform with real-time insights
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={loadStats}
              disabled={refreshing}
              className="group relative px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-2">
                <IconRefreshCw className={`w-4 h-4 text-slate-600 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                <span className="font-semibold text-slate-700 text-sm">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </div>
            </button>

            <button className="group relative px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-2">
                <IconSettings className="w-4 h-4 text-white group-hover:rotate-90 transition-transform duration-500" />
                <span className="font-semibold text-white text-sm">Settings</span>
              </div>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => (
            <div
              key={card.title}
              className="group relative overflow-hidden rounded-2xl bg-white backdrop-blur-xl border border-slate-200 hover:border-slate-300 p-5 transition-all duration-500 hover:scale-[1.02] hover:shadow-xl"
              style={{ 
                animationDelay: `${index * 100}ms`,
                boxShadow: `0 0 40px -15px ${card.glowColor}`,
              }}
            >
              {/* Animated gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
              
              {/* Glow effect */}
              <div className={`absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br ${card.gradient} rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} rounded-xl blur-md opacity-30`} />
                    <div className={`relative p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                      <div className="text-white">{card.icon}</div>
                    </div>
                  </div>
                  
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${card.trendUp ? 'bg-emerald-100' : 'bg-rose-100'} border ${card.trendUp ? 'border-emerald-200' : 'border-rose-200'}`}>
                    <IconTrendingUp className={`w-3 h-3 ${card.trendUp ? 'text-emerald-600' : 'text-rose-600 rotate-180'}`} />
                    <span className={`text-xs font-bold ${card.trendUp ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {card.trend}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-4xl font-black text-slate-800 tracking-tight">{card.value}</p>
                  <h3 className="font-bold text-base text-slate-700">{card.title}</h3>
                  <p className="text-xs text-slate-500">{card.description}</p>
                </div>
                
                {/* Animated border effect */}
                <div className={`absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r ${card.gradient} group-hover:w-full transition-all duration-700 rounded-full`} />
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Quick Actions - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative overflow-hidden rounded-2xl bg-white backdrop-blur-xl border border-slate-200 p-6">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-3xl" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 mb-0.5">Quick Actions</h2>
                    <p className="text-slate-500 text-sm">Fast access to key features</p>
                  </div>
                  <IconZap className="w-6 h-6 text-blue-500" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {quickActions.map((action, index) => (
                    <button
                      key={action.title}
                      onClick={action.onClick}
                      className="group relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 p-5 text-left transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      style={{ animationDelay: `${index * 100 + 400}ms` }}
                    >
                      {/* Hover gradient overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                      
                      <div className="relative z-10">
                        <div className={`inline-flex p-2.5 rounded-lg bg-gradient-to-br ${action.gradient} shadow-md mb-3 group-hover:scale-110 transition-transform duration-300`}>
                          <div className="text-white">{action.icon}</div>
                        </div>
                        
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                              {action.title}
                            </h3>
                            <span className="text-xl font-black text-slate-400 group-hover:text-slate-700 transition-colors">
                              {action.count}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 group-hover:text-slate-600 transition-colors">
                            {action.description}
                          </p>
                        </div>
                        
                        {/* Animated arrow */}
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                          <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-md`}>
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="relative overflow-hidden rounded-2xl bg-white backdrop-blur-xl border border-slate-200 p-6">
              <div className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
              
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 shadow-md">
                    <IconActivity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-800">Performance Metrics</h3>
                    <p className="text-xs text-slate-500">Real-time system health</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="group relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 p-4 hover:border-emerald-300 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <p className="text-xs text-slate-500 mb-1.5">Processing Time</p>
                      <p className="text-2xl font-black text-slate-800 mb-0.5">2.3</p>
                      <p className="text-xs text-emerald-600 font-semibold">days avg</p>
                    </div>
                  </div>
                  
                  <div className="group relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 p-4 hover:border-blue-300 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <p className="text-xs text-slate-500 mb-1.5">Completion Rate</p>
                      <p className="text-2xl font-black text-slate-800 mb-0.5">94%</p>
                      <p className="text-xs text-blue-600 font-semibold">excellent</p>
                    </div>
                  </div>
                  
                  <div className="group relative overflow-hidden rounded-xl bg-slate-50 border border-slate-200 p-4 hover:border-purple-300 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <p className="text-xs text-slate-500 mb-1.5">SLA Compliance</p>
                      <p className="text-2xl font-black text-slate-800 mb-0.5">98%</p>
                      <p className="text-xs text-purple-600 font-semibold">on track</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Sidebar */}
          <div className="space-y-4">
            {/* Recent Activity */}
            <div className="relative overflow-hidden rounded-2xl bg-white backdrop-blur-xl border border-slate-200 p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-full blur-2xl" />
              
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 shadow-md">
                    <IconActivity className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-800">Recent Activity</h3>
                    <p className="text-xs text-slate-500">Last 24 hours</p>
                  </div>
                </div>
                
                <div className="space-y-2.5">
                  {[
                    { color: 'emerald', text: '5 companies verified', time: '2h ago', icon: <IconCheckCircle className="w-3.5 h-3.5" /> },
                    { color: 'amber', text: '3 pending requests', time: '4h ago', icon: <IconClock className="w-3.5 h-3.5" /> },
                    { color: 'blue', text: 'System updated', time: '1d ago', icon: <IconZap className="w-3.5 h-3.5" /> },
                    { color: 'purple', text: '12 new applications', time: '1d ago', icon: <IconBriefcase className="w-3.5 h-3.5" /> },
                    { color: 'rose', text: '2 issues resolved', time: '2d ago', icon: <IconXCircle className="w-3.5 h-3.5" /> },
                  ].map((activity, index) => (
                    <div
                      key={index}
                      className="group relative overflow-hidden rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 p-3 transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r from-${activity.color}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                      <div className="relative flex items-center gap-2.5">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-${activity.color}-100 flex items-center justify-center text-${activity.color}-600 group-hover:scale-110 transition-transform`}>
                          {activity.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{activity.text}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{activity.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="relative overflow-hidden rounded-2xl bg-white backdrop-blur-xl border border-slate-200 p-6">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-full blur-2xl" />
              
              <div className="relative">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 shadow-md">
                    <IconZap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-800">System Status</h3>
                    <p className="text-xs text-emerald-600 font-semibold">All systems operational</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {[
                    { label: 'API Response', value: '99.9%', status: 'good' },
                    { label: 'Database', value: 'Online', status: 'good' },
                    { label: 'Email Service', value: 'Active', status: 'good' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-xs text-slate-600">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">{item.value}</span>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}