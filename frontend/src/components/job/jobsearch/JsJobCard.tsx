import React from 'react';
import Image from 'next/image';
import { MapPin } from 'lucide-react';

interface JobCardProps {
  logo: string;
  company: string;
  title: string;
  types: string[];
  location: string;
  salary: string;
  postedTime: string;
}

const JobCard: React.FC<JobCardProps> = ({ logo, company, title, types, location, salary, postedTime }) => {
  return (
    <div className="bg-white rounded-lg border border-[#EDEDED] p-4 sm:p-6 flex items-start gap-3">
      <div>
        <Image src={logo} alt={`${company} logo`} width={70} height={70} className="border border-[#EDEDED] rounded-lg" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-[#A5A5A5]">{company}</div>
        <div className="text-lg font-semibold text-[#222222] mb-2">{title}</div>
        <div className="flex space-x-2 mb-2">
          {types.map((type, index) => (
            <span key={index} className="text-[#005DDC] bg-[#EFF5FF] px-2 rounded-sm text-sm">
              {type}
            </span>
          ))}
        </div>
        <div className="text-sm text-gray-500 mb-2 flex items-center gap-1">
          <MapPin className="w-4 h-4 text-[#353535]" />
          <span className="text-[#353535]">{location}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="text-xs sm:text-base text-[#005DDC] font-medium">{salary}</div>
          <div className="text-xs text-[#757575]">{postedTime}</div>
        </div>
      </div>
    </div>
  );
};

export default JobCard;