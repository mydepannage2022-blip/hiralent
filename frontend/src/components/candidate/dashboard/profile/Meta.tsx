"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { API_HOST } from "@/src/lib/config/api";
import {
  MapPin,
  BadgeCheck,
  AlertTriangle,
  FileText,
  Link as LinkIcon,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Sparkles,
  Camera,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { useProfile } from "@/src/context/ProfileContext";
import { useUploadProfilePicture } from "@/src/lib/profile/profile.queries";

/* ---------------- helpers ---------------- */

function cleanStr(v?: any) {
  return String(v ?? "").trim();
}

function parseJsonArray<T>(value: any): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toAbsoluteUrl(raw?: string | null) {
  const v = cleanStr(raw);
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;

  const apiUrl = API_HOST.trim();
  const base = apiUrl.replace(/\/+$/, "");
  const path = v.startsWith("/") ? v : `/${v}`;
  return `${base}${path}`;
}

function clampList<T>(arr: T[], n: number) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, Math.max(0, n));
}

/* ---------------------------------------- */

export default function MetaSection() {
  const { user } = useAuth();
  const { profileData } = useProfile();
  const reduceMotion = useReducedMotion();

  const { mutate: uploadProfilePicture, isPending: isUploading } = useUploadProfilePicture();

  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const profilePicture =
    previewUrl ||
    cleanStr((profileData as any)?.profile_picture_url) ||
    "/images/candidate.jpg";

  const fullName = cleanStr(user?.full_name) || "Unknown User";
  const headline =
    cleanStr((profileData as any)?.headline) ||
    cleanStr((profileData as any)?.about_me) ||
    cleanStr(user?.email);

  const location = cleanStr((profileData as any)?.location);
  const isVerified = !!user?.is_email_verified;

  const resumeUrl = useMemo(() => {
    return toAbsoluteUrl((profileData as any)?.resume_application_url);
  }, [profileData]);

  const links = useMemo(() => {
    return parseJsonArray<{ platform?: string; url?: string; display_name?: string }>(
      (profileData as any)?.links
    ).filter((x) => cleanStr(x?.url));
  }, [profileData]);

  const skills = useMemo(() => {
    const raw = (profileData as any)?.skills ?? (profileData as any)?.candidate_skills;
    const arr = parseJsonArray<any>(raw);
    return arr.map((s) => cleanStr(s?.skill_name ?? s?.name ?? s)).filter(Boolean);
  }, [profileData]);

  const experience = useMemo(() => {
    return parseJsonArray<{ job_title?: string; company?: string }>((profileData as any)?.experience);
  }, [profileData]);

  const education = useMemo(() => {
    return parseJsonArray<{ degree?: string; institution?: string }>((profileData as any)?.education);
  }, [profileData]);

  const topSkills = clampList(skills, 2);
  const extraSkillsCount = Math.max(0, skills.length - topSkills.length);

  const topExp = experience?.[0];
  const topEdu = education?.[0];

  const handleViewResume = () => {
    if (!resumeUrl) {
      alert("Resume not available. Please upload your resume first.");
      return;
    }
    window.open(resumeUrl, "_blank", "noopener,noreferrer");
  };

  const onPickPhoto = (file: File) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      alert("Please choose a valid image (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be less than 5MB.");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsEditingPhoto(true);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onPickPhoto(f);
  };

  const handleCancelPhoto = () => {
    setIsEditingPhoto(false);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleSavePhoto = () => {
    if (!selectedFile) return;

    uploadProfilePicture(selectedFile, {
      onSuccess: () => {
        setIsEditingPhoto(false);
        setSelectedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      },
      onError: (err) => {
        console.error(err);
        alert("Upload failed. Please try again.");
      },
    });
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const floaty = reduceMotion
    ? {}
    : { animate: { y: [0, -2, 0] }, transition: { duration: 6, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto w-full max-w-[740px] overflow-hidden rounded-2xl border border-[#EDEDED] bg-white"
      >
        {/* smaller background blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-10 h-32 w-32 rounded-full bg-blue-50" />
          <div className="absolute left-24 top-24 h-44 w-44 rounded-full bg-blue-100/60" />
          <div className="absolute right-8 top-10 h-32 w-32 rounded-full bg-sky-50" />
        </div>

        {/* smaller orbit lines (so no cropping) */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[200px] w-[200px] rounded-full border border-dashed border-blue-200/70" />
          <div className="absolute h-[280px] w-[280px] rounded-full border border-dashed border-blue-200/40" />
        </div>

        {/* tiny moving dots (smaller radius) */}
        {!reduceMotion && (
          <div className="pointer-events-none absolute inset-0">
            <motion.span
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-blue-500/80"
              style={{ translateX: -120, translateY: -20 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
            />
            <motion.span
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-blue-400/70"
              style={{ translateX: 102, translateY: 56 }}
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}

        {/* ✅ tighter grid + narrower cards */}
        <div className="relative grid grid-cols-1 items-center gap-3 p-3 lg:grid-cols-[250px_1fr_250px] lg:gap-4 lg:p-4">
          {/* LEFT CARD */}
          <motion.div
            {...floaty}
            whileHover={reduceMotion ? undefined : { y: -2, scale: 1.003 }}
            className="rounded-2xl border border-gray-200 bg-white/92 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.07)] backdrop-blur"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold leading-snug text-gray-900">
                  <span className="line-clamp-2 break-words">{headline || "Your headline"}</span>
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-600">
                  {location ? (
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <MapPin className="h-3.5 w-3.5 text-blue-600" />
                      <span className="truncate">{location}</span>
                    </span>
                  ) : null}

                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                      isVerified
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {isVerified ? <BadgeCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {isVerified ? "Verified" : "Not verified"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 pt-1 shrink-0">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className={`h-[7px] w-[7px] rounded-full ${i < 5 ? "bg-blue-500" : "bg-blue-200"}`} />
                ))}
              </div>
            </div>

            <div className="mt-2.5 space-y-2.5">
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-gray-700">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  Highlighted skills
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {topSkills.length ? (
                    <>
                      {topSkills.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
                        >
                          {s}
                        </span>
                      ))}
                      {extraSkillsCount > 0 ? (
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                          +{extraSkillsCount} more
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-[10px] text-gray-500">No skills yet</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <LinkIcon className="h-3.5 w-3.5 text-blue-600" />
                  Links: {links.length}
                </span>
                <span>Skills: {skills.length}</span>
              </div>

              <button
                onClick={handleViewResume}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-blue-700 active:translate-y-[1px]"
              >
                <FileText className="h-4 w-4" />
                View Resume
                <ExternalLink className="h-4 w-4 opacity-90" />
              </button>
            </div>
          </motion.div>

          {/* CENTER AVATAR */}
          <div className="relative flex items-center justify-center py-1 lg:py-0">
            <motion.div
              animate={reduceMotion ? undefined : { scale: [1, 1.01, 1] }}
              transition={reduceMotion ? undefined : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <div className="h-32 w-32 rounded-full bg-blue-100/70 p-2 shadow-[0_16px_44px_rgba(37,99,235,0.14)] lg:h-36 lg:w-36">
                <div className="relative h-full w-full rounded-full bg-white p-2">
                  <img src={profilePicture} alt="Candidate" className="h-full w-full rounded-full object-cover" />

                  <label className="group absolute inset-0 cursor-pointer rounded-full">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handleFileInput}
                      disabled={isUploading}
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition group-hover:bg-black/35">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-blue-600 opacity-0 shadow-md transition group-hover:opacity-100">
                        <Camera className="h-5 w-5" />
                      </div>
                    </div>
                  </label>

                  {/* ✅ always visible */}
                  {isEditingPhoto && (
                    <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2">
                      <button
                        onClick={handleCancelPhoto}
                        disabled={isUploading}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <button
                        onClick={handleSavePhoto}
                        disabled={!selectedFile || isUploading}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                        title="Save"
                      >
                        {isUploading ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <motion.div
                whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                  <LinkIcon className="h-4 w-4" />
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* RIGHT CARD */}
          <motion.div
            {...floaty}
            whileHover={reduceMotion ? undefined : { y: -2, scale: 1.003 }}
            className="rounded-2xl border border-gray-200 bg-white/92 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.07)] backdrop-blur"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-gray-900">Profile summary</p>
                <p className="mt-0.5 text-[10px] text-gray-500">Quick snapshot</p>
              </div>

              <div className="flex items-center gap-1 pt-1 shrink-0">
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i} className={`h-[7px] w-[7px] rounded-full ${i < 4 ? "bg-blue-500" : "bg-blue-200"}`} />
                ))}
              </div>
            </div>

            <div className="mt-2.5 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-gray-800">Latest experience</p>
                  <p className="truncate text-[10px] text-gray-600">
                    {topExp
                      ? `${cleanStr(topExp.job_title) || "Role"} · ${cleanStr(topExp.company) || "Company"}`
                      : "No experience added"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-gray-800">Education</p>
                  <p className="truncate text-[10px] text-gray-600">
                    {topEdu
                      ? `${cleanStr(topEdu.degree) || "Degree"} · ${cleanStr(topEdu.institution) || "Institution"}`
                      : "No education added"}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2 text-[10px] text-gray-500">
                <span className="truncate">{fullName}</span>
                <span className="shrink-0">{skills.length} skills</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
