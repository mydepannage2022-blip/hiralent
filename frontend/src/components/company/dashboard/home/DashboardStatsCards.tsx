"use client";
import { Users2, MessagesSquare, UserRound, ExternalLink } from "lucide-react";

const stats = [
    { label: "candidates to review", value: 76, icon: Users2 },
    { label: "Message received", value: 34, icon: MessagesSquare },
    { label: "Interview", value: 12, icon: UserRound },
];

const DashboardStatsCards = () => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full bg-white p-4 rounded-xl">
            {stats.map((stat, idx) => (
                <div
                    key={idx}
                    className="flex items-center border border-gray-200 rounded-xl px-2 py-4 bg-white"
                >
                    {/* Left: Icon */}
                    <stat.icon className="w-8 h-8 text-gray-800 flex-shrink-0" />

                    {/* Right: Value + ExternalLink (top row), Label (bottom row) */}
                    <div className="ml-2 flex flex-col flex-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xl font-semibold text-gray-900">
                                {stat.value}
                            </span>
                            <ExternalLink className="w-5 h-5" />
                        </div>
                        <span className="text-xs text-[#222222]">{stat.label}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default DashboardStatsCards;