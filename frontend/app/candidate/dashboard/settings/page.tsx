"use client"
import NotificationAccount from "@/src/components/candidate/dashboard/settings/NotificationAccount"
import SecurityAccount from "@/src/components/candidate/dashboard/settings/SecurityAccount"
import SettingsAccount from "@/src/components/candidate/dashboard/settings/SettingsAccount"
import SettingsFullname from "@/src/components/candidate/dashboard/settings/SettingsFullname"

const AccountSettings = () => {
  return (
    <div className='w-full flex justify-start items-start md:flex-row flex-col gap-3'>
      <div className='w-full md:w-2/3 flex flex-col justify-start gap-2'>
        <SettingsFullname />
        <SettingsAccount />
        <SecurityAccount />
        <NotificationAccount />
      </div>
      <div className='w-full md:w-1/3 flex flex-col justify-start items-start gap-2'>
        <h1>hellow</h1>
      </div>
    </div>
  )
}

export default AccountSettings
