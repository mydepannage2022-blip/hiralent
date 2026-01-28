"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Edit2, User, X, Check, Plus, Mail, Linkedin, Github, Phone, MapPin } from "lucide-react";
import { IoLocationOutline } from "react-icons/io5";
import Select from "react-select";
import { useUpdateBasicInfo } from "@/src/lib/profile/profile.queries";
import { useAuth } from "@/src/context/AuthContext";
import { useProfile } from "@/src/context/ProfileContext";
import { locationOptions } from "@/src/constants/groupedLocationOptions";

const customSelectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    border: state.isFocused ? "2px solid #3B82F6" : "1px solid #e5e7eb",
    borderRadius: "8px",
    minHeight: "44px",
    boxShadow: "none",
    "&:hover": { borderColor: "#3B82F6" },
    transition: "all 0.2s ease",
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: "#9ca3af",
    fontSize: "14px",
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: "#111827",
    fontWeight: "500",
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected ? "#3B82F6" : state.isFocused ? "#f0f9ff" : "white",
    color: state.isSelected ? "white" : "#111827",
    padding: "10px 16px",
    fontSize: "14px",
    "&:hover": {
      backgroundColor: state.isSelected ? "#3B82F6" : "#f0f9ff",
    },
  }),
  menu: (provided: any) => ({
    ...provided,
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
    border: "1px solid #e5e7eb",
    zIndex: 50,
  }),
};

/* ---------------- Robust normalizers ---------------- */
const cleanRaw = (val: string) =>
  (val || "")
    .trim()
    .replace(/[)\].,;]+$/g, "")
    .replace(/^[(\[]+/g, "");

const ensureHttps = (url: string) => {
  const u = cleanRaw(url);
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `https://${u}`;
};

const normalizeEmail = (val: string) => {
  const v = cleanRaw(val);
  if (!v) return "";
  const email = v.replace(/^mailto:/i, "");
  return `mailto:${email}`;
};

const normalizeGithubUrl = (val: string) => {
  const raw = cleanRaw(val);
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/g, "");
  if (/github\.com/i.test(raw)) return ensureHttps(raw).replace(/\/+$/g, "");

  const username = raw.replace(/^@/g, "").trim();
  if (!username) return "";
  return `https://github.com/${username}`.replace(/\/+$/g, "");
};

const normalizeLinkedinUrl = (val: string) => {
  const raw = cleanRaw(val);
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/g, "");
  if (/linkedin\.com/i.test(raw)) return ensureHttps(raw).replace(/\/+$/g, "");
  if (/^in\//i.test(raw)) return `https://www.linkedin.com/${raw}`.replace(/\/+$/g, "");

  const slug = raw.replace(/^@/g, "").trim().replace(/[^a-zA-Z0-9-_]/g, "");
  if (!slug) return "";
  return `https://www.linkedin.com/in/${slug}`.replace(/\/+$/g, "");
};
/* ---------------------------------------------------- */

const Personal = () => {
  const { user } = useAuth();
  const { profileData, refetch } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  const extractedPI = (profileData as any)?.personal_info || {};

  // ✅ Prefer stored first/last name if backend provides it, else fallback to user.full_name split
  const rawFullName = useMemo(() => (user?.full_name || "").trim(), [user?.full_name]);

  const derivedFirst = useMemo(() => {
    const fromPI = String(extractedPI.first_name || "").trim();
    if (fromPI) return fromPI;
    return rawFullName.split(" ")[0] || "";
  }, [extractedPI.first_name, rawFullName]);

  const derivedLast = useMemo(() => {
    const fromPI = String(extractedPI.last_name || "").trim();
    if (fromPI) return fromPI;
    return rawFullName.split(" ").slice(1).join(" ") || "";
  }, [extractedPI.last_name, rawFullName]);

  // ✅ Build a display full name (view)
  const displayFullName = useMemo(() => {
    const combined = `${derivedFirst} ${derivedLast}`.trim();
    return combined || rawFullName || "";
  }, [derivedFirst, derivedLast, rawFullName]);

  const phone = useMemo(
    () => extractedPI.phone || user?.phone_number || "",
    [extractedPI.phone, user?.phone_number]
  );

  const location = useMemo(
    () => profileData?.location || extractedPI.location || "",
    [profileData?.location, extractedPI.location]
  );

  const email = useMemo(() => extractedPI.email || user?.email || "", [extractedPI.email, user?.email]);

  const linkedin = useMemo(
    () => (profileData as any)?.linkedin || extractedPI.linkedin || "",
    [(profileData as any)?.linkedin, extractedPI.linkedin]
  );

  const github = useMemo(
    () => (profileData as any)?.github || extractedPI.github || "",
    [(profileData as any)?.github, extractedPI.github]
  );

  const aboutMe = useMemo(() => profileData?.about_me || "", [profileData?.about_me]);

  const selectedLocationOption = useMemo(
    () => locationOptions.find((option) => option.label === location) || null,
    [location]
  );

  // ✅ Form data includes first_name + last_name (this is what you were missing)
  const [formData, setFormData] = useState({
    first_name: derivedFirst,
    last_name: derivedLast,

    // keep full_name for backwards compatibility with your backend
    full_name: displayFullName,

    phone_number: phone,
    location,
    about_me: aboutMe,
    email,
    linkedin,
    github,
  });

  const [selectedLocation, setSelectedLocation] = useState<any>(selectedLocationOption);

  useEffect(() => {
    const combined = `${derivedFirst} ${derivedLast}`.trim() || rawFullName || "";

    setFormData({
      first_name: derivedFirst,
      last_name: derivedLast,
      full_name: combined,
      phone_number: phone,
      location,
      about_me: aboutMe,
      email,
      linkedin,
      github,
    });

    setSelectedLocation(locationOptions.find((o) => o.label === location) || null);
  }, [derivedFirst, derivedLast, rawFullName, phone, location, aboutMe, email, linkedin, github]);

  const { mutate: updateBasicInfo, isPending } = useUpdateBasicInfo();

  const handleEdit = () => {
    setIsEditing(true);
    const combined = `${derivedFirst} ${derivedLast}`.trim() || rawFullName || "";

    setFormData({
      first_name: derivedFirst,
      last_name: derivedLast,
      full_name: combined,
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
    const combinedFullName = `${(formData.first_name || "").trim()} ${(formData.last_name || "").trim()}`
      .trim()
      .replace(/\s+/g, " ");

    const updatedFormData = {
      ...formData,
      full_name: combinedFullName,
      location: selectedLocation?.label || "",
      personal_info: {
        // ✅ store first/last so it’s not lost even if user.full_name is weird
        first_name: (formData.first_name || "").trim(),
        last_name: (formData.last_name || "").trim(),

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

    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      // ✅ If first/last changes, keep full_name in sync (so backend still receives it)
      if (name === "first_name" || name === "last_name") {
        const combined = `${(next.first_name || "").trim()} ${(next.last_name || "").trim()}`
          .trim()
          .replace(/\s+/g, " ");
        next.full_name = combined;
      }

      return next;
    });
  };

  const hasAboutContent = aboutMe && aboutMe.trim().length > 0;
  const emailHref = useMemo(() => normalizeEmail(email), [email]);
  const linkedinHref = useMemo(() => normalizeLinkedinUrl(linkedin), [linkedin]);
  const githubHref = useMemo(() => normalizeGithubUrl(github), [github]);

  // ✅ View values (from derived fields)
  const firstName = derivedFirst;
  const lastName = derivedLast;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
              <p className="text-sm text-gray-500">Basic details and contact information</p>
            </div>
          </div>

          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isPending ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {!isEditing ? (
          <div className="space-y-8">
            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                    <User className="w-3 h-3 text-blue-600" />
                  </div>
                  First Name
                </div>
                <p className={`text-sm font-medium ${firstName ? "text-gray-900" : "text-gray-400"}`}>
                  {firstName || "Not provided"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                    <User className="w-3 h-3 text-blue-600" />
                  </div>
                  Last Name
                </div>
                <p className={`text-sm font-medium ${lastName ? "text-gray-900" : "text-gray-400"}`}>
                  {lastName || "Not provided"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                    <Phone className="w-3 h-3 text-blue-600" />
                  </div>
                  Mobile
                </div>
                <p className={`text-sm font-medium ${phone ? "text-gray-900" : "text-gray-400"}`}>
                  {phone || "Not provided"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                    <MapPin className="w-3 h-3 text-blue-600" />
                  </div>
                  Location
                </div>
                <p className={`text-sm font-medium ${location ? "text-gray-900" : "text-gray-400"}`}>
                  {location || "Not provided"}
                </p>
              </div>
            </div>

            {/* Contact Cards */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <h3 className="text-sm font-semibold text-gray-900">Contact & Profiles</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-200 transition-colors bg-blue-50/30">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 border border-blue-100 rounded-lg flex items-center justify-center bg-white">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Email</p>
                      {email ? (
                        <a
                          href={emailHref}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors break-all"
                        >
                          {email}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-400">Add email</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-200 transition-colors bg-blue-50/30">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 border border-blue-100 rounded-lg flex items-center justify-center bg-white">
                      <Linkedin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">LinkedIn</p>
                      {linkedinHref ? (
                        <a
                          href={linkedinHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors break-all"
                        >
                          {linkedinHref.replace("https://", "")}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-400">Add profile</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-200 transition-colors bg-blue-50/30">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 border border-blue-100 rounded-lg flex items-center justify-center bg-white">
                      <Github className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">GitHub</p>
                      {githubHref ? (
                        <a
                          href={githubHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors break-all"
                        >
                          {githubHref.replace("https://", "")}
                        </a>
                      ) : (
                        <p className="text-sm text-gray-400">Add profile</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="border-t border-gray-100 pt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">About Me</h3>
                  <p className="text-sm text-gray-500">Personal introduction and summary</p>
                </div>
              </div>

              {hasAboutContent ? (
                <div className="border border-gray-200 rounded-lg p-5 bg-emerald-50/20">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aboutMe}</p>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                  onClick={handleEdit}
                >
                  <div className="w-12 h-12 border border-gray-200 rounded-full flex items-center justify-center mb-4 bg-gray-50">
                    <Plus className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-sm mb-2">Add something about yourself</p>
                  <button className="text-blue-600 text-sm font-medium hover:text-blue-700">About me</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Edit Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ✅ NEW: First name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Enter your first name"
                />
              </div>

              {/* ✅ NEW: Last name */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Enter your last name"
                />
              </div>

              {/* ✅ Keep phone */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Mobile Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Enter your mobile number"
                />
              </div>

              {/* ✅ Keep email */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="e.g., john@example.com"
                />
              </div>

              {/* ✅ Keep GitHub */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">GitHub</label>
                <input
                  type="text"
                  name="github"
                  value={formData.github}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="e.g., github.com/username"
                />
              </div>

              {/* ✅ Keep LinkedIn */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-900">LinkedIn</label>
                <input
                  type="text"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="e.g., linkedin.com/in/username"
                />
              </div>

              {/* ✅ Keep Location */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-gray-900">Location</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                    <IoLocationOutline className="text-gray-400" />
                  </div>
                  <div className="pl-12">
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

            {/* About Me Section */}
            <div className="border-t border-gray-100 pt-8">
              <div className="space-y-2 mb-6">
                <label className="block text-sm font-medium text-gray-900">About me</label>
                <p className="text-sm text-gray-500">Write a brief introduction about yourself</p>
              </div>
              <div className="relative">
                <textarea
                  name="about_me"
                  value={formData.about_me}
                  onChange={handleInputChange}
                  rows={6}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors resize-none"
                  placeholder="Tell us about your background, skills, and interests..."
                />
                <div className="absolute bottom-3 right-3">
                  <span
                    className={`text-xs ${
                      formData.about_me.length >= 500 ? "text-red-500" : "text-gray-500"
                    }`}
                  >
                    {formData.about_me.length}/500
                  </span>
                </div>
              </div>
            </div>

            {/* (Optional) Helper text showing what will be saved */}
            <div className="text-xs text-gray-500">
              Saving as full name:{" "}
              <span className="font-medium text-gray-700">{formData.full_name || "—"}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Personal;
