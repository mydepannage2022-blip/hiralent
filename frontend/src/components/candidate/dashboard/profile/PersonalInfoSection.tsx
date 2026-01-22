"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Edit2, User, X, Check, Plus, Mail, Linkedin, Github } from "lucide-react";
import { IoLocationOutline } from "react-icons/io5";
import Select from "react-select";
import { useUpdateBasicInfo } from "@/src/lib/profile/profile.queries";
import { useAuth } from "@/src/context/AuthContext";
import { useProfile } from "@/src/context/ProfileContext";
import { locationOptions } from "@/src/constants/groupedLocationOptions";

const customSelectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    border: state.isFocused ? "2px solid #3B82F6" : "1px solid #D1D5DB",
    borderRadius: "8px",
    minHeight: "42px",
    boxShadow: state.isFocused ? "0 0 0 1px #3B82F6" : "none",
    "&:hover": { borderColor: "#3B82F6" },
  }),
  placeholder: (provided: any) => ({ ...provided, color: "#9CA3AF" }),
  singleValue: (provided: any) => ({ ...provided, color: "#111827" }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected ? "#3B82F6" : state.isFocused ? "#EBF4FF" : "white",
    color: state.isSelected ? "white" : "#111827",
    "&:hover": { backgroundColor: state.isSelected ? "#3B82F6" : "#EBF4FF" },
  }),
};

const Personal = () => {
  const { user } = useAuth();
  const { profileData, refetch } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  // ✅ Prefer autofill-extracted personal_info, fallback to auth user/profileData
  const extractedPI = (profileData as any)?.personal_info || {};

  const fullName = useMemo(() => user?.full_name || "", [user?.full_name]);
  const firstName = useMemo(() => fullName.split(" ")[0] || "", [fullName]);
  const lastName = useMemo(() => fullName.split(" ").slice(1).join(" ") || "", [fullName]);

  const phone = useMemo(() => extractedPI.phone || user?.phone_number || "", [extractedPI.phone, user?.phone_number]);

  const location = useMemo(() => profileData?.location || extractedPI.location || "", [profileData?.location, extractedPI.location]);

  // ✅ NEW: email / linkedin / github
  const email = useMemo(() => extractedPI.email || user?.email || "", [extractedPI.email, user?.email]);

  const linkedin = useMemo(() => (profileData as any)?.linkedin || extractedPI.linkedin || "", [
    (profileData as any)?.linkedin,
    extractedPI.linkedin,
  ]);

  const github = useMemo(() => (profileData as any)?.github || extractedPI.github || "", [
    (profileData as any)?.github,
    extractedPI.github,
  ]);

  const aboutMe = useMemo(() => profileData?.about_me || "", [profileData?.about_me]);

  const selectedLocationOption = useMemo(
    () => locationOptions.find((option) => option.label === location) || null,
    [location]
  );

  const [formData, setFormData] = useState({
    full_name: fullName,
    phone_number: phone,
    location,
    about_me: aboutMe,
    // ✅ NEW fields saved in personal_info JSON on backend
    email,
    linkedin,
    github,
  });

  const [selectedLocation, setSelectedLocation] = useState<any>(selectedLocationOption);

  // ✅ Sync when autofill updates profile
  useEffect(() => {
    setFormData({
      full_name: fullName,
      phone_number: phone,
      location,
      about_me: aboutMe,
      email,
      linkedin,
      github,
    });

    setSelectedLocation(locationOptions.find((o) => o.label === location) || null);
  }, [fullName, phone, location, aboutMe, email, linkedin, github]);

  const { mutate: updateBasicInfo, isPending } = useUpdateBasicInfo();

  const handleEdit = () => {
    setIsEditing(true);
    setFormData({
      full_name: fullName,
      phone_number: phone,
      location,
      about_me: aboutMe,
      email,
      linkedin,
      github,
    });
    setSelectedLocation(selectedLocationOption);
  };

  const handleCancel = () => setIsEditing(false);

  const handleSave = () => {
    const updatedFormData = {
      ...formData,
      location: selectedLocation?.label || "",
      // You likely store these inside candidateprofile.personal_info (Json)
      // If your backend expects them directly, keep as-is.
      // If your backend expects `personal_info`, wrap them.
      personal_info: {
        email: formData.email,
        phone: formData.phone_number,
        github: formData.github,
        linkedin: formData.linkedin,
        location: selectedLocation?.label || "",
      },
    };

    updateBasicInfo(updatedFormData as any, {
      onSuccess: () => {
        setIsEditing(false);
        refetch?.();
      },
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const hasAboutContent = aboutMe && aboutMe.trim().length > 0;

  const normalizeLinkedinUrl = (val: string) => {
    if (!val) return "";
    const v = val.trim();
    if (v.startsWith("http://") || v.startsWith("https://")) return v;
    // if user typed just "safae nagbi" (name), don't force link
    if (v.includes(" ")) return "";
    return `https://www.linkedin.com/in/${v.replace(/^@/, "")}`;
  };

  const normalizeGithubUrl = (val: string) => {
    if (!val) return "";
    const v = val.trim();
    if (v.startsWith("http://") || v.startsWith("https://")) return v;
    return `https://github.com/${v.replace(/^@/, "")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <User className="w-3 h-3 lg:w-4 lg:h-4 text-blue-600" />
          </div>
          <h3 className="text-xs lg:text-lg font-semibold text-gray-900">Personal Information</h3>
        </div>

        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-3 h-3 lg:w-4 lg:h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3 lg:w-4 lg:h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3 lg:w-4 lg:h-4" />
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {!isEditing ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">First name</label>
              <p className="text-xs lg:text-sm text-gray-900">{firstName || "Add"}</p>
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Last name</label>
              <p className="text-xs lg:text-sm text-gray-900">{lastName || "Add"}</p>
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <p className="text-xs lg:text-sm text-gray-900">{phone || "Add"}</p>
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Location</label>
              <p className="text-xs lg:text-sm text-gray-900">{location || "Add"}</p>
            </div>
          </div>

          {/* ✅ NEW: Contact row with icons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email */}
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Mail className="w-4 h-4 text-gray-700" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Email</p>
                <p className="text-xs lg:text-sm text-gray-900 truncate">{email || "Add"}</p>
              </div>
            </div>

            {/* LinkedIn */}
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Linkedin className="w-4 h-4 text-gray-700" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">LinkedIn</p>
                {normalizeLinkedinUrl(linkedin) ? (
                  <a
                    href={normalizeLinkedinUrl(linkedin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 truncate block"
                  >
                    {linkedin}
                  </a>
                ) : (
                  <p className="text-xs lg:text-sm text-gray-900 truncate">{linkedin || "Add"}</p>
                )}
              </div>
            </div>

            {/* GitHub */}
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Github className="w-4 h-4 text-gray-700" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">GitHub</p>
                {normalizeGithubUrl(github) ? (
                  <a
                    href={normalizeGithubUrl(github)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 truncate block"
                  >
                    {github}
                  </a>
                ) : (
                  <p className="text-xs lg:text-sm text-gray-900 truncate">{github || "Add"}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <User className="w-3 h-3 lg:w-4 lg:h-4 text-green-600" />
              </div>
              <h4 className="text-xs lg:text-lg font-semibold text-gray-900">About me</h4>
            </div>

            {hasAboutContent ? (
              <p className="text-xs lg:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aboutMe}</p>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-xs lg:text-sm">Add something about yourself</p>
                <button
                  onClick={handleEdit}
                  className="mt-3 text-blue-600 text-xs lg:text-sm font-medium hover:text-blue-700"
                >
                  About me
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="Enter your mobile number"
              />
            </div>

            {/* ✅ NEW: Email */}
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="e.g., nagbi.safae@ensam-casa.ma"
              />
            </div>

            {/* ✅ NEW: GitHub */}
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">GitHub</label>
              <input
                type="text"
                name="github"
                value={formData.github}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="e.g., nagbisafae"
              />
            </div>

            {/* ✅ NEW: LinkedIn */}
            <div className="md:col-span-2">
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
              <input
                type="text"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                placeholder="e.g., safae-nagbi or full URL"
              />
            </div>

            {/* Location */}
            <div className="md:col-span-2">
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">Location</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                  <IoLocationOutline className="text-xs lg:text-lg text-gray-400" />
                </div>
                <div className="pl-10">
                  <Select
                    options={locationOptions}
                    value={selectedLocation}
                    onChange={(option) => setSelectedLocation(option)}
                    placeholder="Select your location"
                    isSearchable={true}
                    className="w-full"
                    styles={customSelectStyles}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-2">About me</label>
            <textarea
              name="about_me"
              value={formData.about_me}
              onChange={handleInputChange}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
              placeholder="Tell us about yourself..."
            />
            <p className="text-xs text-gray-500 mt-1">{formData.about_me.length}/500 characters</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Personal;