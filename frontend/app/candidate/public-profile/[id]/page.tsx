"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getPublicProfile } from "@/src/lib/profile/profile.api";

import Hero from "@/src/components/candidate/public-profile/Hero";
import SkillsSection from "@/src/components/candidate/public-profile/Skillssection";
import ExperienceSection from "@/src/components/candidate/public-profile/Experiencesection";
import EducationSection from "@/src/components/candidate/public-profile/Educationsection";
import LogosStrip from "@/src/components/candidate/public-profile/LogosStrip";
import TestimonialSlider from "@/src/components/company/home/TestimonialSlider";
import BlogSection from "@/src/components/company/public-profile/Blog";

import type { PublicProfileData } from "@/src/types/profile";

/* -----------------------------------------
  Helpers (robust parsing + normalization)
------------------------------------------ */

function safeParseJSON<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;

  // already parsed
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
  // sometimes backend sends stringified json
  const parsed = safeParseJSON<any>(value, null);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function uniqueStrings(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function normalizeSkills(input: unknown): {
  skillNames: string[];
  categories: string[];
  rawCount: number;
} {
  const arr = toArray<any>(input);

  // case 1: ["React", "Node", ...]
  if (arr.every((x) => typeof x === "string")) {
    const names = uniqueStrings(arr.map(String));
    return { skillNames: names, categories: [], rawCount: names.length };
  }

  // case 2: [{ skill_name, skill_category, ... }, ...]
  const names = uniqueStrings(
    arr
      .map((x) => x?.skill_name ?? x?.name ?? x?.title ?? "")
      .map(String)
      .map((s) => s.trim())
  );

  const cats = uniqueStrings(
    arr
      .map((x) => x?.skill_category ?? x?.category ?? "")
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean)
  );

  return { skillNames: names, categories: cats, rawCount: arr.length };
}

function pickNumber(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

/* -----------------------------------------
  Page
------------------------------------------ */

export default function PublicProfilePage() {
  // ✅ HOOKS FIRST (always)
  const params = useParams();
  const router = useRouter();
  const candidateId = (params?.id as string) || "";

  // Auth guard — only signed-in users may view profiles
  const [authorized, setAuthorized] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    setAuthorized(true);
  }, []);

  const { data: profileResponse, isLoading, error } = useQuery({
    queryKey: ["public-profile", candidateId],
    queryFn: () => getPublicProfile(candidateId),
    enabled: !!candidateId,
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Normalize profile object (some APIs wrap differently)
  const profile = useMemo<PublicProfileData | null>(() => {
    const ok = (profileResponse as any)?.success;
    const data = (profileResponse as any)?.data;
    if (!ok || !data) return null;
    return data as PublicProfileData;
  }, [profileResponse]);

  // ✅ Parse JSON fields safely (no crashes)
  const experience = useMemo(() => toArray<any>(profile?.experience), [profile?.experience]);
  const education = useMemo(() => toArray<any>(profile?.education), [profile?.education]);
  const languages = useMemo(() => toArray<any>(profile?.languages), [profile?.languages]);
  const links = useMemo(() => toArray<any>(profile?.links), [profile?.links]);

  // ✅ Skills are the #1 mismatch usually
  const skillsNormalized = useMemo(() => {
    // try multiple possible places
    const skillsAny =
      (profile as any)?.skills ??
      (profile as any)?.candidateSkills ??
      (profile as any)?.candidate_skills ??
      [];
    return normalizeSkills(skillsAny);
  }, [profile]);

  // ✅ Optional sections: depends on what public API returns
  const certifications = useMemo(() => {
    const raw =
      (profile as any)?.certifications ??
      (profile as any)?.certificates ??
      (profile as any)?.credentials ??
      [];
    return toArray<any>(raw);
  }, [profile]);

  const projects = useMemo(() => {
    const raw = (profile as any)?.projects ?? [];
    return toArray<any>(raw);
  }, [profile]);

  const completionScore = useMemo(() => {
    // try common keys
    return pickNumber(
      (profile as any)?.completion_score,
      (profile as any)?.completionScore,
      (profile as any)?.overall_score,
      (profile as any)?.overallScore,
      (profile as any)?.profile_completion,
      (profile as any)?.profileCompletion
    );
  }, [profile]);

  // Derived quick stats (fallback if backend doesn’t send them)
  const totalSkills = useMemo(() => {
    return (
      pickNumber((profile as any)?.total_skills, (profile as any)?.skills_count) ??
      skillsNormalized.skillNames.length
    );
  }, [profile, skillsNormalized.skillNames.length]);

  const categoriesCount = useMemo(() => {
    return (
      pickNumber((profile as any)?.categories_count, (profile as any)?.skills_categories_count) ??
      skillsNormalized.categories.length
    );
  }, [profile, skillsNormalized.categories.length]);

  // ✅ Debug (remove later)
  useMemo(() => {
    if (!profile) return;
    // eslint-disable-next-line no-console
    console.log("🧾 Public profile keys:", Object.keys(profile as any));
    // eslint-disable-next-line no-console
    console.log("🧩 Raw skills:", (profile as any)?.skills);
  }, [profile]);

  /* ----------------------------
     AFTER hooks: render states
  ----------------------------- */

  if (!authorized) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EFF5FF]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EFF5FF]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">
            The candidate profile you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Testimonials data (static)
  const testimonials = [
    {
      description:
        "I had a great experience using this job portal! The application process was smooth, and I was able to find several relevant opportunities in no time.",
      name: "Albert Flores",
      role: "HR Manager",
      avatar: "/images/clienttest1.png",
      company: { name: "Warephase", logo: "/images/comptest1.png" },
    },
    {
      description:
        "I'm so happy with the results! I found multiple job listings that matched my skills and interests. The website is easy to navigate, and I received timely updates on my applications.",
      name: "Jane Cooper",
      role: "Product Manager",
      avatar: "/images/clienttest2.png",
      company: { name: "Iselectrics", logo: "/images/comptest2.png" },
    },
    {
      description:
        "This platform made my job search so much easier. I appreciated the variety of jobs available, and the search filters really helped me find the right fit quickly.",
      name: "Dianne Russell",
      role: "Software Engineer",
      avatar: "/images/clienttest3.png",
      company: { name: "TechCorp", logo: "/images/comptest3.png" },
    },
  ];

  return (
    <main className="bg-white">
      {/* Hero */}
      <Hero
        profile={{
          ...(profile as any),
          // inject computed fallbacks so the hero card stops showing zeros
          total_skills: totalSkills,
          categories_count: categoriesCount,
          completion_score: completionScore ?? (profile as any)?.completion_score,
        }}
      />

      <LogosStrip />

      {/* Skills */}
      <SkillsSection
        // SkillsSection often expects string[] (chips). We pass normalized names.
        skills={skillsNormalized.skillNames}
      />

      {/* Optional: Certifications + Projects */}
      {(certifications.length > 0 || projects.length > 0) && (
        <div className="py-10 bg-white">
          <div className="max-w-[1345px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {projects.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Projects</h3>
                    <span className="text-sm font-semibold text-blue-700">{projects.length}</span>
                  </div>
                  <div className="space-y-3">
                    {projects.map((p: any, idx: number) => (
                      <div key={idx} className="rounded-xl bg-white border border-gray-200 p-4">
                        <p className="font-semibold text-gray-900">{p?.title || p?.name || "Project"}</p>
                        {p?.description && <p className="text-sm text-gray-600 mt-1">{p.description}</p>}
                        {(p?.url || p?.link) && (
                          <a
                            className="text-sm text-blue-700 font-semibold mt-2 inline-block"
                            href={p?.url || p?.link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {certifications.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Certifications</h3>
                    <span className="text-sm font-semibold text-blue-700">{certifications.length}</span>
                  </div>
                  <div className="space-y-3">
                    {certifications.map((c: any, idx: number) => (
                      <div key={idx} className="rounded-xl bg-white border border-gray-200 p-4">
                        <p className="font-semibold text-gray-900">{c?.name || c?.title || "Certification"}</p>
                        {(c?.issuer || c?.organization) && (
                          <p className="text-sm text-gray-600 mt-1">{c?.issuer || c?.organization}</p>
                        )}
                        {(c?.date || c?.issued_at) && (
                          <p className="text-xs text-gray-500 mt-1">{String(c?.date || c?.issued_at)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Experience & Education */}
      <div className="py-8 sm:py-16 bg-gray-50">
        <div className="max-w-[400px] sm:max-w-[740px] md:max-w-[970px] lg:max-w-[1090px] xl:max-w-[1345px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-12">
            <ExperienceSection experience={experience} />
            <EducationSection education={education} />
          </div>
        </div>
      </div>

      {/* Languages & Links */}
      {(languages.length > 0 || links.length > 0) && (
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12">
              {languages.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Languages</h3>
                  <div className="grid gap-4">
                    {languages.map((lang: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-900">{lang.language}</span>
                          <span className="text-sm text-gray-600 capitalize">{lang.proficiency}</span>
                        </div>
                        {lang.notes && <p className="text-sm text-gray-600 mt-2">{lang.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {links.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Links</h3>
                  <div className="grid gap-4">
                    {links.map((link: any, index: number) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-900">{link.platform}</span>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{link.display_name || link.url}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Testimonials */}
      <div className="py-0 sm:py-16 bg-gray-50">
        <div className="max-w-[1345px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-0 sm:mb-12">
            What People Say
          </h2>
          <TestimonialSlider testimonials={testimonials} />
        </div>
      </div>

      <BlogSection />
    </main>
  );
}
