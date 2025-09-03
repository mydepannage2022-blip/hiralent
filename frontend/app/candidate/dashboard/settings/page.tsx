"use client"
import DeleteAccount from "@/src/components/candidate/dashboard/settings/DeleteAccount"
import DevicesAccount from "@/src/components/candidate/dashboard/settings/DevicesAccount"
import NotificationAccount from "@/src/components/candidate/dashboard/settings/NotificationAccount"
import QuestionAccount from "@/src/components/candidate/dashboard/settings/QuestionAccount"
import SecurityAccount from "@/src/components/candidate/dashboard/settings/SecurityAccount"
import SettingsAccount from "@/src/components/candidate/dashboard/settings/SettingsAccount"
import SettingsFullname from "@/src/components/candidate/dashboard/settings/SettingsFullname"

const AccountSettings = () => {
  return (
    <div className='w-full flex justify-start items-start md:flex-row flex-col gap-3'>
      <div className='w-full md:w-2/3 flex flex-col justify-start gap-2 p-3  md:p-5 rounded-xl shadow-sm bg-white'>
        <SettingsFullname />
        <SettingsAccount />
        <SecurityAccount />
        <NotificationAccount />
        <DeleteAccount />
      </div>
      <div className='w-full md:w-1/3 flex flex-col justify-start items-start gap-2 '>
        <DevicesAccount />
        <QuestionAccount />
      </div>
    </div>
  )
}

export default AccountSettings
