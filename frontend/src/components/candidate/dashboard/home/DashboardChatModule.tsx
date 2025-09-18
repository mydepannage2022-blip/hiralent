import React from 'react';

const MessagesModule = () => {
  const messages = [
    {
      id: 1,
      company: 'Pepsi',
      message: 'Join our team and make an impact! We\'re lo...',
      time: '15 minutes ago',
      logo: '🥤',
      bgColor: 'bg-red-500',
      hasNotification: true
    },
    {
      id: 2,
      company: 'Golddex',
      message: 'Exciting career opportunities await! We\'re hi...',
      time: '15 minutes ago',
      logo: '💰',
      bgColor: 'bg-yellow-500',
      hasNotification: true
    },
    {
      id: 3,
      company: 'McDonald',
      message: 'We\'re looking for dynamic individuals to join our...',
      time: '15 minutes ago',
      logo: '🍟',
      bgColor: 'bg-red-600',
      hasNotification: false
    },
    {
      id: 4,
      company: 'NASA',
      message: 'Are you ready to take your career to the next lev...',
      time: '15 minutes ago',
      logo: '🚀',
      bgColor: 'bg-blue-600',
      hasNotification: false
    },
    {
      id: 5,
      company: 'Panda',
      message: 'We\'re expanding and looking for driven, pas...',
      time: '15 minutes ago',
      logo: '🐼',
      bgColor: 'bg-green-600',
      hasNotification: true
    },
    {
      id: 6,
      company: 'BMW',
      message: 'Are you a self-starter with a passion for success...',
      time: '15 minutes ago',
      logo: '🚗',
      bgColor: 'bg-gray-800',
      hasNotification: false
    }
  ];
  return  (
    <div className="bg-white w-full rounded-xl hidden md:block">
      <div className="flex items-center justify-between p-6 pb-4">
        <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
        <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
          More →
        </button>
      </div>
      
      <div className="px-6 pb-6">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex items-start space-x-3 hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full ${message.bgColor} flex items-center justify-center text-white text-lg flex-shrink-0`}>
                  {message.logo}
                </div>
                {message.hasNotification && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {message.company}
                  </h4>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    {message.time}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {message.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MessagesModule;