"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useUpdateLinks } from "@/src/lib/profile/profile.queries";
import { SocialLinkData } from "@/src/lib/profile/profile.api";
import { useProfile } from "@/src/context/ProfileContext";

/* ---------------- Helpers ---------------- */

// "trim + remove trailing punctuation that often appears in CV text"
const cleanRaw = (val: string) =>
  (val || "")
    .trim()
    .replace(/[)\].,;]+$/g, "") // remove trailing punctuation
    .replace(/^[(\[]+/g, ""); // remove leading brackets

const ensureHttps = (url: string) => {
  const u = cleanRaw(url);
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `https://${u}`;
};

const canonicalizeUrl = (url: string) => {
  // used for dedupe: lowercase + remove trailing slash
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

  // already full url
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/g, "");

  // contains github.com (with or without www)
  if (/github\.com/i.test(raw)) {
    // if raw starts with "github.com/.."
    return ensureHttps(raw).replace(/\/+$/g, "");
  }

  // handle @username or username
  const username = raw.replace(/^@/g, "").trim();
  if (!username) return "";
  return `https://github.com/${username}`.replace(/\/+$/g, "");
};

const normalizeLinkedinUrl = (val: string) => {
  const raw = cleanRaw(val);
  if (!raw) return "";

  // already full url
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/g, "");

  // contains linkedin.com
  if (/linkedin\.com/i.test(raw)) {
    // "linkedin.com/in/..." or "www.linkedin.com/in/..."
    return ensureHttps(raw).replace(/\/+$/g, "");
  }

  // handle "in/slug" (some parsers return that)
  if (/^in\//i.test(raw)) {
    return `https://www.linkedin.com/${raw}`.replace(/\/+$/g, "");
  }

  // handle @slug or slug
  const slug = raw
    .replace(/^@/g, "")
    .trim()
    // keep common linkedin slug chars
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

  // generic URL: if user types "example.com" => https://example.com
  if (/^https?:\/\//i.test(v)) return v.replace(/\/+$/g, "");
  if (v.includes(".")) return ensureHttps(v).replace(/\/+$/g, "");

  return v; // fallback
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
  switch ((platform || "").toLowerCase()) {
    case "email":
      return { label: "Email", icon: <Mail className="w-4 h-4 text-gray-600" /> };
    case "github":
      return { label: "GitHub", icon: <Github className="w-4 h-4 text-gray-600" /> };
    case "linkedin":
      return { label: "LinkedIn", icon: <Linkedin className="w-4 h-4 text-gray-600" /> };
    case "twitter":
      return { label: "Twitter", icon: <span className="text-base">🐦</span> };
    case "portfolio":
      return { label: "Portfolio", icon: <span className="text-base">🌐</span> };
    case "behance":
      return { label: "Behance", icon: <span className="text-base">🎨</span> };
    case "dribbble":
      return { label: "Dribbble", icon: <span className="text-base">🏀</span> };
    default:
      return { label: platform || "Link", icon: <span className="text-base">🔗</span> };
  }
};

/* ---------------------------------------- */

const LinksSection: React.FC = () => {
  const { profileData, setProfileData, refetch } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  const [links, setLinks] = useState<SocialLinkData[]>([]);
  const [newLink, setNewLink] = useState<SocialLinkData>({
    platform: "github",
    url: "",
    display_name: "",
  });

  const { mutate: updateLinks, isPending: isUpdating } = useUpdateLinks();

  const personalInfo = (profileData as any)?.personal_info || {};
  const piEmail = cleanRaw(personalInfo.email || "");
  const piGithub = cleanRaw(personalInfo.github || "");
  const piLinkedin = cleanRaw(personalInfo.linkedin || "");

  // links stored in CandidateProfile.links (editable ones)
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

  // display links = personal_info + editable links merged + deduped
  const displayLinks = useMemo(() => {
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
          display_name: piLinkedin, // keep original text as label
        });
      }
    }

    if (piGithub) {
      const url = normalizeGithubUrl(piGithub);
      if (url) {
        fromPI.push({
          platform: "github",
          url,
          display_name: piGithub, // keep original text as label
        });
      }
    }

    return uniqByPlatformAndUrl([...fromPI, ...linksFromProfile]);
  }, [piEmail, piGithub, piLinkedin, linksFromProfile]);

  // sync editable state
  useEffect(() => {
    if (!isEditing) setLinks(linksFromProfile);
  }, [linksFromProfile, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setLinks(linksFromProfile);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setLinks(linksFromProfile);
    setNewLink({ platform: "github", url: "", display_name: "" });
  };

  const handleSave = () => {
    // only editable links are saved to profile.links
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <LinkIcon className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-xs lg:text-lg font-semibold text-gray-900">Links</h3>
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

      {/* Content */}
      {!isEditing ? (
        <div>
          {hasContent ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayLinks.map((link, index) => {
                const meta = platformMeta(link.platform);

                const displayText =
                  link.platform === "email"
                    ? (personalInfo.email || link.display_name || link.url)
                    : (link.display_name || link.url);

                return (
                  <a
                    key={index}
                    href={link.url}
                    target={link.platform === "email" ? undefined : "_blank"}
                    rel={link.platform === "email" ? undefined : "noopener noreferrer"}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                  >
                    <div className="w-8 h-8 bg-white rounded-lg border flex items-center justify-center">
                      {meta.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-xs lg:text-sm">{meta.label}</p>
                      {/* show full (no truncate) */}
                      <p className="text-gray-600 text-[10px] lg:text-xs break-all">{displayText}</p>
                    </div>

                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-xs lg:text-sm">Add all your portfolio and social links here</p>
              <button onClick={handleEdit} className="mt-3 text-blue-600 text-xs lg:text-sm font-medium hover:text-blue-700">
                Add links
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Existing Links (editable list only) */}
          {links.map((link, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Platform</label>
                <select
                  value={link.platform}
                  onChange={(e) => handleLinkChange(index, "platform", e.target.value)}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="github">GitHub</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitter">Twitter</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="behance">Behance</option>
                  <option value="dribbble">Dribbble</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => handleLinkChange(index, "url", e.target.value)}
                  className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="https://github.com/username"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => handleRemoveLink(index)}
                  className="w-full px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs lg:text-sm flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Add New Link */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Platform</label>
              <select
                value={newLink.platform}
                onChange={(e) => setNewLink({ ...newLink, platform: e.target.value })}
                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="github">GitHub</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">Twitter</option>
                <option value="portfolio">Portfolio</option>
                <option value="behance">Behance</option>
                <option value="dribbble">Dribbble</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                className="w-full px-2 py-1 text-xs lg:text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="https://your-profile-url.com"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAddLink}
                disabled={!newLink.url.trim()}
                className="w-full px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs lg:text-sm flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
          </div>

          <p className="text-[11px] text-gray-500">
            Note: Email/LinkedIn/GitHub from <b>CV autofill (personal_info)</b> are displayed automatically and deduped
            against manually added links.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default LinksSection;
