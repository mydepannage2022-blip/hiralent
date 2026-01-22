"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Edit2, Link as LinkIcon, X, Check, Plus, Trash2, ExternalLink, Mail, Linkedin, Github } from "lucide-react";
import { useUpdateLinks } from "@/src/lib/profile/profile.queries";
import { SocialLinkData } from "@/src/lib/profile/profile.api";
import { useProfile } from "@/src/context/ProfileContext";

/* ---------------- Helpers ---------------- */
const normalizeGithubUrl = (val: string) => {
  const v = (val || "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://github.com/${v.replace(/^@/, "")}`;
};

const normalizeLinkedinUrl = (val: string) => {
  const v = (val || "").trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.includes("linkedin.com")) return `https://${v.replace(/^https?:\/\//, "")}`;

  // "safae nagbi" -> "safaenagbi"
  const slug = v.replace(/\s+/g, "").replace(/[^a-zA-Z0-9-_]/g, "");
  return `https://www.linkedin.com/in/${slug}`;
};

const safeParseLinks = (raw: any): SocialLinkData[] => {
  if (!raw) return [];
  try {
    if (typeof raw === "string") {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    }
    if (Array.isArray(raw)) return raw;
    return [];
  } catch (e) {
    console.error("Error parsing links data:", e);
    return [];
  }
};

const uniqByPlatformAndUrl = (arr: SocialLinkData[]) => {
  const seen = new Set<string>();
  return arr.filter((l) => {
    const key = `${(l.platform || "").toLowerCase()}::${(l.url || "").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
/* ---------------------------------------- */

const LinksSection: React.FC = () => {
  const { profileData, setProfileData, refetch } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  // Editable links (stored in profileData.links)
  const [links, setLinks] = useState<SocialLinkData[]>([]);
  const [newLink, setNewLink] = useState<SocialLinkData>({
    platform: "github",
    url: "",
    display_name: "",
  });

  const { mutate: updateLinks, isPending: isUpdating } = useUpdateLinks();

  const personalInfo = (profileData as any)?.personal_info || {};
  const piEmail = (personalInfo.email || "").trim();
  const piGithub = (personalInfo.github || "").trim();
  const piLinkedin = (personalInfo.linkedin || "").trim();

  // Parse links from DB (editable ones)
  const linksFromProfile = useMemo(() => {
    const arr = safeParseLinks((profileData as any)?.links);
    return arr.map((link: any) => ({
      platform: (link.platform || "other").toLowerCase(),
      url: (link.url || "").trim(),
      display_name: (link.display_name || "").trim(),
    })) as SocialLinkData[];
  }, [profileData]);

  // Build “display links” = personal_info + editable links merged
  const displayLinks = useMemo(() => {
    const fromPI: SocialLinkData[] = [];

    if (piEmail) {
      fromPI.push({
        platform: "email",
        url: `mailto:${piEmail}`,
        display_name: piEmail,
      });
    }

    if (piLinkedin) {
      const url = normalizeLinkedinUrl(piLinkedin);
      fromPI.push({
        platform: "linkedin",
        url,
        display_name: url,
      });
    }

    if (piGithub) {
      const url = normalizeGithubUrl(piGithub);
      fromPI.push({
        platform: "github",
        url,
        display_name: url,
      });
    }

    // Merge (editable links override duplicates if same platform+url)
    return uniqByPlatformAndUrl([...fromPI, ...linksFromProfile]).filter((l) => l.url);
  }, [piEmail, piGithub, piLinkedin, linksFromProfile]);

  // Keep local editable state synced
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
    const sanitizedLinks = links
      .filter((l) => (l.url || "").trim())
      .map((l) => {
        const platform = (l.platform || "other").toLowerCase().trim();
        let url = (l.url || "").trim();
        let display_name = (l.display_name || "").trim();

        // normalize common platforms
        if (platform === "github") url = normalizeGithubUrl(url);
        if (platform === "linkedin") url = normalizeLinkedinUrl(url);
        if (platform === "email") url = url.startsWith("mailto:") ? url : `mailto:${url}`;

        // if user didn't provide display name, fallback to url
        if (!display_name) display_name = url;

        return { platform, url, display_name };
      });

    updateLinks(sanitizedLinks, {
      onSuccess: () => {
        setIsEditing(false);

        // update local context immediately
        setProfileData({
          ...profileData,
          links: [...sanitizedLinks],
        });

        // ensure global UI refresh (autofill/apply)
        refetch?.();
      },
      onError: (error) => console.error("API Error:", error),
    });
  };

  const handleAddLink = () => {
    const url = (newLink.url || "").trim();
    const platform = (newLink.platform || "other").trim().toLowerCase();
    if (!url || !platform) return;

    let normalizedUrl = url;
    if (platform === "github") normalizedUrl = normalizeGithubUrl(url);
    if (platform === "linkedin") normalizedUrl = normalizeLinkedinUrl(url);
    if (platform === "email") normalizedUrl = url.startsWith("mailto:") ? url : `mailto:${url}`;

    setLinks((prev) => [
      ...prev,
      {
        platform,
        url: normalizedUrl,
        display_name: (newLink.display_name || "").trim(),
      },
    ]);

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

  const getPlatformMeta = (platform: string) => {
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
                const meta = getPlatformMeta(link.platform);

                // show nice display (email raw, else url)
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

                      {/* IMPORTANT: no truncate, show full */}
                      <p className="text-gray-600 text-[10px] lg:text-xs break-all">
                        {displayText}
                      </p>
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

          {/* Note */}
          <p className="text-[11px] text-gray-500">
            Note: Email/LinkedIn/GitHub coming from <b>CV autofill (personal_info)</b> are displayed automatically and
            are not edited here.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default LinksSection;