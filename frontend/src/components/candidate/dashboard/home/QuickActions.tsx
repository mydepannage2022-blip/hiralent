"use client";

import React from "react";
import SmartLink from "../../../layout/SmartLink";
import { Briefcase, User, MessageSquare, FileText, Search, Settings } from "lucide-react";

const actions = [
  {
    label: "Find Jobs",
    description: "Browse job listings",
    href: "/job/findjob",
    icon: Search,
    color: "bg-blue-50",
    iconColor: "text-[#005DDC]",
  },
  {
    label: "My Applications",
    description: "Track your applications",
    href: "/candidate/dashboard/applications",
    icon: FileText,
    color: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    label: "My Profile",
    description: "Edit your profile",
    href: "/candidate/dashboard/candidate-profile",
    icon: User,
    color: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    label: "Messages",
    description: "Chat with recruiters",
    href: "/candidate/dashboard/messages",
    icon: MessageSquare,
    color: "bg-orange-50",
    iconColor: "text-orange-600",
  },
];

export default function QuickActions() {
  return (
    <div className="bg-white w-full rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <SmartLink
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#005DDC]/20 hover:bg-blue-50/30 transition-all group"
            >
              <div className={`w-9 h-9 rounded-lg ${action.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon size={18} className={action.iconColor} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{action.label}</p>
                <p className="text-[11px] text-gray-500">{action.description}</p>
              </div>
            </SmartLink>
          );
        })}
      </div>
    </div>
  );
}
