"use client";

import React, { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  Globe,
  Github,
  Linkedin,
  FileText,
  Briefcase,
  GraduationCap,
  BadgeCheck,
  UserPlus,
  ExternalLink,
} from "lucide-react";

import { useExternalCandidateDetails } from "@/src/lib/company/candidates.queries";
import CandidateSkills from "@/src/components/company/dashboard/candidates/CandidateSkills";

function initials(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "C";
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function statusLabel(raw?: string | null) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  return s.replaceAll("_", " ").toLowerCase();
}

function isEmailValue(v?: string | null) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isPhoneValue(v?: string | null) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return /^[+\d][\d\s()-]{6,}$/.test(s);
}

function normalizeExternalHref(raw?: string | null) {
  const v = String(raw ?? "").trim();
  if (!v) return null;

  // keep protocols
  if (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("mailto:") ||
    v.startsWith("tel:")
  ) {
    return v;
  }

  if (isEmailValue(v)) return `mailto:${v}`;
  if (isPhoneValue(v)) return `tel:${v}`;

  if (v.startsWith("www.")) return `https://${v}`;
  return `https://${v}`;
}

function pickSourceIcon(source?: string | null) {
  const s = String(source ?? "").toLowerCase();
  if (s.includes("github")) return Github;
  if (s.includes("linkedin")) return Linkedin;
  return Globe;
}

function prettyLabel(raw: string) {
  const k = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    github: "GitHub",
    linkedin: "LinkedIn",
    portfolio: "Portfolio",
    website: "Website",
    site: "Website",
    blog: "Blog",
    twitter: "Twitter / X",
    x: "Twitter / X",
    email: "Email",
    mail: "Email",
    phone: "Phone",
    tel: "Phone",
  };
  return map[k] ?? raw.replaceAll("_", " ");
}

function linkIconFor(labelOrUrl: string) {
  const s = labelOrUrl.toLowerCase();
  if (s.includes("github")) return Github;
  if (s.includes("linkedin")) return Linkedin;
  return Globe;
}

type ParsedLink = { label: string; url: string; kind: "email" | "phone" | "link" };

function parseLinks(links: any): ParsedLink[] {
  if (!links) return [];

  if (typeof links === "string") {
    try {
      return parseLinks(JSON.parse(links));
    } catch {
      const href = normalizeExternalHref(links);
      if (!href) return [];
      if (href.startsWith("mailto:")) return [{ label: "Email", url: href, kind: "email" }];
      if (href.startsWith("tel:")) return [{ label: "Phone", url: href, kind: "phone" }];
      return [{ label: "Website", url: href, kind: "link" }];
    }
  }

  if (typeof links === "object" && !Array.isArray(links)) {
    return Object.entries(links)
      .map(([k, v]) => {
        const raw = typeof v === "string" ? v.trim() : "";
        if (!raw) return null;

        const key = k.toLowerCase();

        // Email forced
        if (key.includes("email") || key.includes("mail") || isEmailValue(raw.replace(/^mailto:/, ""))) {
          const clean = raw.replace(/^mailto:/, "").trim();
          if (!isEmailValue(clean)) return null;
          return { label: "Email", url: `mailto:${clean}`, kind: "email" as const };
        }

        // Phone forced
        if (key.includes("phone") || key.includes("tel") || isPhoneValue(raw.replace(/^tel:/, ""))) {
          const clean = raw.replace(/^tel:/, "").trim();
          if (!isPhoneValue(clean)) return null;
          return { label: "Phone", url: `tel:${clean}`, kind: "phone" as const };
        }

        const href = normalizeExternalHref(raw);
        return href ? { label: prettyLabel(k), url: href, kind: "link" as const } : null;
      })
      .filter(Boolean) as ParsedLink[];
  }

  if (Array.isArray(links)) {
    return links
      .map((x) => {
        if (!x) return null;

        if (typeof x === "string") {
          const raw = x.trim();
          if (!raw) return null;

          if (isEmailValue(raw)) return { label: "Email", url: `mailto:${raw}`, kind: "email" as const };
          if (isPhoneValue(raw)) return { label: "Phone", url: `tel:${raw}`, kind: "phone" as const };

          const href = normalizeExternalHref(raw);
          return href ? { label: "Website", url: href, kind: "link" as const } : null;
        }

        if (typeof x === "object") {
          const labelRaw = String((x as any).label ?? (x as any).type ?? "Link");
          const rawUrl = String((x as any).url ?? (x as any).href ?? (x as any).link ?? "").trim();
          if (!rawUrl) return null;

          const maybeMail = rawUrl.replace(/^mailto:/, "").trim();
          if (isEmailValue(maybeMail)) return { label: "Email", url: `mailto:${maybeMail}`, kind: "email" as const };

          const maybeTel = rawUrl.replace(/^tel:/, "").trim();
          if (isPhoneValue(maybeTel)) return { label: "Phone", url: `tel:${maybeTel}`, kind: "phone" as const };

          const href = normalizeExternalHref(rawUrl);
          return href ? { label: prettyLabel(labelRaw), url: href, kind: "link" as const } : null;
        }

        return null;
      })
      .filter(Boolean) as ParsedLink[];
  }

  return [];
}

function safeArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export default function ExternalCandidateDetailsPage() {
  const params = useParams<{ sourceId: string }>();
  const router = useRouter();
  const sourceId = params?.sourceId;

  const q = useExternalCandidateDetails(sourceId);

  // ✅ hooks always called
  const parsedLinks = useMemo(() => parseLinks(q.data?.links), [q.data?.links]);

  if (!sourceId) return <div className="min-h-screen bg-gray-50 p-6">Missing sourceId</div>;

  if (q.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl border bg-white p-6">Loading...</div>
        </div>
      </div>
    );
  }

  if (!q.data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl border bg-white p-6 text-red-700">Not found.</div>
        </div>
      </div>
    );
  }

  const d = q.data;

  const fullName = d.full_name ?? "Unnamed";
  const headline = d.headline ?? "—";
  const status = statusLabel(d.status);
  const source = d.source ?? "source";
  const locationLabel = [d.city, d.location].filter(Boolean).join(", ") || null;

  // ✅ Email & phone from main fields OR from parsed links
  const emailFromLinks = parsedLinks.find((x) => x.kind === "email")?.url ?? null; // mailto:...
  const phoneFromLinks = parsedLinks.find((x) => x.kind === "phone")?.url ?? null; // tel:...

  const emailValue =
    isEmailValue(d.email) ? String(d.email).trim() : (emailFromLinks ? emailFromLinks.replace(/^mailto:/, "") : null);

  const phoneValue =
    isPhoneValue(d.phone) ? String(d.phone).trim() : (phoneFromLinks ? phoneFromLinks.replace(/^tel:/, "") : null);

  const emailHref = emailValue ? `mailto:${emailValue}` : null;
  const phoneHref = phoneValue ? `tel:${phoneValue}` : null;

  // Links (web)
  const linkedinUrl = normalizeExternalHref(d.linkedin_url ?? null);
  const sourceProfileUrl = normalizeExternalHref(d.source_profile_url ?? null);

  const skills = safeArray<string>(d.skills);
  const experiences = safeArray<any>((d as any).experiences);
  const education = safeArray<any>((d as any).education);

  const SourceIcon = pickSourceIcon(source);

  // ✅ Links card: web-only (exclude email/tel)
  const extraWebLinks = parsedLinks.filter((x) => x.kind === "link");

  const normalizedLinks = [
    ...(linkedinUrl ? [{ label: "LinkedIn", url: linkedinUrl }] : []),
    ...(sourceProfileUrl ? [{ label: "Source profile", url: sourceProfileUrl }] : []),
    ...extraWebLinks.map((x) => ({ label: x.label, url: x.url })),
  ].slice(0, 10);

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
            <div className="flex items-start gap-4 min-w-0">
              <div className="h-14 w-14 overflow-hidden rounded-2xl border bg-gray-50 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">{initials(fullName)}</span>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xl font-semibold truncate">{fullName}</div>

                  <span className="inline-flex items-center gap-1 rounded-full border bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                    <SourceIcon className="h-3.5 w-3.5" />
                    {String(source).toLowerCase()}
                  </span>

                  {status ? (
                    <span className="rounded-full border bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                      {status}
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 text-sm text-gray-600 truncate">{headline}</div>

                {locationLabel ? (
                  <div className="mt-2 inline-flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    {locationLabel}
                  </div>
                ) : null}

                {/* ✅ Show email/phone TEXT so you "see the email" */}
                {(emailValue || phoneValue) ? (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    {emailValue ? (
                      <div className="inline-flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span className="select-all">{emailValue}</span>
                      </div>
                    ) : null}
                    {phoneValue ? (
                      <div className="inline-flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span className="select-all">{phoneValue}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              {emailHref ? (
                <a
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  href={emailHref}
                  title={emailHref}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </a>
              ) : null}

              {phoneHref ? (
                <a
                  className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  href={phoneHref}
                  title={phoneHref}
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              ) : null}

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => {
                  // TODO: invite flow
                }}
              >
                <UserPlus className="h-4 w-4" />
                Invite
              </button>
            </div>
          </div>
        </div>

        {/* Body grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Left */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4" />
                About
              </div>
              <div className="mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {d.about_me ? String(d.about_me) : "—"}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 font-semibold">
                <Briefcase className="h-4 w-4" />
                Experience
              </div>

              <div className="mt-3 space-y-3">
                {experiences.length ? (
                  experiences.map((e, idx) => (
                    <div key={idx} className="rounded-xl border bg-gray-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-medium text-gray-900">{e.role ?? e.job_title ?? "—"}</div>
                        {e.period ? <div className="text-xs text-gray-600">{e.period}</div> : null}
                      </div>
                      {e.company ? <div className="text-sm text-gray-700 mt-1">{e.company}</div> : null}
                      {e.description ? (
                        <div className="text-sm text-gray-700 mt-2 whitespace-pre-line">{String(e.description)}</div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-600">—</div>
                )}
              </div>
            </div>

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
                        <div className="font-medium text-gray-900">{e.school ?? e.institution ?? "—"}</div>
                        {e.year ? <div className="text-xs text-gray-600">{e.year}</div> : null}
                      </div>
                      {e.degree ? <div className="mt-1 text-sm text-gray-700">{e.degree}</div> : null}
                      {e.field ? <div className="mt-1 text-xs text-gray-600">{e.field}</div> : null}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-600">—</div>
                )}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-4">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 font-semibold">
                <BadgeCheck className="h-4 w-4" />
                Skills
              </div>

              <div className="mt-3">
                {skills.length ? <CandidateSkills skills={skills} /> : <div className="text-sm text-gray-600">—</div>}
              </div>
            </div>

            {/* Links */}
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 font-semibold">
                <LinkIcon className="h-4 w-4" />
                Links
              </div>

              <div className="mt-3 space-y-2">
                {normalizedLinks.length ? (
                  normalizedLinks.map((l, idx) => {
                    const Icon = linkIconFor(`${l.label} ${l.url}`);
                    return (
                      <a
                        key={idx}
                        className="block rounded-xl border bg-gray-50 px-3 py-2 text-sm text-blue-700 hover:underline"
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {l.label}
                          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                        </span>
                      </a>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-600">—</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="font-semibold">Documents</div>
              <div className="mt-2 text-sm text-gray-600">—</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
