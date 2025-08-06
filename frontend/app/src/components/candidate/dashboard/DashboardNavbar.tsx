  import React from 'react'
  import { CiSearch } from 'react-icons/ci';
  import { IoIosNotificationsOutline } from "react-icons/io";
  import { MdVerified, MdWarning } from "react-icons/md";
  import { useAuth } from '../../../context/AuthContext';
  import { useRouter } from 'next/navigation';
import Link from 'next/link';

  const DashboardNavbar = () => {
    const { user } = useAuth();
    const router = useRouter();

    const handleVerifyEmail = () => {
      router.push('/auth/verify-email');
    };

    // Get profile picture from user profile
    const getProfileImage = () => {
      if (user?.profile?.profile_picture_url) {
        return user.profile.profile_picture_url;
      }
      return "/images/candidate.jpg";
    };
    return (
      <div className='w-full flex justify-start items-center text-[#282828]'>
        <div className='lg:w-1/3 xl:w-1/2'>
          <h3 className='font-bold text-xl lg:text-xl xl:text-2xl '>Dashboard</h3>
          <p className='font-light text-xs xl:text-sm text-[#515151]'>Updating your information will offer you the most relevent content</p>
        </div>

        <div className='lg:w-2/3 xl:w-1/2 flex items-center justify-end gap-8'>
          <form action="" className='flex justify-between items-center bg-white p-3 rounded-lg w-2/3'>
            <input type="text" name="Search" id="" placeholder='Search' className='outline-none text-base w-full'/>
            <CiSearch  className='text-2xl'/>
          </form>

          <IoIosNotificationsOutline  className='lg:text-4xl xl:text-2xl'/>
          
          <div className='flex justify-center items-center gap-2'>
            {/* <Link href="/candidate/dashboard/profile" className='w-full w-10 h-10'> */}
            <img 
              src={getProfileImage()} 
              alt="User Image" 
              className="w-10 h-10 rounded-full object-cover"
            />
            {/* </Link> */}
            <div className='lg:hidden xl:flex flex-col justify-center items-start'>
              <div className='flex items-center gap-2'>
                <h3 className='text-[#222] text-base '>
                  {user?.full_name || 'Guest User'}  
                </h3>
              </div>
              
              <span className='text-sm text-[#A5A5A5]'>
                {user?.email || 'No email available'}  {/* ✅ Use email */}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  export default DashboardNavbar