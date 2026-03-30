"use client"
import dynamic from 'next/dynamic';
import ChatbotButton from "@/src/components/candidate/dashboard/chatbot/ChatbotButton";

const DashboardProfilePercentage = dynamic(() =>
  import("@/src/components/candidate/dashboard/home/analytics/DashboardProfilePercantage"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-xl"></div>
});

const RecentApplications = dynamic(() =>
  import("@/src/components/candidate/dashboard/home/analytics/RecentApplications"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-xl"></div>
});

const ApplicationStats = dynamic(() =>
  import("@/src/components/candidate/dashboard/home/analytics/ApplicationStats"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-xl"></div>
});

const QuickActions = dynamic(() =>
  import("@/src/components/candidate/dashboard/home/QuickActions"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-xl"></div>
});

export default function DashboardHome() {
  return (
    <div className='w-full flex justify-start items-start flex-col lg:flex-row gap-3 bg-gray-50'>
      <div className='w-full md:w-2/3 flex flex-col justify-start items-center gap-2 bg-gray-50'>
        <DashboardProfilePercentage />
        <RecentApplications />
        <ApplicationStats showOn="mobile"/>
      </div>
      <div className='w-full md:w-1/3 flex flex-col justify-start items-start gap-2'>
        <ApplicationStats showOn="desktop"/>
        <QuickActions />
        <ChatbotButton />
      </div>
    </div>
  );
}
