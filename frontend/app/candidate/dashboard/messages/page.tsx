import MessageProfile from '@/src/components/candidate/message/MessageProfile'
import UserChats from '@/src/components/candidate/message/UserChats'
import React from 'react'

const page = () => {
  return (
    <div className='w-full h-full flex justify-start items-start gap-3 border-t border-b rounded-lg bg-white'>
      <div className='flex flex-col justify-start items-center gap-4'>
        <MessageProfile />
      </div>
      <div className='flex-1 flex flex-col justify-start items-start gap-4'>
        <UserChats />
      </div>
    </div>  
  )
}

export default page
