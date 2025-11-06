"use client"
import dynamic from 'next/dynamic';

// Lazy load all settings components
const DeleteAccount = dynamic(() => import("@/src/components/candidate/dashboard/settings/DeleteAccount"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded-xl mb-2"></div>
});

const DevicesAccount = dynamic(() => import("@/src/components/candidate/dashboard/settings/DevicesAccount"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-xl mb-2"></div>
});

const NotificationAccount = dynamic(() => import("@/src/components/candidate/dashboard/settings/NotificationAccount"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-56 rounded-xl mb-2"></div>
});

const QuestionAccount = dynamic(() => import("@/src/components/candidate/dashboard/settings/QuestionAccount"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-40 rounded-xl mb-2"></div>
});

const SecurityAccount = dynamic(() => import("@/src/components/candidate/dashboard/settings/SecurityAccount"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded-xl mb-2"></div>
});

const SettingsAccount = dynamic(() => import("@/src/components/candidate/dashboard/settings/SettingsAccount"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-xl mb-2"></div>
});

const SettingsFullname = dynamic(() => import("@/src/components/candidate/dashboard/settings/SettingsFullname"), {
  loading: () => <div className="animate-pulse bg-gray-200 h-24 rounded-xl mb-2"></div>
});

const AccountSettings = () => {
  return (
    <div className='w-full flex justify-start items-start md:flex-row flex-col gap-3'>
      <div className='w-full md:w-2/3 flex flex-col justify-start gap-2 p-3 md:p-5 rounded-xl shadow-sm bg-white'>
        <SettingsAccount />
        <SecurityAccount />
        <NotificationAccount />
        <DeleteAccount />
      </div>
      <div className='w-full md:w-1/3 flex flex-col justify-start items-start gap-2'>
        <DevicesAccount />
        <QuestionAccount />
      </div>
    </div>
  )
}

export default AccountSettings