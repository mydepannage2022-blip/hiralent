import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface ChartDataItem {
  day: string;
  views: number;
  applied: number;
}

const DashboardJobStatistics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'Week' | 'Month' | 'Year'>('Week');

  // Sample data for the line chart
  const chartData: ChartDataItem[] = [
    { day: 'Sun', views: 1000, applied: 800 },
    { day: 'Mon', views: 1500, applied: 1200 },
    { day: 'Tue', views: 2200, applied: 1800 },
    { day: 'Wed', views: 2800, applied: 2300 },
    { day: 'Thu', views: 4200, applied: 3800 },
    { day: 'Fri', views: 4800, applied: 4300 },
    { day: 'Sat', views: 5000, applied: 4500 }
  ];

  const periods: ('Week' | 'Month' | 'Year')[] = ['Week', 'Month', 'Year'];

  return (
    <div className="bg-white w-full rounded-xl p-6" > {/* Add inline style */}
      <div className="flex items-start justify-between flex-col mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Job statistics</h3>
          <p className="text-sm text-gray-500 mb-2">Showing Jobstatistic Jul 19-25</p>
        </div>
        <div className="flex space-x-2">
          {periods.map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${selectedPeriod === period
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics Section */}
      <div className="flex justify-start items-center flex-col gap-6 ">
        <h4 className="text-base font-medium text-gray-900">Statistics</h4>
        <div className="flex flex gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-sm text-gray-600">Job views</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <span className="text-sm text-gray-600">Job Applied</span>
          </div>
        </div>
      </div>
      <div className="w-full">
        {/* Chart Section */}
        <div className="w-full flex justify-between items-start flex-col" > {/* Remove z-[1] class, add inline style */}
          <div className="w-full md-w-4/5 h-64" > {/* Add inline style */}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="applied"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ fill: '#60a5fa', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#60a5fa', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-4 justify-center items-start">
            <div className="w-full text-center flex flex-col ring ring-[#EDEDED] rounded-xl p-2">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-sm text-gray-600">Job views</span>
              </div>
              <div className=" text-3xl font-bold text-gray-900 mb-1">2,342</div>
              <div className="flex items-center justify-center space-x-1">
                <span className="text-sm text-gray-500">This week</span>
                <span className="text-sm font-medium text-green-600">6.4%</span>
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <div className="w-full text-center flex flex-col ring ring-[#EDEDED] rounded-xl p-2">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-sm text-gray-600">Job views</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">654</div>
              <div className="flex items-center justify-center space-x-1">
                <span className="text-sm text-gray-500">This week</span>
                <span className="text-sm font-medium text-green-600">6.4%</span>
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardJobStatistics;