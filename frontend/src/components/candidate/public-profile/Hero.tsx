"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import ProfileCard from "./ProfileCard";
import { Download, MapPin, Globe } from "lucide-react";
import type { HeroProps, ParsedLanguage } from "@/src/types/profile";

/* -----------------------------
  Helpers: safe parsing + normalize
------------------------------ */

function safeParseJSON<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;

  // already parsed object/array
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

function normalizeSkillsObjects(input: unknown): Array<{ years_experience?: number }> {
  const arr = toArray<any>(input);

  // if backend/front gives string[] => can't compute years
  if (arr.every((x) => typeof x === "string")) return [];

  // if objects array => keep objects
  return arr.filter((x) => typeof x === "object" && x !== null);
}

export default function Hero({ profile }: HeroProps) {
  // ✅ languages can be: JSON string | array | undefined
  const languages: ParsedLanguage[] = useMemo(() => {
    const raw = (profile as any)?.languages;
    const arr = toArray<any>(raw);

    return arr
      .map((x) => {
        // support both {language, proficiency} and "Arabic"
        if (typeof x === "string") return { language: cleanStr(x) } as ParsedLanguage;

        return {
          language: cleanStr(x?.language),
          proficiency: cleanStr(x?.proficiency),
          notes: cleanStr(x?.notes),
        } as ParsedLanguage;
      })
      .filter((x) => cleanStr((x as any)?.language).length > 0);
  }, [profile]);

  // ✅ location label (city + location)
  const locationDisplay = useMemo(() => {
    const city = cleanStr((profile as any)?.city);
    const location = cleanStr((profile as any)?.location);
    if (city && location) return `${city}, ${location}`;
    return location || city || "Location not specified";
  }, [profile]);

  // ✅ country flag (safe)
  const countryFlag = useMemo(() => {
    const location = cleanStr((profile as any)?.location).toLowerCase();
    if (location.includes("uae") || location.includes("emirates")) return "/images/uaeflag.png";
    if (location.includes("pak") || location.includes("pakistan")) return "/images/pkflag.png";
    if (location.includes("usa") || location.includes("america")) return "/images/usaflag.png";
    return null;
  }, [profile]);

  // ✅ total experience:
  // - works when skills are objects
  // - if skills are string[] (your normalized public page), fallback to 2
  const totalExperience = useMemo(() => {
    const skillsRaw =
      (profile as any)?.skills ??
      (profile as any)?.candidateSkills ??
      (profile as any)?.candidate_skills ??
      [];

    const skillObjects = normalizeSkillsObjects(skillsRaw);
    if (!skillObjects.length) return 2;

    const years = skillObjects
      .map((s) => Number(s?.years_experience ?? 0))
      .filter((n) => !Number.isNaN(n));

    const maxExp = years.length ? Math.max(...years) : 0;
    return maxExp > 0 ? maxExp : 2;
  }, [profile]);

  // ✅ resume url: relative => prefix API base
  const resumeUrl = useMemo(() => {
    const raw = cleanStr((profile as any)?.resume_application_url);
    if (!raw) return "";

    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").trim();
    const base = apiUrl.replace(/\/+$/, "");
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return `${base}${path}`;
  }, [profile]);

  const firstName = useMemo(() => {
    const full = cleanStr((profile as any)?.full_name);
    if (!full) return "Professional";
    return full.split(" ").filter(Boolean)[0] || "Professional";
  }, [profile]);

  const position = cleanStr((profile as any)?.position) || "Professional Development";
  const headline = cleanStr((profile as any)?.headline);
  const aboutMe = cleanStr((profile as any)?.about_me);
  const linkedinUrl = cleanStr((profile as any)?.linkedin_url);

  return (
    <section className="px-4 sm:p-0 relative bg-[#EFF5FF] overflow-hidden">
      {/* Background SVG shape */}
      <svg
        className="absolute right-[-200px] top-[535px] w-[575px] h-[575px] sm:right-[0px] sm:top-[350px] sm:w-[615px] sm:h-[615px] md:right-[0px] md:top-[350px] md:w-[640px] md:h-[640px] lg:right-[-150px] lg:top-[115px] lg:w-[1024px] lg:h-[1024px] xl:right-[-100px] xl:top-[115px] 2xl:right-[400px] 2xl:top-[115px] xl:w-[1080px] xl:h-[1080px] text-[#005DDC] z-0"
        viewBox="0 0 1304 1294"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M343.084 0L403.837 509.014L0 936.583L622.421 1293.63L816.085 745.495L1303.12 554.278L343.084 0Z"
          fill="currentColor"
        />
      </svg>

      <div className="sm:max-w-[690px] md:max-w-[920px] lg:max-w-5xl xl:max-w-7xl container mx-auto py-20 pt-30 sm:py-40 grid lg:grid-cols-2 gap-8 items-start relative z-10">
        {/* LEFT: Text block */}
        <div className="sm:max-w-xl text-center sm:text-left">
          <h1 className="text-4xl sm:text-5xl lg:text-5xl font-bold leading-tight text-[#111827]">
            <span className="inline-block name-highlight">Meet {firstName}</span>
          </h1>

          <p className="mt-2 text-base md:text-2xl font-semibold text-[#1f2937]">
            {totalExperience} years in {position}
          </p>

          {/* Headline */}
          {headline && (
            <p className="mt-6 text-sm md:text-base text-[#4b5563] sm:max-w-lg">{headline}</p>
          )}

          {/* About Me */}
          {aboutMe && (
            <p className="mt-4 text-sm md:text-base text-[#4b5563] sm:max-w-lg">{aboutMe}</p>
          )}

          {/* Location & Language Info */}
          <div className="mt-6 flex flex-wrap justify-center sm:justify-start items-center gap-3 text-sm">
            {/* Location */}
            <div className="flex items-center gap-2 text-[#374151]">
              <MapPin className="w-4 h-4" />
              <span className="font-semibold">{locationDisplay}</span>
            </div>

            {/* Languages */}
            {languages.length > 0 && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#374151]" />
                <span className="text-[#374151] font-semibold">
                  {languages.map((lang) => cleanStr((lang as any)?.language)).join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Country Flag and Name */}
          <div className="mt-4">
            <span className="inline-flex items-center gap-2 bg-[#005DDC] text-white px-3 py-2 rounded-full text-sm font-medium">
              {countryFlag ? (
                <Image src={countryFlag} width={18} height={12} alt="Flag" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              {firstName} in {cleanStr((profile as any)?.location) || "Available"}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap gap-4 justify-center sm:justify-start">
            <button
              className="rounded-full px-5 py-3 bg-[#1B1B1B] text-white font-medium shadow-sm hover:opacity-95 transition"
              aria-label="Contact for opportunity"
              type="button"
            >
              Contact for Opportunity
            </button>

            {resumeUrl && (
              <a
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full px-5 py-3 border-2 border-[#1B1B1B29] flex items-center gap-2 font-medium hover:bg-yellow-50 transition"
                aria-label="Download CV"
              >
                Download CV
                <Download className="w-4 h-4" />
              </a>
            )}

            {linkedinUrl && (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full px-5 py-3 border-2 border-[#1B1B1B29] flex items-center gap-2 font-medium hover:bg-blue-50 transition"
                aria-label="View LinkedIn"
              >
                LinkedIn Profile
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* RIGHT: Profile Card */}
        <div className="relative">
          <div className="sm:absolute sm:-top-100 sm:left-110 md:left-130 md:-top-100 lg:left-[-18px] lg:-top-10 relative flex justify-center sm:justify-start">
            {profile && <ProfileCard profile={profile} />}
          </div>
        </div>
      </div>
    </section>
  );
}
