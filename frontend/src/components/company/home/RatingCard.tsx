import React from 'react';
import { AreaChart, Area, Line, ResponsiveContainer } from 'recharts';

interface RatingCardProps {
    title: string;
    value: string;
    chartData: { name: string; value: number }[];
    lineColor?: string;
    fillColor?: string;
}

const RatingCard: React.FC<RatingCardProps> = ({
    title,
    value,
    chartData,
    lineColor = '#0000FF',
    fillColor = '#90EE90',
}) => {
    return (
        <div className="flex justify-between bg-white shadow-[0_0_30px_rgba(0,93,220,0.1)] rounded-xl py-8 px-6 w-full relative">
            <div>
                <p className="text-[#757575] text-xl font-medium">{title}</p>
                <h1 className="text-4xl font-semibold text-black mt-1">{value}</h1>
            </div>
            <ResponsiveContainer width="60%" height="65%" className="flex items-center">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={lineColor}
                        fill={fillColor}
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                    />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={lineColor}
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default RatingCard;