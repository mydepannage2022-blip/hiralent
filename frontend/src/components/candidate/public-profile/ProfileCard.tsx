"use client";

import Image from "next/image";
import { MapPin, Star, Shield } from "lucide-react";
import type { ProfileCardProps } from "@/src/types/profile";

/* ----------------------------------
 Helpers
----------------------------------- */

function safeParseJSON<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value as T;

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return fallback;
    try {
      return JSON.parse(s) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function toArray<T = any>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  const parsed = safeParseJSON<any>(value, null);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function cleanStr(v?: string | null) {
  return String(v ?? "").trim();
}

function hasNonEmptyArray(value: unknown): boolean {
  const arr = toArray<any>(value);
  return Array.isArray(arr) && arr.length > 0;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function toNumberMaybe(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function extractBackendCompleteness(profile: any): number | null {
  if (!profile) return null;

  const candidates: unknown[] = [
    // ✅ your public-profile API
    profile?.completion_score,

    // other possible shapes
    profile?.completeness_score,
    profile?.overall_score,
    profile?.profile_completeness?.overall_score,
    profile?.profileCompleteness?.overall_score,
    Array.isArray(profile?.profileCompleteness) ? profile.profileCompleteness?.[0]?.overall_score : null,
    Array.isArray(profile?.profile_completeness) ? profile.profile_completeness?.[0]?.overall_score : null,
  ];

  for (const v of candidates) {
    const n = toNumberMaybe(v);
    if (n !== null) return clamp(Math.round(n));
  }

  return null;
}

type NormalizedSkill = {
  name: string;
  category?: string;
  is_verified?: boolean;
  years_experience?: number;
};

export default function ProfileCard({ profile }: ProfileCardProps) {
  // ✅ Debug what we receive
  // eslint-disable-next-line no-console
  console.log("[ProfileCard] received completion_score:", (profile as any)?.completion_score);

  /* ----------------------------
     Normalize skills
  ----------------------------- */
  const skillsRaw =
    (profile as any)?.skills ??
    (profile as any)?.candidateSkills ??
    (profile as any)?.candidate_skills ??
    [];

  const skillsNormalized: NormalizedSkill[] = toArray<any>(skillsRaw)
    .map((s) => {
      if (typeof s === "string") return { name: cleanStr(s) };
      return {
        name: cleanStr(s?.skill_name ?? s?.name ?? s?.title),
        category: cleanStr(s?.skill_category ?? s?.category) || undefined,
        is_verified: Boolean(s?.is_verified),
        years_experience:
          typeof s?.years_experience === "number" ? s.years_experience : undefined,
      };
    })
    .filter((s) => s.name.length > 0);

  const totalSkillsCount = skillsNormalized.length;
  const verifiedSkillsCount = skillsNormalized.filter((s) => s.is_verified).length;
  const skillCategoriesCount = new Set(
    skillsNormalized.map((s) => s.category).filter(Boolean)
  ).size;

  /* ----------------------------
     ✅ Completion (backend-first)
  ----------------------------- */
  const backendOverall = extractBackendCompleteness(profile);

  const completionPercentage = (() => {
    if (backendOverall !== null) return backendOverall;

    // eslint-disable-next-line no-console
    console.warn("[ProfileCard] backend completeness missing -> using fallback", {
      keys: Object.keys(profile || {}),
    });

    let completed = 0;
    const totalFields = 8;

    if (cleanStr((profile as any)?.full_name)) completed++;
    if (cleanStr((profile as any)?.headline)) completed++;
    if (cleanStr((profile as any)?.about_me)) completed++;
    if (cleanStr((profile as any)?.profile_picture_url)) completed++;
    if (cleanStr((profile as any)?.location) || cleanStr((profile as any)?.city)) completed++;
    if (skillsNormalized.length > 0) completed++;
    if (hasNonEmptyArray((profile as any)?.experience)) completed++;
    if (hasNonEmptyArray((profile as any)?.education)) completed++;

    return Math.round((completed / totalFields) * 100);
  })();

  /* ----------------------------
     Location
  ----------------------------- */
  const locationDisplay = (() => {
    const city = cleanStr((profile as any)?.city);
    const location = cleanStr((profile as any)?.location);
    if (city && location) return `${city}, ${location}`;
    return location || city || "Location not specified";
  })();

  const initials = cleanStr((profile as any)?.full_name)?.charAt(0)?.toUpperCase() || "P";
  const hasExperience = hasNonEmptyArray((profile as any)?.experience);

  return (
    <div className="bg-white rounded-3xl shadow-lg p-4 sm:p-6 w-[250px] md:w-[400px] mx-auto">
      {/* Avatar */}
      <div className="relative w-12 h-12 sm:w-24 sm:h-24 mx-auto mb-2 sm:mb-4">
        {cleanStr((profile as any)?.profile_picture_url) ? (
          <Image
            src={(profile as any).profile_picture_url}
            alt={(profile as any).full_name || "Profile"}
            fill
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
        )}

        {verifiedSkillsCount > 0 && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
            <Shield className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="text-center mb-3">
        <h3 className="text-lg font-bold text-gray-900">
          {(profile as any)?.full_name || "Professional"}
        </h3>
        <p className="text-sm text-gray-600">
          {(profile as any)?.position || "Professional Developer"}
        </p>
      </div>

      {/* Location */}
      <div className="flex items-center justify-center gap-2 mb-4 text-sm text-gray-600">
        <MapPin className="w-4 h-4" />
        <span>{locationDisplay}</span>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-6">
        <StatRow label="Profile Completed" value={`${completionPercentage}%`} progress={completionPercentage} />
        <StatRow
          label="Total Skills"
          value={`${totalSkillsCount}`}
          extra={verifiedSkillsCount > 0 ? `${verifiedSkillsCount} verified` : undefined}
        />
        <StatRow label="Categories" value={`${skillCategoriesCount}`} />

        {hasExperience && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Experience</span>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="font-semibold text-gray-900">Professional</span>
            </div>
          </div>
        )}
      </div>

      {/* Skills preview */}
      {skillsNormalized.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Skills</h4>
          <div className="flex flex-wrap gap-2">
            {skillsNormalized.slice(0, 6).map((skill, i) => (
              <span
                key={`${skill.name}-${i}`}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  skill.is_verified
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-blue-100 text-blue-800 border-blue-200"
                }`}
              >
                {skill.name}
                {skill.is_verified && <Shield className="inline w-3 h-3 ml-1" />}
              </span>
            ))}
          </div>
        </div>
      )}

      <button className="w-full bg-[#005DDC] text-white py-3 rounded-xl font-medium hover:bg-[#0052c4] transition">
        View Full Profile
      </button>

      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-500">Available for opportunities</p>
        {cleanStr((profile as any)?.linkedin_url) && (
          <a
            href={(profile as any).linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Connect on LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  progress,
  extra,
}: {
  label: string;
  value: string;
  progress?: number;
  extra?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        {typeof progress === "number" && (
          <div className="w-16 h-2 bg-gray-200 rounded-full">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${clamp(progress)}%` }} />
          </div>
        )}
        <span className="font-semibold text-gray-900">{value}</span>
        {extra && <span className="text-xs text-green-600">({extra})</span>}
      </div>
    </div>
  );
}
