"use client";

import dynamic from "next/dynamic";

// Real, backend-backed widgets (shared with the dashboard home). No mock data.
const DashboardProfilePercentage = dynamic(
  () =>
    import(
      "@/src/components/candidate/dashboard/home/analytics/DashboardProfilePercantage"
    ),
  { loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-xl" /> }
);

const ApplicationStats = dynamic(
  () =>
    import(
      "@/src/components/candidate/dashboard/home/analytics/ApplicationStats"
    ),
  { loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-xl" /> }
);

const RecentApplications = dynamic(
  () =>
    import(
      "@/src/components/candidate/dashboard/home/analytics/RecentApplications"
    ),
  { loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-xl" /> }
);

export default function CandidateAnalyticsPage() {
  return (
    <div className="w-full flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Analytics</h1>
        <p className="text-sm text-gray-500">
          Your profile strength and application activity at a glance.
        </p>
      </div>

      <div className="w-full flex flex-col lg:flex-row justify-start items-start gap-3">
        <div className="w-full lg:w-2/3 flex flex-col justify-start items-stretch gap-3">
          <DashboardProfilePercentage />
          <RecentApplications />
        </div>
        <div className="w-full lg:w-1/3 flex flex-col justify-start items-stretch gap-3">
          <ApplicationStats />
        </div>
      </div>
    </div>
  );
}
