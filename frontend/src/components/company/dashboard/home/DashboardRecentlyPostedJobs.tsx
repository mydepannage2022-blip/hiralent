"use client";

import React from "react";

import {
    Users,
    DollarSign,
    ChevronRight,
    EllipsisVertical,
} from "lucide-react";

const jobs = [
    {
        title: "UI/UX Designer",
        type: "Full Time",
        days: 27,
        status: "Active",
        applications: 798,
        salary: "11$ - 22$",
    },
    {
        title: "UI/UX Designer",
        type: "Full Time",
        days: 27,
        status: "Active",
        applications: 798,
        salary: "11$ - 22$",
    },
    {
        title: "UI/UX Designer",
        type: "Full Time",
        days: 27,
        status: "Active",
        applications: 798,
        salary: "11$ - 22$",
    },
];

const DashboardRecentlyPostedJobs = () => {
    return (
        <div className="bg-white rounded-xl p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-base sm:text-xl font-semibold text-[#222222]">
                    Recently Posted Jobs
                </h3>
                <button className="text-xs sm:text-base font-medium text-[#222222] flex items-center gap-1 sm:gap-4">
                    View All <span><ChevronRight size={16} /></span>
                </button>
            </div>

            {/* Scrollable Table Wrapper */}
            <div className="overflow-x-auto">
                <div className="min-w-[800px]"> {/* ensures scroll on small screens */}
                    {/* Table Header */}
                    <div className="grid grid-cols-5 bg-[#F4F4F4] text-[#515151] px-3 py-2 mb-4 rounded-xl">
                        <div>Jobs</div>
                        <div>Status</div>
                        <div>Applications</div>
                        <div>Salary</div>
                        <div>Actions</div>
                    </div>

                    {/* Table Rows */}
                    {jobs.map((job, idx) => (
                        <div
                            key={idx}
                            className="grid grid-cols-5 items-center px-3 py-3 border-b border-[#EDEDED] text-sm text-gray-700"
                        >
                            {/* Job Info */}
                            <div>
                                <h4 className="font-medium text-[#222222] mb-1">{job.title}</h4>
                                <p className="text-[#757575] text-xs">
                                    {job.type} • {job.days} days remaining
                                </p>
                            </div>

                            {/* Status */}
                            <div>
                                <span className="text-[#009E00] border border-[#009E00] px-3 py-0.5 rounded">
                                    {job.status}
                                </span>
                            </div>

                            {/* Applications */}
                            <div className="flex items-center gap-1 text-[#222222]">
                                <Users className="w-4 h-4" />
                                {job.applications} Applications
                            </div>

                            {/* Salary */}
                            <div className="flex items-center gap-1 text-[#222222]">
                                <div className="border border-[#222222] rounded-full p-1">
                                    <DollarSign className="w-3 h-3" />
                                </div>
                                {job.salary}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 justify-between">
                                <button className="border border-[#282828] text-[#282828] px-2 py-1 rounded-md hover:bg-gray-50 font-semibold text-sm">
                                    View Applications
                                </button>
                                <EllipsisVertical className="w-5 h-5 text-[#222222] cursor-pointer" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default DashboardRecentlyPostedJobs;