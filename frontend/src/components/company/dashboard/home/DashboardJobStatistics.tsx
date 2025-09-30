"use client";

import React, { useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";
import {
    Eye,
    ChevronUp,
    ChevronDown,
    FolderOpen,
    FileSearch2,
} from "lucide-react";

interface ChartDataItem {
    day: string;
    views: number;
    applied: number;
    opened: number;
}

const DashboardJobStatistics = () => {
    const [selectedPeriod, setSelectedPeriod] = useState<"Week" | "Month" | "Year">("Week");

    const chartData: ChartDataItem[] = [
        { day: "Sun", views: 1000, applied: 800, opened: 500 },
        { day: "Mon", views: 1500, applied: 1200, opened: 700 },
        { day: "Tue", views: 2200, applied: 1800, opened: 1100 },
        { day: "Wed", views: 2800, applied: 2300, opened: 1400 },
        { day: "Thu", views: 4200, applied: 3800, opened: 2000 },
        { day: "Fri", views: 4800, applied: 4300, opened: 2500 },
        { day: "Sat", views: 5000, applied: 4500, opened: 2800 },
    ];

    const periods: ("Week" | "Month" | "Year")[] = ["Week", "Month", "Year"];

    return (
        <div className="bg-white w-full rounded-xl p-6">
            {/* Header */}
            <div className="flex items-start justify-between flex-col sm:flex-row mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Job statistics</h3>
                    <p className="text-sm text-gray-500">Showing Job statistics Jul 19-25</p>
                </div>
                <div className="flex space-x-2 mt-2 sm:mt-0">
                    {periods.map((period) => (
                        <button
                            key={period}
                            onClick={() => setSelectedPeriod(period)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedPeriod === period
                                    ? "bg-black text-white"
                                    : "text-gray-600 hover:bg-gray-100"
                                }`}
                        >
                            {period}
                        </button>
                    ))}
                </div>
            </div>

            {/* Legends */}
            <div className="flex gap-4 mb-4">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full" />
                    <span className="text-sm text-gray-600">Job views</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full" />
                    <span className="text-sm text-gray-600">Job Applied</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                    <span className="text-sm text-gray-600">Job Opened</span>
                </div>
            </div>

            {/* Chart */}
            <div className="w-full h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "#6b7280" }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: "#6b7280" }}
                            tickFormatter={(value) => `${value / 1000}k`}
                        />
                        <Line dataKey="views" stroke="#2563eb" strokeWidth={2} dot={false} />
                        <Line dataKey="applied" stroke="#60a5fa" strokeWidth={2} dot={false} />
                        <Line dataKey="opened" stroke="#facc15" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    {
                        label: "Job opened",
                        value: 34,
                        change: "This week",
                        gain: "8.4",
                        positive: true,
                        icon: FolderOpen,
                    },
                    {
                        label: "Job views",
                        value: 120,
                        change: "This week",
                        gain: "8.4",
                        positive: true,
                        icon: Eye,
                    },
                    {
                        label: "Job applied",
                        value: 45,
                        change: "This month",
                        gain: "8.4",
                        positive: false,
                        icon: FileSearch2,
                    },
                ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={idx}
                            className="flex flex-col border rounded-xl py-3 px-4 gap-1"
                        >
                            {/* Row 1 - Icon */}
                            <div className="flex items-center">
                                <Icon className="w-8 h-8 text-[#757575]" />
                            </div>

                            {/* Row 2 - Label + Value */}
                            <div className="flex justify-between items-center">
                                <p className="text-[#757575]">{stat.label}</p>
                                <p className="text-lg font-bold text-[#353535]">{stat.value}</p>
                            </div>

                            {/* Row 3 - Change */}
                            <div className="flex justify-between items-center">
                                <div className="text-[#A5A5A5]">
                                    {stat.change}
                                </div>
                                <div
                                    className={`flex items-center text-sm font-medium ${stat.positive ? "text-green-600" : "text-red-600"
                                        }`}
                                >
                                    {stat.positive ? (
                                        <ChevronUp className="w-4 h-4 mr-1" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 mr-1" />
                                    )}
                                    {stat.gain}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DashboardJobStatistics;