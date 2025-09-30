"use client";

import { CreditCard, Clock } from "lucide-react";
import { PieChart, Pie, Cell } from "recharts";

const data = [
    { name: "Used", value: 3 },
    { name: "Left", value: 1 },
];

const COLORS = ["#EDEDED", "#515151"]; // light gray, dark section
const DashboardSubscription = () => {
    return (
        <div className="bg-white rounded-xl p-5 pb-4">
            {/* Top Content */}
            <div className="flex justify-between items-center">
                {/* Left Side */}
                <div>
                    <p className="text-[#353535]">Joined on <span className="text-[#515151]">7 Jan 2025</span></p>
                    <h3 className="text-xl font-semibold text-[#222222]">Free</h3>
                    <p className="text-lg text-[#A5A5A5] mb-2 font-semibold">Monthly</p>

                    <div className="flex items-center gap-2 text-sm text-[#353535] mb-1">
                        <CreditCard className="w-4 h-4" />
                        <span>Automatic renewal</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#353535]">
                        <Clock className="w-4 h-4" />
                        <span>22 Days left</span>
                    </div>
                </div>

                {/* Right Side: Progress Ring */}
                <div className="relative w-28 h-28 flex-shrink-0">
                    <PieChart width={112} height={112}>
                        <Pie
                            data={data}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={52}
                            startAngle={90}
                            endAngle={-270}
                            cornerRadius={10}     /* <-- move cornerRadius here */
                            paddingAngle={1}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>

                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-sm font-semibold text-[#222222]">1 post</span>
                        <span className="text-xs text-[#515151]">Left</span>
                    </div>
                </div>
            </div>

            {/* Button */}
            <button className="mt-3 2xl:mt-9 w-full border border-[#282828] py-2 rounded-lg font-medium text-[#282828] hover:bg-gray-50">
                Manage Subscription
            </button>
        </div>
    );
}

export default DashboardSubscription;