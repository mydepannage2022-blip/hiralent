// frontend/src/components/company/dashboard/employer/HiringPreferencesForm.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Users, Loader2, Check, X, Plus } from "lucide-react";
import { useUpdateHiringPreferences } from "@/src/lib/company/employer.queries";
import {
  WORK_TYPE_OPTIONS,
  BENEFIT_OPTIONS,
} from "@/src/types/employer.types";
import type { CompanyProfile, UpdateHiringPayload } from "@/src/types/employer.types";

interface HiringPreferencesFormProps {
  profile: CompanyProfile;
}

export default function HiringPreferencesForm({ profile }: HiringPreferencesFormProps) {
  const [formData, setFormData] = useState<UpdateHiringPayload>({
    work_types: [],
    benefits: [],
    culture_description: "",
    tech_stack: [],
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [newTech, setNewTech] = useState("");

  const updateMutation = useUpdateHiringPreferences();

  useEffect(() => {
    setFormData({
      work_types: (profile as any).work_types || [],
      benefits: (profile as any).benefits || [],
      culture_description: (profile as any).culture_description || "",
      tech_stack: (profile as any).tech_stack || [],
    });
  }, [profile]);


  const handleCultureChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, culture_description: e.target.value }));
    setHasChanges(true);
  };

  const toggleWorkType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      work_types: prev.work_types?.includes(type)
        ? prev.work_types.filter((t) => t !== type)
        : [...(prev.work_types || []), type],
    }));
    setHasChanges(true);
  };

  const toggleBenefit = (benefit: string) => {
    setFormData((prev) => ({
      ...prev,
      benefits: prev.benefits?.includes(benefit)
        ? prev.benefits.filter((b) => b !== benefit)
        : [...(prev.benefits || []), benefit],
    }));
    setHasChanges(true);
  };

  const addTech = () => {
    if (!newTech.trim()) return;
    if (formData.tech_stack?.includes(newTech.trim())) return;
    
    setFormData((prev) => ({
      ...prev,
      tech_stack: [...(prev.tech_stack || []), newTech.trim()],
    }));
    setNewTech("");
    setHasChanges(true);
  };

  const removeTech = (tech: string) => {
    setFormData((prev) => ({
      ...prev,
      tech_stack: prev.tech_stack?.filter((t) => t !== tech) || [],
    }));
    setHasChanges(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTech();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData, {
      onSuccess: () => {
        setHasChanges(false);
      },
    });
  };

  return (
    <div className="bg-white rounded-xl border border-[#EDEDED]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#EDEDED]">
        <div className="flex items-center gap-2">
          <Users size={18} color="#005DDC" />
          <h3 className="text-[15px] font-semibold text-[#1a1a1a]">
            Hiring Preferences
          </h3>
        </div>
        <p className="text-[12px] text-[#888] mt-1">
          What you offer to employees
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Work Types */}
        <div>
          <label className="block text-[12px] font-medium text-[#555] mb-2">
            Work Types Offered
          </label>
          <div className="flex flex-wrap gap-2">
            {WORK_TYPE_OPTIONS.map((type) => {
              const isSelected = formData.work_types?.includes(type.value);
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => toggleWorkType(type.value)}
                  className={`
                    px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors
                    ${
                      isSelected
                        ? "bg-[#EFF5FF] border-[#005DDC] text-[#005DDC]"
                        : "bg-white border-[#EDEDED] text-[#555] hover:border-[#ccc]"
                    }
                  `}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Benefits */}
        <div>
          <label className="block text-[12px] font-medium text-[#555] mb-2">
            Benefits & Perks
          </label>
          <div className="flex flex-wrap gap-2">
            {BENEFIT_OPTIONS.map((benefit) => {
              const isSelected = formData.benefits?.includes(benefit);
              return (
                <button
                  key={benefit}
                  type="button"
                  onClick={() => toggleBenefit(benefit)}
                  className={`
                    px-3 py-1.5 text-[12px] font-medium rounded-lg border transition-colors
                    ${
                      isSelected
                        ? "bg-[#EFF5FF] border-[#005DDC] text-[#005DDC]"
                        : "bg-white border-[#EDEDED] text-[#555] hover:border-[#ccc]"
                    }
                  `}
                >
                  {benefit}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tech Stack */}
        <div>
          <label className="block text-[12px] font-medium text-[#555] mb-2">
            Tech Stack
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTech}
              onChange={(e) => setNewTech(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add technology (e.g., React, Node.js)"
              className="flex-1 px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors"
            />
            <button
              type="button"
              onClick={addTech}
              disabled={!newTech.trim()}
              className="px-3 py-2 text-[13px] font-medium text-white bg-[#005DDC] rounded-lg hover:bg-[#0046B3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
            </button>
          </div>
          {formData.tech_stack && formData.tech_stack.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tech_stack.map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium bg-[#F5F5F5] text-[#555] rounded-lg"
                >
                  {tech}
                  <button
                    type="button"
                    onClick={() => removeTech(tech)}
                    className="text-[#999] hover:text-[#dc2626] transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Culture Description */}
        <div>
          <label className="block text-[12px] font-medium text-[#555] mb-1.5">
            Company Culture
          </label>
          <textarea
            value={formData.culture_description}
            onChange={handleCultureChange}
            placeholder="Describe your company culture, values, and what makes your workplace unique..."
            rows={4}
            maxLength={1000}
            className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors resize-none"
          />
          <p className="text-[11px] text-[#999] mt-1">
            {formData.culture_description?.length || 0}/1000 characters
          </p>
        </div>

        {/* Error message */}
        {updateMutation.isError && (
          <div className="p-3 bg-[#FEF2F2] rounded-lg">
            <p className="text-[12px] text-[#dc2626]">
              {updateMutation.error?.message || "Failed to update. Please try again."}
            </p>
          </div>
        )}

        {/* Success message */}
        {updateMutation.isSuccess && !hasChanges && (
          <div className="flex items-center gap-2 p-3 bg-[#DCFCE7] rounded-lg">
            <Check size={14} color="#16a34a" />
            <p className="text-[12px] text-[#16a34a]">Changes saved successfully</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!hasChanges || updateMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 text-[13px] font-medium text-white bg-[#005DDC] rounded-lg hover:bg-[#0046B3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending && (
              <Loader2 size={14} className="animate-spin" />
            )}
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
