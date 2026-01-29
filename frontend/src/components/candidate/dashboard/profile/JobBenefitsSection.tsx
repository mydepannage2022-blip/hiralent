"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit2,
  Gift,
  X,
  Check,
  Plus,
  Trash2,
  HeartPulse,
  Home,
  Clock,
  Laptop,
  GraduationCap,
  Dumbbell,
  PiggyBank,
  BadgeDollarSign,
  Plane,
  Shield,
  Brain,
  Eye,
  Tooth,
  TrendingUp,
  MapPin,
  Bus,
  Utensils,
  Phone,
  Briefcase,
  Sparkles,
  Scale,
  Tag,
  Baby,
  Accessibility,
  Package,
} from "lucide-react";

import { useUpdateJobBenefits } from "@/src/lib/profile/profile.queries";
import { JobBenefitData } from "@/src/lib/profile/profile.api";
import { useProfile } from "@/src/context/ProfileContext";

const JobBenefitsSection: React.FC = () => {
  const { profileData, setProfileData } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [benefits, setBenefits] = useState<JobBenefitData[]>([]);
  const [newBenefit, setNewBenefit] = useState<JobBenefitData>({
    benefit_type: "health_insurance",
    importance: "preferred",
    notes: "",
  });

  const { mutate: updateJobBenefits, isPending: isUpdating } = useUpdateJobBenefits();

  // ✅ Parse job benefits data from profile context
  const getJobBenefitsData = (): JobBenefitData[] => {
    if (!profileData?.job_benefits) return [];

    try {
      let benefitsArray: any[] = [];

      if (typeof profileData.job_benefits === "string") {
        benefitsArray = JSON.parse(profileData.job_benefits);
      } else if (Array.isArray(profileData.job_benefits)) {
        benefitsArray = profileData.job_benefits as any[];
      }

      return benefitsArray.map((benefit: any) => ({
        benefit_type: benefit?.benefit_type || "health_insurance",
        importance: benefit?.importance || "preferred",
        notes: benefit?.notes || "",
      }));
    } catch (error) {
      console.error("Error parsing job benefits data:", error);
      return [];
    }
  };

  const viewBenefits = useMemo(() => getJobBenefitsData(), [profileData?.job_benefits]);

  // ✅ IMPORTANT FIX:
  // Don't override local edits while editing
  useEffect(() => {
    if (!isEditing) {
      setBenefits(viewBenefits);
    }
  }, [viewBenefits, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setBenefits(viewBenefits);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setBenefits(viewBenefits);
    setNewBenefit({
      benefit_type: "health_insurance",
      importance: "preferred",
      notes: "",
    });
  };

  const handleSave = () => {
    // ✅ Sanitize exactly like before
    const sanitizedBenefits = benefits.map((b) => ({
      ...b,
      notes: (b.notes || "").substring(0, 200),
    }));

    updateJobBenefits(sanitizedBenefits, {
      onSuccess: () => {
        // ✅ Keep context updated so view mode reflects changes immediately
        setProfileData({
          ...profileData,
          job_benefits: [...sanitizedBenefits],
        });

        // ✅ Also update local state + exit edit mode
        setBenefits(sanitizedBenefits);
        setIsEditing(false);
      },
      onError: (error) => {
        console.error("API Error:", error);
      },
    });
  };

  const handleAddBenefit = () => {
    if (newBenefit.benefit_type.trim()) {
      setBenefits((prev) => [...prev, { ...newBenefit }]);
      setNewBenefit({
        benefit_type: "health_insurance",
        importance: "preferred",
        notes: "",
      });
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBenefitChange = (index: number, field: keyof JobBenefitData, value: string) => {
    setBenefits((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const getImportancePill = (importance: string) => {
    switch (importance) {
      case "required":
        return "bg-red-50 text-red-700 border-red-200";
      case "preferred":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "nice_to_have":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getBenefitIcon = (benefitType: string) => {
    switch (benefitType) {
      case "health_insurance":
        return HeartPulse;
      case "dental_insurance":
        return Tooth;
      case "vision_insurance":
        return Eye;
      case "retirement_401k":
        return PiggyBank;
      case "paid_time_off":
        return Plane;
      case "flexible_pto":
        return Plane;
      case "flexible_hours":
        return Clock;
      case "remote_work":
        return Home;
      case "professional_development":
        return GraduationCap;
      case "gym_membership":
        return Dumbbell;
      case "stock_options":
        return TrendingUp;
      case "bonus_structure":
        return BadgeDollarSign;
      case "parental_leave":
        return Baby;
      case "mental_health_support":
        return Brain;
      case "life_insurance":
        return Shield;
      case "disability_insurance":
        return Accessibility;
      case "commuter_benefits":
        return Bus;
      case "food_allowance":
        return Utensils;
      case "education_reimbursement":
        return GraduationCap;
      case "conference_allowance":
        return Briefcase;
      case "wellness_programs":
        return Sparkles;
      case "childcare_assistance":
        return Baby;
      case "relocation_assistance":
        return Package;
      case "phone_internet_allowance":
        return Phone;
      case "coworking_space_access":
        return Laptop;
      case "sabbatical_leave":
        return MapPin;
      case "legal_assistance":
        return Scale;
      case "employee_discounts":
        return Tag;
      case "team_building_events":
        return Gift;
      default:
        return Gift;
    }
  };

  const formatBenefitType = (type: string) =>
    String(type || "").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const hasContent = viewBenefits.length > 0;

  const benefitOptions = [
    { value: "health_insurance", label: "Health Insurance" },
    { value: "dental_insurance", label: "Dental Insurance" },
    { value: "vision_insurance", label: "Vision Insurance" },
    { value: "retirement_401k", label: "Retirement 401k" },
    { value: "paid_time_off", label: "Paid Time Off" },
    { value: "flexible_pto", label: "Flexible PTO" },
    { value: "flexible_hours", label: "Flexible Hours" },
    { value: "remote_work", label: "Remote Work" },
    { value: "professional_development", label: "Professional Development" },
    { value: "gym_membership", label: "Gym Membership" },
    { value: "stock_options", label: "Stock Options" },
    { value: "bonus_structure", label: "Bonus Structure" },
    { value: "parental_leave", label: "Parental Leave" },
    { value: "mental_health_support", label: "Mental Health Support" },
    { value: "life_insurance", label: "Life Insurance" },
    { value: "disability_insurance", label: "Disability Insurance" },
    { value: "commuter_benefits", label: "Commuter Benefits" },
    { value: "food_allowance", label: "Food Allowance" },
    { value: "education_reimbursement", label: "Education Reimbursement" },
    { value: "conference_allowance", label: "Conference Allowance" },
    { value: "wellness_programs", label: "Wellness Programs" },
    { value: "childcare_assistance", label: "Childcare Assistance" },
    { value: "relocation_assistance", label: "Relocation Assistance" },
    { value: "phone_internet_allowance", label: "Phone/Internet Allowance" },
    { value: "coworking_space_access", label: "Coworking Access" },
    { value: "sabbatical_leave", label: "Sabbatical Leave" },
    { value: "legal_assistance", label: "Legal Assistance" },
    { value: "employee_discounts", label: "Employee Discounts" },
    { value: "team_building_events", label: "Team Building Events" },
    { value: "other", label: "Other" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Gift className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm lg:text-lg font-semibold text-gray-900 leading-tight">
              Preferred Job Benefits
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">What matters most to you in an offer</p>
          </div>
        </div>

        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isUpdating ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {!isEditing ? (
        <div>
          {hasContent ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {viewBenefits.map((benefit: any, index: number) => {
                const Icon = getBenefitIcon(benefit.benefit_type);
                const importanceLabel = String(benefit.importance || "preferred").replace(/_/g, " ");

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-200 hover:bg-white transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 group-hover:border-blue-200">
                      <Icon className="w-5 h-5 text-gray-700 group-hover:text-blue-600 transition-colors" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">
                            {formatBenefitType(benefit.benefit_type)}
                          </h4>

                          {benefit.notes ? (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {benefit.notes}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-1">No notes</p>
                          )}
                        </div>

                        <span
                          className={[
                            "shrink-0 px-2 py-0.5 rounded-full border text-[10px] lg:text-xs font-medium capitalize",
                            getImportancePill(benefit.importance),
                          ].join(" ")}
                        >
                          {importanceLabel}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50">
              <div className="w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-600 text-sm">Add your preferred job benefits</p>
              <button onClick={handleEdit} className="mt-3 text-blue-600 text-sm font-medium hover:text-blue-700">
                Add benefits
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Existing Benefits */}
          <AnimatePresence>
            {benefits.map((benefit, index) => {
              const Icon = getBenefitIcon(benefit.benefit_type);

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-200 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-gray-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {formatBenefitType(benefit.benefit_type)}
                          </p>
                          <p className="text-xs text-gray-500">Benefit {index + 1}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveBenefit(index)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Benefit Type</label>
                        <select
                          value={benefit.benefit_type}
                          onChange={(e) => handleBenefitChange(index, "benefit_type", e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                        >
                          {benefitOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Importance</label>
                        <select
                          value={benefit.importance}
                          onChange={(e) => handleBenefitChange(index, "importance", e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                        >
                          <option value="required">Required</option>
                          <option value="preferred">Preferred</option>
                          <option value="nice_to_have">Nice to Have</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-gray-700">Notes</label>
                          <span className="text-xs text-gray-400">{(benefit.notes || "").length}/200</span>
                        </div>
                        <input
                          type="text"
                          value={benefit.notes || ""}
                          onChange={(e) => {
                            if (e.target.value.length <= 200) {
                              handleBenefitChange(index, "notes", e.target.value);
                            }
                          }}
                          maxLength={200}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                          placeholder="Any details (ex: private insurance, budget, etc.)"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Add New Benefit */}
          <div className="p-4 rounded-xl border-2 border-dashed border-gray-300 bg-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Plus className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Add a benefit</p>
                <p className="text-xs text-gray-500">Pick a type, set importance, add a note</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Benefit Type</label>
                <select
                  value={newBenefit.benefit_type}
                  onChange={(e) => setNewBenefit({ ...newBenefit, benefit_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  {benefitOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Importance</label>
                <select
                  value={newBenefit.importance}
                  onChange={(e) => setNewBenefit({ ...newBenefit, importance: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="required">Required</option>
                  <option value="preferred">Preferred</option>
                  <option value="nice_to_have">Nice to Have</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700">Notes</label>
                  <span className="text-xs text-gray-400">{(newBenefit.notes || "").length}/200</span>
                </div>
                <input
                  type="text"
                  value={newBenefit.notes || ""}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      setNewBenefit({ ...newBenefit, notes: e.target.value });
                    }
                  }}
                  maxLength={200}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  placeholder="Optional"
                />
              </div>

              <div className="md:col-span-4">
                <button
                  onClick={handleAddBenefit}
                  className="w-full mt-1 py-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Benefit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </motion.div>
  );
};

export default JobBenefitsSection;
