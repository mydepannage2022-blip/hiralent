
import Meta from '@/src/components/candidate/dashboard/profile/Meta'
import { ResumeLink } from '@/src/components/candidate/dashboard/profile/resume-link/ResumeLink'
import { ResumeQuality } from '@/src/components/candidate/dashboard/profile/resume-quality/ResumeQuality'
import { ResumeUpload } from '@/src/components/candidate/dashboard/profile/resume-upload/ResumeUpload'
import React from 'react'

const page = () => {
  return (
    <div className='w-full flex justify-start items-start gap-3'>
    <div className='w-2/3 bg-white rounded-xl flex flex-col justify-start items-center gap-4 p-3'>
    <Meta />
      </div>
      <div className='w-1/3 flex flex-col justify-start items-start gap-2'>
       <ResumeQuality />
       <ResumeUpload 
        uploadType="application_specific"
      />
       <ResumeLink />
      </div>
    </div>
  )
}

export default page
