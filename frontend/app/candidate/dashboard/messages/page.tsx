"use client"
import dynamic from 'next/dynamic';
import React from 'react'

// Lazy load message components
const MessageProfile = dynamic(() => import('@/src/components/candidate/message/MessageProfile'), {
  loading: () => <div className="animate-pulse bg-gray-200 w-80 h-full rounded-xl"></div>
});

const UserChats = dynamic(() => import('@/src/components/candidate/message/UserChats'), {
  loading: () => <div className="animate-pulse bg-gray-200 flex-1 h-96 rounded-xl"></div>
});

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