import React from 'react'

const DashboardNavbar = () => {
  return (
    <div className='w-full flex justify-center items-center text-[#282828]'>
      <div>
        <h3 className='font-bold text-xl lg:text-2xl '>Dashboard</h3>
        <p className='font-light text'>Updating your information will offer you the most relevent content</p>
      </div>

      <div>
        <form action="">
          <input type="text" name="Search" id="" />

        </form>
      </div>
    </div>
  )
}

export default DashboardNavbar
