import React from "react";

const SavedJobs = () => {
  const jobs = [
    {
      id: 1,
      title: "UI/UX Designer",
      company: "Upply",
      type: "Full Time",
      location: "New York",
      daysToApply: "3 day to apply",
      logo: "📱",
      bgColor: "bg-blue-500",
    },
    {
      id: 2,
      title: "Marketing Coordinator",
      company: "Lazada",
      type: "Part Time",
      location: "New York",
      daysToApply: "2 day to apply",
      logo: "🛒",
      bgColor: "bg-orange-500",
    },
    {
      id: 3,
      title: "Dog Trainer",
      company: "BMW",
      type: "Full Time",
      location: "New York",
      daysToApply: "3 day to apply",
      logo: "🚗",
      bgColor: "bg-gray-800",
    },
  ];

  return (
    <div className="bg-white w-full rounded-xl ">
      <div className="flex items-center justify-between p-6 pb-4">
        <h3 className="text-lg font-semibold text-gray-900">Save job</h3>
        <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
          View all →
        </button>
      </div>

      <div className="px-6 pb-6">
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
            >
              <div className="w-full flex  items-center space-x-4">
                <div
                  className={`w-8 h-10 md-w-12 md-h-12 rounded-lg ${job.bgColor} flex items-center justify-center text-white text-xl flex-shrink-0`}
                >
                  {job.logo}
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs md-text-base font-medium text-gray-900 mb-1">
                      {job.title}
                    </h4>
                    <span className="text-[8px] sm:text-sm text-red-600 font-medium">
                      {job.daysToApply}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-[10px] sm:text-sm text-gray-500">
                    <span className="font-medium ms-[0.5px]" >{job.company}</span>
                    <span className="hidden sm:block">•</span>
                    <span className="">{job.type}</span>
                    <span className="hidden sm:block">•</span>
                    <span className="">{job.location}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state (shows when no jobs saved) */}
        {jobs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">You have no saved jobs</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedJobs;
