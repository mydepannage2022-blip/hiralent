"use client"
import dynamic from 'next/dynamic';

// Lazy load all heavy components
const DashboardJobStatistics = dynamic(() => 
  import("@/src/components/candidate/dashboard/home/analytics/DashboardJobStatistics"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-xl"></div>
});

const DashboardProfilePercentage = dynamic(() => 
  import("@/src/components/candidate/dashboard/home/analytics/DashboardProfilePercantage"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-xl"></div>
});

const DashboardStatus = dynamic(() => 
  import("@/src/components/candidate/dashboard/home/analytics/DashbordStatus"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-xl"></div>
});

const MessagesModule = dynamic(() => 
  import("@/src/components/candidate/dashboard/home/DashboardChatModule"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-80 rounded-xl"></div>
});

const SavedJobs = dynamic(() => 
  import("@/src/components/candidate/dashboard/home/SavedJobs"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-xl"></div>
});

export default function DashboardHome() {
  return (
    <div className='w-full flex justify-start items-start flex-col lg:flex-row gap-3'>
      <div className='w-full md:w-2/3 flex flex-col justify-start items-center gap-2'>
        <DashboardProfilePercentage />
        <DashboardJobStatistics />
        <DashboardStatus showOn="mobile"/>
        <SavedJobs />
      </div>
      <div className='w-full md:w-1/3 flex flex-col justify-start items-start gap-2'>
        <DashboardStatus showOn="desktop"/>
        <MessagesModule />
      </div>
    </div>
  );
}