"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit2,
  Link as LinkIcon,
  X,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Mail,
  Linkedin,
  Github,
  Globe,
  Twitter,
  Palette,
  Dribbble,
  Search,
  BadgeCheck,
} from "lucide-react";
import { useUpdateLinks } from "@/src/lib/profile/profile.queries";
import { SocialLinkData } from "@/src/lib/profile/profile.api";
import { useProfile } from "@/src/context/ProfileContext";

/* ---------------- Helpers ---------------- */

// "trim + remove trailing punctuation that often appears in CV text"
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

const canonicalizeUrl = (url: string) => {
  const u = (url || "").trim().toLowerCase();
  return u.replace(/\/+$/g, "");
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
  const slug = raw
    .replace(/^@/g, "")
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "");
  if (!slug) return "";
  return `https://www.linkedin.com/in/${slug}`.replace(/\/+$/g, "");
};

const safeParseLinks = (raw: any): SocialLinkData[] => {
  if (!raw) return [];
  try {
    if (typeof raw === "string") {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    if (Array.isArray(raw)) return raw;
    return [];
  } catch (e) {
    console.error("Error parsing links data:", e);
    return [];
  }
};

const normalizeByPlatform = (platform: string, value: string) => {
  const p = (platform || "").toLowerCase().trim();
  const v = cleanRaw(value);
  if (!v) return "";

  if (p === "email") return normalizeEmail(v);
  if (p === "github") return normalizeGithubUrl(v);
  if (p === "linkedin") return normalizeLinkedinUrl(v);

  if (/^https?:\/\//i.test(v)) return v.replace(/\/+$/g, "");
  if (v.includes(".")) return ensureHttps(v).replace(/\/+$/g, "");

  return v;
};

const uniqByPlatformAndUrl = (arr: SocialLinkData[]) => {
  const seen = new Set<string>();
  return arr.filter((l) => {
    const platform = (l.platform || "").toLowerCase().trim();
    const url = canonicalizeUrl(l.url || "");
    const key = `${platform}::${url}`;
    if (!url) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const platformMeta = (platform: string) => {
  const p = (platform || "").toLowerCase().trim();
  switch (p) {
    case "email":
      return {
        label: "Email",
        icon: <Mail className="w-4 h-4 text-blue-700" />,
        pill: "bg-blue-50 text-blue-700 border-blue-100",
      };
    case "github":
      return {
        label: "GitHub",
        icon: <Github className="w-4 h-4 text-slate-700" />,
        pill: "bg-slate-50 text-slate-700 border-slate-200",
      };
    case "linkedin":
      return {
        label: "LinkedIn",
        icon: <Linkedin className="w-4 h-4 text-sky-700" />,
        pill: "bg-sky-50 text-sky-700 border-sky-100",
      };
    case "twitter":
      return {
        label: "Twitter",
        icon: <Twitter className="w-4 h-4 text-cyan-700" />,
        pill: "bg-cyan-50 text-cyan-700 border-cyan-100",
      };
    case "portfolio":
      return {
        label: "Portfolio",
        icon: <Globe className="w-4 h-4 text-emerald-700" />,
        pill: "bg-emerald-50 text-emerald-700 border-emerald-100",
      };
    case "behance":
      return {
        label: "Behance",
        icon: <Palette className="w-4 h-4 text-indigo-700" />,
        pill: "bg-indigo-50 text-indigo-700 border-indigo-100",
      };
    case "dribbble":
      return {
        label: "Dribbble",
        icon: <Dribbble className="w-4 h-4 text-pink-700" />,
        pill: "bg-pink-50 text-pink-700 border-pink-100",
      };
    default:
      return {
        label: platform || "Link",
        icon: <LinkIcon className="w-4 h-4 text-gray-700" />,
        pill: "bg-gray-50 text-gray-700 border-gray-200",
      };
  }
};

const getPrettyText = (link: SocialLinkData) => {
  const p = (link.platform || "").toLowerCase();
  if (p === "email") return (link.display_name || link.url || "").replace(/^mailto:/i, "");
  try {
    const u = new URL(link.url);
    const host = u.host.replace(/^www\./i, "");
    const path = u.pathname.replace(/\/+$/g, "");
    return `${host}${path}`;
  } catch {
    return link.display_name || link.url;
  }
};

/* ---------------------------------------- */

const LinksSection: React.FC = () => {
  const { profileData, setProfileData, refetch } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [query, setQuery] = useState("");

  const [links, setLinks] = useState<SocialLinkData[]>([]);
  const [newLink, setNewLink] = useState<SocialLinkData>({
    platform: "github",
    url: "",
    display_name: "",
  });

  const { mutate: updateLinks, isPending: isUpdating } = useUpdateLinks();

  // CandidateProfile.personal_info (autofill)
  const personalInfo = (profileData as any)?.personal_info || {};
  const piEmail = cleanRaw(personalInfo.email || "");
  const piGithub = cleanRaw(personalInfo.github || "");
  const piLinkedin = cleanRaw(personalInfo.linkedin || "");

  // Editable links stored in CandidateProfile.links
  const linksFromProfile = useMemo(() => {
    const arr = safeParseLinks((profileData as any)?.links);
    return arr
      .map((link: any) => {
        const platform = (link.platform || "other").toLowerCase().trim();
        const url = normalizeByPlatform(platform, link.url || "");
        return {
          platform,
          url,
          display_name: cleanRaw(link.display_name || ""),
        } as SocialLinkData;
      })
      .filter((l) => l.url);
  }, [profileData]);

  // Auto-detected from personal_info (read-only)
  const autoLinks = useMemo(() => {
    const fromPI: SocialLinkData[] = [];

    if (piEmail) {
      fromPI.push({
        platform: "email",
        url: normalizeEmail(piEmail),
        display_name: piEmail,
      });
    }

    if (piLinkedin) {
      const url = normalizeLinkedinUrl(piLinkedin);
      if (url) {
        fromPI.push({
          platform: "linkedin",
          url,
          display_name: piLinkedin,
        });
      }
    }

    if (piGithub) {
      const url = normalizeGithubUrl(piGithub);
      if (url) {
        fromPI.push({
          platform: "github",
          url,
          display_name: piGithub,
        });
      }
    }

    return uniqByPlatformAndUrl(fromPI);
  }, [piEmail, piGithub, piLinkedin]);

  // Display = auto + editable, deduped
  const displayLinks = useMemo(() => {
    return uniqByPlatformAndUrl([...autoLinks, ...linksFromProfile]);
  }, [autoLinks, linksFromProfile]);

  // Search in view mode (so “not all links appear” is never because of UI)
  const filteredDisplay = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return displayLinks;
    return displayLinks.filter((l) => {
      const p = (l.platform || "").toLowerCase();
      const t = (getPrettyText(l) || "").toLowerCase();
      const raw = (l.url || "").toLowerCase();
      return p.includes(q) || t.includes(q) || raw.includes(q);
    });
  }, [displayLinks, query]);

  // Sync editable state
  useEffect(() => {
    if (!isEditing) setLinks(linksFromProfile);
  }, [linksFromProfile, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setQuery("");
    setLinks(linksFromProfile);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setQuery("");
    setLinks(linksFromProfile);
    setNewLink({ platform: "github", url: "", display_name: "" });
  };

  const handleSave = () => {
    const sanitizedLinks = uniqByPlatformAndUrl(
      links
        .filter((l) => (l.url || "").trim())
        .map((l) => {
          const platform = (l.platform || "other").toLowerCase().trim();
          const url = normalizeByPlatform(platform, l.url || "");
          const display_name = cleanRaw(l.display_name || "");
          return { platform, url, display_name: display_name || url } as SocialLinkData;
        })
    );

    updateLinks(sanitizedLinks, {
      onSuccess: () => {
        setIsEditing(false);
        setProfileData({
          ...profileData,
          links: [...sanitizedLinks],
        });
        refetch?.();
      },
      onError: (error) => console.error("API Error:", error),
    });
  };

  const handleAddLink = () => {
    const platform = (newLink.platform || "other").toLowerCase().trim();
    const url = normalizeByPlatform(platform, newLink.url || "");
    if (!url) return;

    setLinks((prev) =>
      uniqByPlatformAndUrl([
        ...prev,
        {
          platform,
          url,
          display_name: cleanRaw(newLink.display_name || ""),
        },
      ])
    );

    setNewLink({ platform: "github", url: "", display_name: "" });
  };

  const handleRemoveLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, field: keyof SocialLinkData, value: string) => {
    setLinks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const hasContent = displayLinks.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden"
    >
      {/* top accent (Hiralent-ish, calm) */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500/60 via-sky-400/40 to-slate-200" />

      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center border border-blue-200 shrink-0">
              <LinkIcon className="w-4 h-4 text-blue-700" />
            </div>

            <div className="min-w-0">
              <h3 className="text-sm lg:text-lg font-semibold text-gray-900">Links</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Social profiles & portfolios (deduped with CV autofill).
              </p>
            </div>
          </div>

          {!isEditing ? (
            <button
              onClick={handleEdit}
              className="shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={isUpdating}
                className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isUpdating ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* Search + Count (view mode) */}
        {!isEditing && hasContent && (
          <div className="mt-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search links (platform / username / url)…"
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <span className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full border bg-gray-50 text-gray-700 tabular-nums">
              {filteredDisplay.length}/{displayLinks.length}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-6 pb-6">
        {!isEditing ? (
          <div>
            {hasContent ? (
              filteredDisplay.length ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {filteredDisplay.map((link, index) => {
                    const meta = platformMeta(link.platform);
                    const pretty = getPrettyText(link);

                    const isMail = (link.platform || "").toLowerCase() === "email";
                    return (
                      <a
                        key={`${link.platform}-${link.url}-${index}`}
                        href={link.url}
                        target={isMail ? undefined : "_blank"}
                        rel={isMail ? undefined : "noopener noreferrer"}
                        className="group relative p-4 rounded-xl border border-gray-200 bg-white hover:shadow-sm hover:border-blue-200 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl border bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
                            {meta.icon}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${meta.pill}`}
                              >
                                {meta.label}
                              </span>

                              <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                            </div>

                            <p className="mt-2 text-sm font-semibold text-gray-900 break-words">
                              {pretty || meta.label}
                            </p>

                            {/* subtle hint if it is auto-detected */}
                            {autoLinks.some(
                              (a) =>
                                a.platform?.toLowerCase() === link.platform?.toLowerCase() &&
                                canonicalizeUrl(a.url) === canonicalizeUrl(link.url)
                            ) && (
                              <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-gray-500">
                                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Auto-detected from CV
                              </div>
                            )}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-700 font-medium">No results</p>
                  <p className="text-xs text-gray-500 mt-1">Try another keyword.</p>
                  <button
                    onClick={() => setQuery("")}
                    className="mt-3 text-blue-600 text-xs font-medium hover:text-blue-700"
                  >
                    Clear search
                  </button>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-xs lg:text-sm">Add your portfolio and social links</p>
                <button
                  onClick={handleEdit}
                  className="mt-3 text-blue-600 text-xs lg:text-sm font-medium hover:text-blue-700"
                >
                  Add links
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Auto detected (read-only) */}
            {autoLinks.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">Auto-detected</p>
                  <span className="text-[11px] text-gray-500">
                    From CandidateProfile.personal_info (CV extraction)
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {autoLinks.map((l, i) => {
                    const meta = platformMeta(l.platform);
                    const isMail = (l.platform || "").toLowerCase() === "email";
                    return (
                      <a
                        key={`auto-${l.platform}-${l.url}-${i}`}
                        href={l.url}
                        target={isMail ? undefined : "_blank"}
                        rel={isMail ? undefined : "noopener noreferrer"}
                        className="group p-3 rounded-xl border border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl border bg-gray-50 flex items-center justify-center">
                            {meta.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-700">{meta.label}</p>
                            <p className="text-xs text-gray-600 break-all">{getPrettyText(l)}</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                        </div>
                      </a>
                    );
                  })}
                </div>

                <p className="mt-3 text-[11px] text-gray-500">
                  To change these, update your CV and re-run autofill.
                </p>
              </div>
            )}

            {/* Editable links */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">Custom links</p>
                <span className="text-[11px] text-gray-500">Saved in CandidateProfile.links</span>
              </div>

              <div className="mt-3 space-y-3">
                <AnimatePresence initial={false}>
                  {links.map((link, index) => {
                    const meta = platformMeta(link.platform);
                    return (
                      <motion.div
                        key={`${link.platform}-${link.url}-${index}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="md:col-span-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Platform
                            </label>
                            <select
                              value={link.platform}
                              onChange={(e) => handleLinkChange(index, "platform", e.target.value)}
                              className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                              <option value="github">GitHub</option>
                              <option value="linkedin">LinkedIn</option>
                              <option value="twitter">Twitter</option>
                              <option value="portfolio">Portfolio</option>
                              <option value="behance">Behance</option>
                              <option value="dribbble">Dribbble</option>
                              <option value="email">Email</option>
                              <option value="other">Other</option>
                            </select>
                            <div className="mt-2 inline-flex items-center gap-2 text-[11px] text-gray-600">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${meta.pill}`}>
                                {meta.icon}
                                {meta.label}
                              </span>
                            </div>
                          </div>

                          <div className="md:col-span-7">
                            <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
                            <input
                              type="text"
                              value={link.url}
                              onChange={(e) => handleLinkChange(index, "url", e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              placeholder="e.g. https://github.com/username or username"
                            />

                            <label className="block text-xs font-medium text-gray-700 mb-1 mt-3">
                              Display name (optional)
                            </label>
                            <input
                              type="text"
                              value={link.display_name || ""}
                              onChange={(e) => handleLinkChange(index, "display_name", e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              placeholder="e.g. chara0211"
                            />
                          </div>

                          <div className="md:col-span-2 flex md:flex-col gap-2 md:items-stretch md:justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveLink(index)}
                              className="w-full px-3 py-2 text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg text-sm flex items-center justify-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Add new */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl bg-white">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Platform</label>
                    <select
                      value={newLink.platform}
                      onChange={(e) => setNewLink({ ...newLink, platform: e.target.value })}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="github">GitHub</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="twitter">Twitter</option>
                      <option value="portfolio">Portfolio</option>
                      <option value="behance">Behance</option>
                      <option value="dribbble">Dribbble</option>
                      <option value="email">Email</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="md:col-span-7">
                    <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
                    <input
                      type="text"
                      value={newLink.url}
                      onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="e.g. linkedin.com/in/… or in/… or username"
                    />

                    <label className="block text-xs font-medium text-gray-700 mb-1 mt-3">
                      Display name (optional)
                    </label>
                    <input
                      type="text"
                      value={newLink.display_name || ""}
                      onChange={(e) => setNewLink({ ...newLink, display_name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Label shown in the card"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-end">
                    <button
                      onClick={handleAddLink}
                      disabled={!newLink.url.trim()}
                      className="w-full px-3 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500">
                  Tip: Duplicates are removed automatically (same platform + same URL).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LinksSection;
