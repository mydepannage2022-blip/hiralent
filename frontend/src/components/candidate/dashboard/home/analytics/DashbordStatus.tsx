import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DataItem {
  label: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface DashboardStatusProps {
  showOn?: "mobile" | "desktop" | "all"; // props type
}

const DashboardStatus: React.FC<DashboardStatusProps> = ({ showOn = "all" }) => {
  // Tailwind classes decide karna
  let visibilityClass = "";
  if (showOn === "mobile") {
    visibilityClass = "block md:hidden"; // sirf mobile
  } else if (showOn === "desktop") {
    visibilityClass = "hidden md:block"; // sirf desktop
  } else {
    visibilityClass = "block"; // default (hamesha show)
  }

  const data: DataItem[] = [
    { label: 'Under Review ', value: 8, color: '#1e40af' },
    { label: 'Accepted ', value: 4, color: '#60a5fa' },
    { label: 'Rejected ', value: 3, color: '#e5e7eb' }
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const renderCenterLabel = () => {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-base font-bold text-gray-900">{total}</span>
        <span className="text-[10px] text-gray-500">Total job</span>
      </div>
    );
  };

  return (
    <div className={`bg-white w-full rounded-xl p-6 ${visibilityClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="lg:text-sm xl:text-lg font-semibold text-gray-900">Status of apply</h3>
        <span className="lg:text-xs xl:text-sm text-gray-500">January 2025</span>
      </div>
      
      {/* Chart + Legend */}
      <div className="flex justify-start items-center">
        <div className="flex items-center justify-center">
          <div className="relative w-30 h-30">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={50}
                  startAngle={-90}
                  endAngle={270}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {renderCenterLabel()}
          </div>
        </div>
        
        {/* Legend */}
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-xs text-gray-700 pr-1">{item.label}</span>
              </div>
              <span className="text-xs font-medium text-gray-900">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-100">
        <p className="lg:text-[10px] xl:text-sm text-gray-500 leading-relaxed">
          Minim dolor in amet nulla laboris enim dolore consequat.
        </p>
      </div>
    </div>
  );
};

export default DashboardStatus;
