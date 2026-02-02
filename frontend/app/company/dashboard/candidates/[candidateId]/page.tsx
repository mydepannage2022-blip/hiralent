"use client";

import React, { useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  Briefcase,
  GraduationCap,
  Languages,
  BadgeCheck,
  FileText,
} from "lucide-react";

import { useInternalCandidateDetails } from "@/src/lib/company/candidates.queries";

function initials(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "C";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function safeArray<T = any>(v: any): T[] {
  if (Array.isArray(v)) return v as T[];
  return [];
}

function safeString(v: any) {
  if (typeof v === "string") return v;
  return "";
}

function parseMaybeJson<T = any>(v: any): T | null {
  if (!v) return null;

  // Already object/array
  if (typeof v === "object") return v as T;

  // JSON string
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;

    // Sometimes backend stores JSON as string
    if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
      try {
        return JSON.parse(s) as T;
      } catch {
        return null;
      }
    }
  }

  return null;
}

function formatMoney(v: any) {
  if (v == null) return null;
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat().format(n);
}

function normalizeLinks(v: any): Array<{ label: string; url: string }> {
  // v can be object, array, or JSON string
  const parsed = parseMaybeJson<any>(v) ?? v;

  if (Array.isArray(parsed)) {
    return parsed
      .map((x) => {
        if (!x) return null;
        if (typeof x === "string") return { label: x, url: x };
        if (typeof x === "object") {
          const label = x.label ?? x.name ?? x.type ?? x.title ?? "link";
          const url = x.url ?? x.href ?? x.link ?? "";
          return url ? { label: String(label), url: String(url) } : null;
        }
        return null;
      })
      .filter(Boolean) as any;
  }

  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed)
      .map(([k, val]) => {
        const url = typeof val === "string" ? val : (val as any)?.url;
        if (!url) return null;
        return { label: k, url: String(url) };
      })
      .filter(Boolean) as any;
  }

  return [];
}

function normalizeLanguages(v: any): Array<{ language: string; proficiency?: string }> {
  const parsed = parseMaybeJson<any>(v) ?? v;
  if (Array.isArray(parsed)) {
    return parsed
      .map((x) => {
        if (!x) return null;
        if (typeof x === "string") return { language: x };
        if (typeof x === "object") {
          return {
            language: String(x.language ?? x.name ?? "Language"),
            proficiency: x.proficiency ? String(x.proficiency) : undefined,
          };
        }
        return null;
      })
      .filter(Boolean) as any;
  }
  if (typeof parsed === "string") {
    return parsed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ language: s }));
  }
  return [];
}

function normalizeExperience(v: any): Array<{
  company?: string;
  job_title?: string;
  duration?: string;
  description?: string;
}> {
  const parsed = parseMaybeJson<any>(v) ?? v;
  if (Array.isArray(parsed)) {
    return parsed
      .map((x) => {
        if (!x) return null;
        if (typeof x !== "object") return null;
        return {
          company: x.company ? String(x.company) : undefined,
          job_title: x.job_title ? String(x.job_title) : x.title ? String(x.title) : undefined,
          duration: x.duration ? String(x.duration) : undefined,
          description: x.description ? String(x.description) : undefined,
        };
      })
      .filter(Boolean) as any;
  }
  return [];
}

function normalizeEducation(v: any): Array<{
  institution?: string;
  degree?: string;
  field?: string;
  year?: string;
  honors?: string;
}> {
  const parsed = parseMaybeJson<any>(v) ?? v;
  if (Array.isArray(parsed)) {
    return parsed
      .map((x) => {
        if (!x) return null;
        if (typeof x !== "object") return null;
        return {
          institution: x.institution ? String(x.institution) : undefined,
          degree: x.degree ? String(x.degree) : undefined,
          field: x.field ? String(x.field) : undefined,
          year: x.year ? String(x.year) : undefined,
          honors: x.honors ? String(x.honors) : undefined,
        };
      })
      .filter(Boolean) as any;
  }
  return [];
}

export default function CandidateDetailsPage() {
  const router = useRouter();
  const params = useParams() as { candidateId?: string };

  const candidateId = String(params?.candidateId ?? "");
  const detailsQ = useInternalCandidateDetails(candidateId);

  const data = detailsQ.data;

  const profile = data?.candidateProfile ?? {};
  const fullName = data?.full_name ?? "Candidate";
  const email = data?.email ?? null;
  const phone = (data as any)?.phone_number ?? null;

  const headline =
    profile?.headline ??
    profile?.position ??
    (data as any)?.position ??
    null;

  const city = profile?.city ?? null;
  const location = profile?.location ?? null;
  const locationLabel = [city, location].filter(Boolean).join(", ") || null;

  const about =
    profile?.about_me ??
    profile?.summary ??
    profile?.bio ??
    null;

  const skills =
    safeArray<string>(profile?.skills) ||
    [];

  const picture =
    profile?.profile_picture_url ??
    profile?.profile_picture ??
    profile?.avatar_url ??
    null;

  const links = useMemo(() => normalizeLinks(profile?.links), [profile?.links]);
  const languages = useMemo(
    () => normalizeLanguages(profile?.languages),
    [profile?.languages]
  );

  const experience = useMemo(
    () => normalizeExperience(profile?.experience),
    [profile?.experience]
  );

  const education = useMemo(
    () => normalizeEducation(profile?.education),
    [profile?.education]
  );

  const preferredLocations = useMemo(() => {
    const v = profile?.preferred_locations;
    const parsed = parseMaybeJson<any>(v) ?? v;
    if (Array.isArray(parsed)) return parsed.map((x) => String(x));
    if (typeof parsed === "string") {
      return parsed.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [profile?.preferred_locations]);

  const minSalary = profile?.minimum_salary_amount ?? null;
  const paymentPeriod = profile?.payment_period ?? null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {/* Top card */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-2xl border bg-gray-50 flex items-center justify-center">
                {picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={picture} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-blue-700">
                    {initials(fullName)}
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="text-xl font-semibold truncate">{fullName}</div>
                {headline ? (
                  <div className="mt-1 text-sm text-gray-600 truncate">{headline}</div>
                ) : null}

                {locationLabel ? (
                  <div className="mt-2 inline-flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    {locationLabel}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              {email ? (
                <a
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  href={`mailto:${email}`}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </a>
              ) : null}

              {phone ? (
                <a
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  href={`tel:${phone}`}
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Loading / Error */}
        {detailsQ.isLoading ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600">
            Loading candidate...
          </div>
        ) : detailsQ.isError ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-red-600">
            {String((detailsQ.error as any)?.message ?? "Failed to load candidate")}
          </div>
        ) : !data ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600">
            Candidate not found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Left / main */}
            <div className="lg:col-span-2 space-y-4">
              {/* About */}
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4" />
                  About
                </div>
                <div className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {about ? safeString(about) : "—"}
                </div>
              </div>

              {/* Experience */}
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <Briefcase className="h-4 w-4" />
                  Experience
                </div>

                <div className="mt-3 space-y-3">
                  {experience.length ? (
                    experience.map((e, idx) => (
                      <div key={idx} className="rounded-xl border bg-gray-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium text-gray-900">
                            {e.job_title ?? "—"}
                          </div>
                          {e.duration ? (
                            <div className="text-xs text-gray-600">{e.duration}</div>
                          ) : null}
                        </div>
                        {e.company ? (
                          <div className="text-sm text-gray-700 mt-1">{e.company}</div>
                        ) : null}
                        {e.description ? (
                          <div className="text-sm text-gray-700 mt-2 whitespace-pre-line">
                            {e.description}
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-600">—</div>
                  )}
                </div>
              </div>

              {/* Education */}
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <GraduationCap className="h-4 w-4" />
                  Education
                </div>

                <div className="mt-3 space-y-3">
                  {education.length ? (
                    education.map((e, idx) => (
                      <div key={idx} className="rounded-xl border bg-gray-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium text-gray-900">
                            {e.institution ?? "—"}
                          </div>
                          {e.year ? (
                            <div className="text-xs text-gray-600">{e.year}</div>
                          ) : null}
                        </div>

                        <div className="mt-1 text-sm text-gray-700">
                          {[e.degree, e.field].filter(Boolean).join(" — ") || "—"}
                        </div>

                        {e.honors ? (
                          <div className="mt-2 text-xs text-gray-600">
                            Honors: {e.honors}
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-600">—</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Skills */}
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <BadgeCheck className="h-4 w-4" />
                  Skills
                </div>

                <div className="mt-3">
                  {skills.length ? (
                    <div className="flex flex-wrap gap-2">
                      {skills.slice(0, 24).map((s) => (
                        <span
                          key={s}
                          className="rounded-full border bg-gray-50 px-2.5 py-1 text-xs text-gray-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">—</div>
                  )}
                </div>
              </div>

              {/* Preferences */}
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="font-semibold">Preferences</div>

                <div className="mt-3 space-y-3 text-sm text-gray-700">
                  <div>
                    <div className="text-xs font-medium text-gray-500">Preferred locations</div>
                    <div className="mt-1">
                      {preferredLocations.length ? preferredLocations.join(", ") : "—"}
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-500">
                      <Languages className="h-4 w-4" />
                      Languages
                    </div>
                    <div className="mt-2 space-y-1">
                      {languages.length ? (
                        languages.map((l, idx) => (
                          <div key={idx} className="text-sm text-gray-700">
                            {l.language}
                            {l.proficiency ? (
                              <span className="text-gray-500"> — {l.proficiency}</span>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div>—</div>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="text-xs font-medium text-gray-500">Minimum salary</div>
                    <div className="mt-1">
                      {minSalary != null
                        ? `${formatMoney(minSalary)}${paymentPeriod ? ` / ${paymentPeriod}` : ""}`
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <LinkIcon className="h-4 w-4" />
                  Links
                </div>

                <div className="mt-3 space-y-2">
                  {links.length ? (
                    links.slice(0, 10).map((l, idx) => (
                      <a
                        key={idx}
                        className="block rounded-xl border bg-gray-50 px-3 py-2 text-sm text-blue-700 hover:underline"
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {l.label}
                      </a>
                    ))
                  ) : (
                    <div className="text-sm text-gray-600">—</div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="font-semibold">Documents</div>
                <div className="mt-2 text-sm text-gray-600">
                  {/* In prod you’ll likely show CV link(s) here if available */}
                  —
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
