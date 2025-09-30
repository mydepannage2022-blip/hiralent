"use client";
import React from "react";
import Image from "next/image";
import { CalendarDays } from "lucide-react";

const dates = ["Tue 9", "Sun 10", "Mon 11", "Tue 12"];
const interviews = [
    { name: "Kathryn Murphy", time: "10:30 AM - 11:30 AM", role: "UI/UX Designer" },
    { name: "Kathryn Murphy", time: "10:30 AM - 11:30 AM", role: "UI/UX Designer" },
    { name: "Kathryn Murphy", time: "10:30 AM - 11:30 AM", role: "UI/UX Designer" },
];

const DashboardSchedule = () => {
    return (
        <div className="bg-white rounded-xl p-4">
            <div className="flex justify-between mb-4 items-center">
                <h3 className="text-xl font-semibold">Schedule</h3>
                <CalendarDays />
            </div>
            <div className="flex gap-3 mb-6">
                {dates.map((date, idx) => (
                    <button
                        key={idx}
                        className={`px-3 py-2 rounded-lg ${idx === 2 ? "bg-[#282828] text-white" : "text-[#282828] border border-[#EDEDED]"
                            }`}
                    >
                        {date}
                    </button>
                ))}
            </div>
            <h4 className="text-xl font-semibold mb-2">Today's Interview</h4>
            <div className="space-y-4 max-h-[235px] overflow-y-auto pr-2">
                {interviews.map((iv, idx) => (
                    <div
                        key={idx}
                        className="p-2 border rounded-lg flex justify-between bg-white"
                    >
                        <div>
                            <p className="text-sm font-medium text-[#757575] mb-1">
                                Interview with <span className="text-[#282828]">{iv.name}</span>
                            </p>
                            <p className="font-medium text-[#282828]">{iv.time}</p>
                            <p className="font-medium text-[#282828]">{iv.role}</p>
                        </div>
                        <div>
                            <div className="bg-[#F4F4F4] p-1 rounded-lg">
                                <Image
                                    src="/images/googlemeet.png"
                                    alt="Google Meet"
                                    width={24}
                                    height={24}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default DashboardSchedule;