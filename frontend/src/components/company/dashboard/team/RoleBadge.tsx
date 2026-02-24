"use client";

import React from "react";
import { TeamRole, ROLE_LABELS, ROLE_COLORS } from "@/src/types/team.types";

interface RoleBadgeProps {
  role: TeamRole;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
};

export default RoleBadge;
