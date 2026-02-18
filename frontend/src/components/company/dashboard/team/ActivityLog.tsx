"use client";

import React, { useState } from "react";
import {
  Clock,
  UserPlus,
  UserMinus,
  Edit3,
  Shield,
  ArrowRightLeft,
  Mail,
  XCircle,
  CheckCircle,
  LogIn,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useActivityLogs } from "@/src/lib/company/team.queries";

const ACTION_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; label: string }
> = {
  member_invited: {
    icon: UserPlus,
    color: "#005DDC",
    label: "Invited a team member",
  },
  invitation_accepted: {
    icon: CheckCircle,
    color: "#16a34a",
    label: "Invitation accepted",
  },
  invitation_cancelled: {
    icon: XCircle,
    color: "#dc2626",
    label: "Invitation cancelled",
  },
  invitation_resent: {
    icon: Mail,
    color: "#005DDC",
    label: "Invitation resent",
  },
  member_updated: {
    icon: Edit3,
    color: "#f59e0b",
    label: "Member updated",
  },
  member_removed: {
    icon: UserMinus,
    color: "#dc2626",
    label: "Member removed",
  },
  role_changed: {
    icon: Shield,
    color: "#8b5cf6",
    label: "Role changed",
  },
  permissions_updated: {
    icon: Settings,
    color: "#f59e0b",
    label: "Permissions updated",
  },
  ownership_transferred: {
    icon: ArrowRightLeft,
    color: "#005DDC",
    label: "Ownership transferred",
  },
  member_login: {
    icon: LogIn,
    color: "#16a34a",
    label: "Member logged in",
  },
};

function getActionConfig(action: string) {
  return (
    ACTION_CONFIG[action] || {
      icon: Clock,
      color: "#515151",
      label: action.replace(/_/g, " "),
    }
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function buildDescription(log: any): string {
  const performer = log.performer?.first_name
    ? `${log.performer.first_name} ${log.performer.last_name || ""}`.trim()
    : "Someone";

  const target = log.target?.first_name
    ? `${log.target.first_name} ${log.target.last_name || ""}`.trim()
    : "";

  const config = getActionConfig(log.action);
  const details = log.details as Record<string, any> | null;

  switch (log.action) {
    case "member_invited":
      return `${performer} invited ${details?.email || target || "a user"} as ${details?.role || "member"}`;
    case "invitation_accepted":
      return `${target || performer} accepted the invitation`;
    case "invitation_cancelled":
      return `${performer} cancelled invitation for ${details?.email || target || "a user"}`;
    case "invitation_resent":
      return `${performer} resent invitation to ${details?.email || target || "a user"}`;
    case "member_updated":
      return `${performer} updated ${target || "a member"}'s details`;
    case "member_removed":
      return `${performer} removed ${target || "a member"} from the team`;
    case "role_changed":
      return `${performer} changed ${target || "a member"}'s role${details?.from && details?.to ? ` from ${details.from} to ${details.to}` : ""}`;
    case "permissions_updated":
      return `${performer} updated permissions for ${target || "a member"}`;
    case "ownership_transferred":
      return `${performer} transferred ownership to ${target || "a member"}`;
    default:
      return `${performer} ${config.label.toLowerCase()}`;
  }
}

interface ActivityLogProps {
  companyId?: string;
}

export default function ActivityLog({ companyId }: ActivityLogProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useActivityLogs({ page, limit: 20 });

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="w-6 h-6 border-2 border-[#005DDC] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[13px] text-[#888] mt-3">Loading activity...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center">
        <p className="text-[13px] text-[#dc2626]">Failed to load activity logs.</p>
      </div>
    );
  }

  const logs = data?.logs || [];

  if (logs.length === 0) {
    return (
      <div className="py-12 text-center">
        <Clock size={32} color="#ccc" className="mx-auto mb-3" />
        <p className="text-[14px] font-medium text-[#888]">No activity yet</p>
        <p className="text-[12px] text-[#aaa] mt-1">
          Team actions will appear here
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-0">
        {logs.map((log: any, idx: number) => {
          const config = getActionConfig(log.action);
          const Icon = config.icon;
          const isLast = idx === logs.length - 1;

          return (
            <div key={log.id} className="flex gap-3">
              {/* Timeline line + icon */}
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${config.color}14` }}
                >
                  <Icon size={14} color={config.color} />
                </div>
                {!isLast && (
                  <div className="w-px flex-1 bg-[#EDEDED] my-1" />
                )}
              </div>

              {/* Content */}
              <div className={`pb-4 flex-1 ${isLast ? "" : ""}`}>
                <p className="text-[13px] text-[#333] leading-snug">
                  {buildDescription(log)}
                </p>
                <p className="text-[11px] text-[#999] mt-0.5">
                  {formatTime(log.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {data && data.total_pages > page && (
        <div className="pt-2 text-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1.5 text-[13px] text-[#005DDC] hover:text-[#0046B3] font-medium transition-colors"
          >
            <ChevronDown size={14} />
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
