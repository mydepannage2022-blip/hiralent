import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  User, 
  Bell, 
  MessageSquare, 
  Settings, 
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

const DashboardSidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeItem, setActiveItem] = useState('Dashboard');

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Profile', icon: User, href: '/profile' },
    { name: 'Notifications', icon: Bell, href: '/notifications' },
    { name: 'Messages', icon: MessageSquare, href: '/messages' },
    { name: 'Settings', icon: Settings, href: '/settings' },
    { name: 'Analytics', icon: Activity, href: '/analytics' }
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${isOpen ? 'w-64' : 'w-20'} flex flex-col bg-white shadow-lg transition-all duration-300 ease-in-out`}>
  
        <div className='w-full flex-1'>

               {/* Header with Company Logo */}
        <div className="flex flex-row-reverse items-center justify-between py-4 px-4 border-b border-gray-200 relative">
          <div className={`flex flex-col items-center ${isOpen ? 'space-x-3' : 'justify-center hidden'}`}>
            <div className="rounded-lg flex items-center justify-center">
              <img src="/images/logo.png" alt="" />
            </div>
            {isOpen && (
              <div>
                <p className="text-sm text-gray-500">Dashboard</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`${isOpen ? 'absolute right-1 bottom-[-15%] p-2 rounded-lg bg-gray-100 transition-colors text-[#353535]' : 'w-full flex justify-center p-2 rounded-lg bg-gray-100 transition-colors text-[#353535]'} `}
          >
            {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-6 text-black">
          <ul className="space-y-2 px-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <button
                    onClick={() => setActiveItem(item.name)}
                    className={`w-full flex items-center ${
                      isOpen ? 'px-4 py-3 space-x-3' : 'px-3 py-3 justify-center'
                    } rounded-lg transition-all duration-200 ${
                      activeItem === item.name
                        ? 'bg-[#EDEDED] '
                        : 'text-[#353535] hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={22} className="flex-shrink-0 text-[#353535]" />
                    {isOpen && (
                      <span className="font-medium">{item.name}</span>
                    )}
                  </button>
                  {!isOpen && activeItem === item.name && (
                    <div className="hidden absolute left-20 bg-gray-800 text-white px-2 py-1 rounded text-sm whitespace-nowrap z-10">
                      {item.name}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
   </div>

        {/* Logout Button - Bottom of Sidebar */}
        <div className='w-full p-4 border-t border-gray-200'>
          <button className={`w-full flex items-center ${
            isOpen ? 'px-4 py-3 space-x-3 justify-start' : 'px-3 py-3 justify-center'
          } rounded-lg transition-all duration-200 hover:bg-gray-50`}>
            <LogOut size={22} className='flex-shrink-0 text-red-600' /> 
            {isOpen && <span className='text-red-600 text-sm lg:text-base font-medium'>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {activeItem}
          </h2>
          <div className="text-gray-600">
            <p>Welcome to the {activeItem.toLowerCase()} section!</p>
            <p className="mt-2">
              This is where the content for <strong>{activeItem}</strong> will be displayed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSidebar;