import React from 'react'
import DashboardSidebar from '../DashboardSidebar'
import DashboardNavbar from '../DashboardNavbar'

const DashboardHome = () => {
  return (
    <div className='flex '>

      <div className='flex justify-start items-center p-8'>
      <DashboardSidebar/>
      </div>
      
      <div className="flex flex-col justify-center items-center p-4 h-screen">
        <DashboardNavbar/>
      </div>

    </div>
  )
}

export default DashboardHome
