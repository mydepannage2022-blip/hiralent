import React from 'react'
import { CiSearch } from 'react-icons/ci';
import { IoIosNotificationsOutline } from "react-icons/io";
import { useAuth } from '../../../context/AuthContext'; // Adjust path according to your file structure

const DashboardNavbar = () => {
  const { user } = useAuth();

  return (
    <div className='w-full flex justify-center items-center text-[#282828]'>
      <div className='w-1/2'>
        <h3 className='font-bold text-xl lg:text-2xl '>Dashboard</h3>
        <p className='font-light text-sm text-[#515151]'>Updating your information will offer you the most relevent content</p>
      </div>

      <div className='w-1/2 flex items-center justify-end gap-8'>
        <form action="" className='flex justify-between items-center bg-white p-3 rounded-lg w-2/3'>
          <input type="text" name="Search" id="" placeholder='Search' className='outline-none text-base w-full'/>
          
          <CiSearch  className='text-2xl'/>
        </form>

        <IoIosNotificationsOutline  className='text-2xl '/>
        
        <div className='flex jutisy-center items-center gap-2'>
          <img 
            src={user?.profileImage || "/images/candidate.png"} 
            alt="User Image" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className='flex flex-col justify-center items-start'>
            <h3 className='text-[#222] text-base '>
              {user?.full_name || user?.name || 'Guest User'}
            </h3>
            <span className='text-sm text-[#A5A5A5]'>
              {user?.email || 'No email available'}
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}

export default DashboardNavbar