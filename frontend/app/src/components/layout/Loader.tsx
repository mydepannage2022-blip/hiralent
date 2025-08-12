import React from 'react';

const Loader = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden">
      {/* Floating elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-[#005DDC]/5 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-[#005DDC]/3 rounded-full blur-xl animate-pulse delay-1000"></div>
      
      <div className="flex flex-col items-center space-y-8 z-10">
        {/* Company Logo */}
        <div className="animate-pulse">
          <img 
            src={process.env.LOGO_PATH} 
            alt="Company Logo" 
            className="w-32 lg:w-48 xl:w-56 h-auto object-contain"
          />
        </div>

        {/* Animated Dots with Color Wave */}
        <div className="flex justify-center space-x-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full animate-bounce"
              style={{ 
                animationDelay: `${i * 0.2}s`,
                animation: `bounce 1s infinite ${i * 0.2}s, colorWave 2s infinite ${i * 0.3}s`
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes colorWave {
          0% { background-color: #005DDC; }
          25% { background-color: #ffffff; }
          50% { background-color: #005DDC; }
          75% { background-color: #ffffff; }
          100% { background-color: #005DDC; }
        }
      `}</style>
      </div>

  );
};

export default Loader;