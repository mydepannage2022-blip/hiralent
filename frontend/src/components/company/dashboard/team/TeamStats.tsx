"use client";

import React from "react";
import { Users, Mail, UserCheck, UserX } from "lucide-react";

interface TeamStatsProps {
  totalMembers: number;
  pendingInvitations: number;
  activeMembers: number;
  seatsLimit: number | null;
}

const TeamStats: React.FC<TeamStatsProps> = ({
  totalMembers,
  pendingInvitations,
  activeMembers,
  seatsLimit,
}) => {
  const stats = [
    {
      label: "Total Members",
      value: totalMembers,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Active Members",
      value: activeMembers,
      icon: UserCheck,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Pending Invites",
      value: pendingInvitations,
      icon: Mail,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Seats",
      value: seatsLimit ? `${totalMembers}/${seatsLimit}` : `${totalMembers}`,
      icon: UserX,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-[#EDEDED] p-4 flex items-center gap-3"
          >
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <Icon size={20} className={stat.color} />
            </div>
            <div>
              <p className="text-xl font-semibold">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TeamStats;
