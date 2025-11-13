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

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const token = localStorage.getItem('sessionToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

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
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-6">
          <div className="h-9 w-1/3 rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Pending',
      value: stats?.totalPending ?? 0,
      icon: <IconClock className="w-8 h-8" />,
      accent: 'from-blue-50 to-blue-100 text-[#1B73E8]',
      ring: 'ring-[#1B73E8]/20',
    },
    {
      title: 'Verified',
      value: stats?.totalVerified ?? 0,
      icon: <IconCheckCircle className="w-8 h-8" />,
      accent: 'from-emerald-50 to-emerald-100 text-emerald-600',
      ring: 'ring-emerald-200',
    },
    {
      title: 'Rejected',
      value: stats?.totalRejected ?? 0,
      icon: <IconXCircle className="w-8 h-8" />,
      accent: 'from-rose-50 to-rose-100 text-rose-600',
      ring: 'ring-rose-200',
    },
    {
      title: 'Urgent (>7 days)',
      value: stats?.pendingOlderThan7Days ?? 0,
      icon: <IconAlertTriangle className="w-8 h-8" />,
      accent: 'from-amber-50 to-amber-100 text-amber-600',
      ring: 'ring-amber-200',
    },
  ];

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
          Dashboard Overview
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Monitor and manage company verifications
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <div
            key={card.title}
            className={`group relative overflow-hidden rounded-xl bg-white border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200 ring-1 ${card.ring}`}
          >
            <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.accent}`} />
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-lg bg-gradient-to-br ${card.accent}`}>
                <span className="text-current">{card.icon}</span>
              </div>
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-600">{card.title}</h3>
            <p className="mt-1 text-3xl md:text-4xl font-semibold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/admin/dashboard/verifications')}
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-[#1B73E8] hover:bg-[#1B73E8]/5 transition"
          >
            <span className="text-[#1B73E8]">
              <IconClipboardList className="w-6 h-6" />
            </span>
            <div className="text-left">
              <p className="font-medium text-slate-900">Review Pending</p>
              <p className="text-xs text-slate-600">Process verifications</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/dashboard/analytics')}
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-[#1B73E8] hover:bg-[#1B73E8]/5 transition"
          >
            <span className="text-[#1B73E8]">
              <IconChartBar className="w-6 h-6" />
            </span>
            <div className="text-left">
              <p className="font-medium text-slate-900">View Analytics</p>
              <p className="text-xs text-slate-600">Check trends</p>
            </div>
          </button>

          <button
            onClick={loadStats}
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-[#1B73E8] hover:bg-[#1B73E8]/5 transition"
          >
            <span className="text-[#1B73E8]">
              <IconRefreshCw className="w-6 h-6" />
            </span>
            <div className="text-left">
              <p className="font-medium text-slate-900">Refresh Data</p>
              <p className="text-xs text-slate-600">Update statistics</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
