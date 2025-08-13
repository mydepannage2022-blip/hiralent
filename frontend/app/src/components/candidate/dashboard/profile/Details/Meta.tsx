import Button from '@/app/src/components/layout/Button'
import React from 'react'

const Meta = () => {
  return (
    <div className='w-full flex justify-start items-center gap-4 p-3 ring ring-[#EDEDED] rounded-xl'>
      <div>
        <img src="/images/candidate.jpg" alt="User Profile" className='w-32 rounded-xl'/>
      </div>

      <div className='flex flex-col justify-center items-start gap-2'>
        <div className=''>
        <h3>Youssra Kalam Idrissi</h3>
        <p>Product Designer - Harvard Psychology</p>
        </div>
      
      <div className='flex justify-start gap-3'>
        <Button text="View Resume" variant="dark" animation={false}/>
        <Button text="Download PDF Resume" variant="light" animation={false}/>
      </div>
      </div>
    </div>
  )
}

export default Meta
