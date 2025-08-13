import Meta from '@/app/src/components/candidate/dashboard/profile/Details/Meta'
import PersonalInformation from '@/app/src/components/candidate/dashboard/profile/Details/PersonalInformation'
import PreferredJobBenefits from '@/app/src/components/candidate/dashboard/profile/Details/PreferredJobBenefits'
import ProffessionalSkills from '@/app/src/components/candidate/dashboard/profile/Details/ProffessionalSkills'
import WorkExperience from '@/app/src/components/candidate/dashboard/profile/Details/WorkExperience'
import ResumeQuality from '@/app/src/components/candidate/dashboard/profile/ResumeQuality'
import UploadYourResume from '@/app/src/components/candidate/dashboard/profile/UploadYourResume'
import React from 'react'

const page = () => {
  return (
    <div className='w-full flex justify-start items-start gap-3'>
    <div className='w-2/3 flex flex-col justify-start items-center gap-2'>
       <Meta />
       <PersonalInformation />
       <PreferredJobBenefits />
       <ProffessionalSkills />
       <WorkExperience />
      </div>
      <div className='w-1/3 flex flex-col justify-start items-start gap-2'>
       <ResumeQuality />
       <UploadYourResume />
       <UploadYourResume />
      </div>
    </div>
  )
}

export default page
