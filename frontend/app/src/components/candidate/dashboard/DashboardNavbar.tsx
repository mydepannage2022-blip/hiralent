  import React from 'react'
  import { CiSearch } from 'react-icons/ci';
  import { IoIosNotificationsOutline } from "react-icons/io";
  import { MdVerified, MdWarning } from "react-icons/md";
  import { useAuth } from '../../../context/AuthContext';
  import { useRouter } from 'next/navigation';

  // const DashboardNavbar = () => {
  //   const { user } = useAuth();
  //   const router = useRouter();

  //   const handleVerifyEmail = () => {
  //     router.push('/auth/verify-email');
  //   };

  //   return (
  //     <div className='w-full flex justify-center items-center text-[#282828]'>
  //       <div className='w-1/2'>
  //         <h3 className='font-bold text-xl lg:text-2xl '>Dashboard</h3>
  //         <p className='font-light text-sm text-[#515151]'>Updating your information will offer you the most relevent content</p>
  //       </div>

  //       <div className='w-1/2 flex items-center justify-end gap-8'>
  //         <form action="" className='flex justify-between items-center bg-white p-3 rounded-lg w-2/3'>
  //           <input type="text" name="Search" id="" placeholder='Search' className='outline-none text-base w-full'/>
            
  //           <CiSearch  className='text-2xl'/>
  //         </form>

  //         <IoIosNotificationsOutline  className='text-2xl '/>
          
  //         <div className='flex justify-center items-center gap-2'>
  //           <img 
  //             src={user?.profileImage || "/images/candidate.png"} 
  //             alt="User Image" 
  //             className="w-10 h-10 rounded-full object-cover"
  //           />
  //           <div className='flex flex-col justify-center items-start'>
  //             <div className='flex items-center gap-2'>
  //               <h3 className='text-[#222] text-base '>
  //                 {user?.full_name || user?.name || 'Guest User'}
  //               </h3>
                
  //               {/* Email Verification Status */}
  //               {user?.is_email_verified ? (
  //                 <div className='flex items-center gap-1'>
  //                   <MdVerified className='text-green-500 text-sm' />
  //                 </div>
  //               ) : (
  //                 <div className='flex items-center gap-1'>
  //                   <MdWarning className='text-yellow-500 text-sm' />
  //                   <button 
  //                     onClick={handleVerifyEmail}
  //                     className='text-xs text-yellow-600 font-medium hover:text-yellow-700 hover:underline cursor-pointer'
  //                   >
  //                     Verify Email
  //                   </button>
  //                 </div>
  //               )}
  //             </div>
              
  //             <span className='text-sm text-[#A5A5A5]'>
  //               {user?.email || 'No email available'}
  //             </span>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }
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
      return "/images/candidate.png";
    };

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
          
          <div className='flex justify-center items-center gap-2'>
            <img 
              src={getProfileImage()} 
              alt="User Image" 
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className='flex flex-col justify-center items-start'>
              <div className='flex items-center gap-2'>
                <h3 className='text-[#222] text-base '>
                  {user?.full_name || 'Guest User'}  {/* ✅ Use full_name */}
                </h3>
                
                {/* Note: is_email_verified not in login response, so removed verification status */}
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