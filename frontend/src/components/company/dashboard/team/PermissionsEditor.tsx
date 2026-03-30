"use client";

import React, { useState, useEffect } from "react";
import { Check, X, Shield, Info } from "lucide-react";
import {
  ModulePermission,
  MODULE_LABELS,
  Module,
} from "@/src/types/team.types";

interface PermissionsEditorProps {
  permissions: ModulePermission[];
  onChange: (permissions: ModulePermission[]) => void;
  disabled?: boolean;
}

const PERMISSION_KEYS = [
  "can_view",
  "can_create",
  "can_edit",
  "can_delete",
  "can_manage",
] as const;

const PERMISSION_LABELS: Record<(typeof PERMISSION_KEYS)[number], string> = {
  can_view: "View",
  can_create: "Create",
  can_edit: "Edit",
  can_delete: "Delete",
  can_manage: "Manage",
};

const ALL_MODULES: Module[] = [
  "dashboard",
  "jobs",
  "candidates",
  "assessments",
  "questions",
  "messages",
  "settings",
  "team",
  "analytics",
  "billing",
];
export default function PermissionsEditor({
  permissions,
  onChange,
  disabled = false,
}: PermissionsEditorProps) {
  const [localPermissions, setLocalPermissions] =
    useState<ModulePermission[]>(permissions);

  useEffect(() => {
    setLocalPermissions(permissions);
  }, [permissions]);

  const getModulePermission = (
    module: Module
  ): ModulePermission | undefined => {
    return localPermissions.find((p) => p.module === module);
  };

  const togglePermission = (
    module: Module,
    key: (typeof PERMISSION_KEYS)[number]
  ) => {
    if (disabled) return;

    const updated = localPermissions.map((p) => {
      if (p.module !== module) return p;

      const newValue = !p[key];
      const updatedPerm = { ...p, [key]: newValue };

      // If turning off can_view, turn off everything
      if (key === "can_view" && !newValue) {
        return {
          ...updatedPerm,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_manage: false,
        };
      }

      // If turning on any other permission, ensure can_view is on
      if (key !== "can_view" && newValue) {
        updatedPerm.can_view = true;
      }

      // If turning on can_manage, turn on everything
      if (key === "can_manage" && newValue) {
        return {
          ...updatedPerm,
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
          can_manage: true,
        };
      }

      return updatedPerm;
    });

    // If module not in list yet, add it
    if (!updated.find((p) => p.module === module)) {
   const newPerm: ModulePermission = {
        module,
        can_view: true,
        can_create: key === "can_create" || key === "can_manage",
        can_edit: key === "can_edit" || key === "can_manage",
        can_delete: key === "can_delete" || key === "can_manage",
        can_manage: key === "can_manage",
      };
      updated.push(newPerm);
    }

    setLocalPermissions(updated);
    onChange(updated);
  };

  const toggleAllForModule = (module: Module) => {
    if (disabled) return;

    const existing = getModulePermission(module);
    const allOn =
      existing &&
      PERMISSION_KEYS.every((k) => existing[k]);

    const updated = localPermissions.map((p) => {
      if (p.module !== module) return p;
      return {
        ...p,
        can_view: !allOn,
        can_create: !allOn,
        can_edit: !allOn,
        can_delete: !allOn,
        can_manage: !allOn,
      };
    });

    if (!existing) {
      updated.push({
        module,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
        can_manage: true,
      });
    }

    setLocalPermissions(updated);
    onChange(updated);
  };

  const toggleAllForPermission = (key: (typeof PERMISSION_KEYS)[number]) => {
    if (disabled) return;

    const allOn = ALL_MODULES.every((mod) => {
      const perm = getModulePermission(mod);
      return perm && perm[key];
    });

    const updated = ALL_MODULES.map((mod) => {
      const existing = getModulePermission(mod);
      const base = existing || {
        module: mod,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
        can_manage: false,
      };

      const newPerm = { ...base, [key]: !allOn };

      // If turning off can_view, turn off everything
      if (key === "can_view" && allOn) {
        return {
          ...newPerm,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_manage: false,
        };
      }

      // If turning on any other, ensure can_view is on
      if (key !== "can_view" && !allOn) {
        newPerm.can_view = true;
      }

      // If turning on can_manage, turn on all
      if (key === "can_manage" && !allOn) {
        return {
          ...newPerm,
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
          can_manage: true,
        };
      }

      return newPerm;
    });

    setLocalPermissions(updated);
    onChange(updated);
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={18} color="#005DDC" />
        <h3 className="text-[15px] font-semibold text-[#1a1a1a]">
          Module Permissions
        </h3>
      </div>

      <div className="flex items-center gap-1.5 mb-4 px-3 py-2 bg-[#EFF5FF] rounded-md">
        <Info size={14} color="#005DDC" />
        <p className="text-[12px] text-[#515151]">
          Turning off View disables all permissions for that module. Manage
          grants full access.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[12px] font-medium text-[#888] uppercase tracking-wide py-2 px-3 border-b border-[#EDEDED] w-[180px]">
                Module
              </th>
              {PERMISSION_KEYS.map((key) => {
                const allOn = ALL_MODULES.every((mod) => {
                  const perm = getModulePermission(mod);
                  return perm && perm[key];
                });

                return (
                  <th
                    key={key}
                    className="text-center text-[12px] font-medium text-[#888] uppercase tracking-wide py-2 px-2 border-b border-[#EDEDED] w-[80px]"
                  >
                    <button
                      type="button"
                      onClick={() => toggleAllForPermission(key)}
                      disabled={disabled}
                      className="hover:text-[#005DDC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {PERMISSION_LABELS[key]}
                    </button>
                    {!disabled && (
                      <div
                        className={`w-1.5 h-1.5 rounded-full mx-auto mt-1 ${
                          allOn ? "bg-[#005DDC]" : "bg-[#ddd]"
                        }`}
                      />
                    )}
                  </th>
                );
              })}
              <th className="text-center text-[12px] font-medium text-[#888] uppercase tracking-wide py-2 px-2 border-b border-[#EDEDED] w-[60px]">
                All
              </th>
            </tr>
          </thead>
          <tbody>
            {ALL_MODULES.map((mod, idx) => {
              const perm = getModulePermission(mod);
              const allOn = perm && PERMISSION_KEYS.every((k) => perm[k]);

              return (
                <tr
                  key={mod}
                  className={
                    idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"
                  }
                >
                  <td className="py-2.5 px-3 text-[13px] font-medium text-[#333] border-b border-[#F0F0F0]">
                    {MODULE_LABELS[mod] || mod}
                  </td>
                  {PERMISSION_KEYS.map((key) => {
                    const isOn = perm && perm[key];

                    return (
                      <td
                        key={key}
                        className="py-2.5 px-2 text-center border-b border-[#F0F0F0]"
                      >
                        <button
                          type="button"
                          onClick={() => togglePermission(mod, key)}
                          disabled={disabled}
                          className={`
                            w-7 h-7 rounded-md flex items-center justify-center mx-auto
                            transition-all duration-150
                            ${
                              isOn
                                ? "bg-[#005DDC] text-white"
                                : "bg-[#F0F0F0] text-[#bbb] hover:bg-[#E5E5E5]"
                            }
                            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                          `}
                        >
                          {isOn ? <Check size={14} /> : <X size={14} />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-2 text-center border-b border-[#F0F0F0]">
                    <button
                      type="button"
                      onClick={() => toggleAllForModule(mod)}
                      disabled={disabled}
                      className={`
                        text-[11px] font-medium px-2 py-1 rounded
                        transition-colors
                        ${
                          allOn
                            ? "bg-[#005DDC] text-white"
                            : "bg-[#F0F0F0] text-[#888] hover:bg-[#E5E5E5]"
                        }
                        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                      `}
                    >
                      {allOn ? "All" : "All"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
