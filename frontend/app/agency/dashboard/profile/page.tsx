"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-hot-toast";
import countryList from "country-list";
import ISO6391 from "iso-639-1";
import { Button } from "@/src/components/agency/ui/button";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Save,
  X,
  Users,
  TrendingUp,
  Star,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";

const COUNTRIES = countryList.getNames().sort();

const LANGUAGES = ISO6391.getAllNames().sort();

interface AgencyProfile {
  agency_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: "VISA" | "RELOCATION" | "INTEGRATION" | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  website: string | null;
  service_description: string | null;
  operating_countries: string[];
  languages_supported: string[];
  rating: number | null;
  total_cases_handled: number | null;
  success_rate: number | null;
  created_at: string;
}

interface AgencyStats {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  totalClients: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  const [stats, setStats] = useState<AgencyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [editedProfile, setEditedProfile] = useState<Partial<AgencyProfile>>(
    {}
  );

  // Dropdown states
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [languageSearch, setLanguageSearch] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      // Fetch profile
      const profileRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!profileRes.ok) throw new Error("Failed to fetch profile");
      const profileData = await profileRes.json();

      // Fetch stats
      const statsRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/dashboard/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!statsRes.ok) throw new Error("Failed to fetch stats");
      const statsData = await statsRes.json();

      setProfile(profileData.data);
      setStats({
        totalCases: statsData.data.activeCases + statsData.data.completedCases,
        activeCases: statsData.data.activeCases,
        completedCases: statsData.data.completedCases,
        totalClients: statsData.data.totalClients,
      });
      setEditedProfile(profileData.data);
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editedProfile.name,
            phone: editedProfile.phone,
            website: editedProfile.website,
            service_description: editedProfile.service_description,
            operating_countries: editedProfile.operating_countries,
            languages_supported: editedProfile.languages_supported,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update profile");

      const data = await response.json();
      setProfile(data.data);
      setEditedProfile(data.data);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile(profile || {});
    setIsEditing(false);
    setShowCountryDropdown(false);
    setShowLanguageDropdown(false);
  };

  const handleAddCountry = (country: string) => {
    if (
      editedProfile.operating_countries &&
      !editedProfile.operating_countries.includes(country)
    ) {
      setEditedProfile({
        ...editedProfile,
        operating_countries: [...editedProfile.operating_countries, country],
      });
    }
    setShowCountryDropdown(false);
    setCountrySearch("");
  };

  const handleRemoveCountry = (index: number) => {
    if (editedProfile.operating_countries) {
      setEditedProfile({
        ...editedProfile,
        operating_countries: editedProfile.operating_countries.filter(
          (_, i) => i !== index
        ),
      });
    }
  };

  const handleAddLanguage = (language: string) => {
    if (
      editedProfile.languages_supported &&
      !editedProfile.languages_supported.includes(language)
    ) {
      setEditedProfile({
        ...editedProfile,
        languages_supported: [...editedProfile.languages_supported, language],
      });
    }
    setShowLanguageDropdown(false);
    setLanguageSearch("");
  };

  const handleRemoveLanguage = (index: number) => {
    if (editedProfile.languages_supported) {
      setEditedProfile({
        ...editedProfile,
        languages_supported: editedProfile.languages_supported.filter(
          (_, i) => i !== index
        ),
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: {
        dot: "bg-amber-500",
        color: "bg-amber-50 text-amber-700 border-amber-200",
        text: "Pending",
      },
      APPROVED: {
        dot: "bg-emerald-500",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        text: "Verified",
      },
      REJECTED: {
        dot: "bg-rose-500",
        color: "bg-rose-50 text-rose-700 border-rose-200",
        text: "Rejected",
      },
      SUSPENDED: {
        dot: "bg-slate-500",
        color: "bg-slate-50 text-slate-700 border-slate-200",
        text: "Suspended",
      },
    };

    const badge = badges[status as keyof typeof badges] || badges.PENDING;

    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${badge.color}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
        {badge.text}
      </span>
    );
  };

  const getTypeBadge = (type: string | null) => {
    if (!type) return null;
    const colors = {
      VISA: "bg-blue-50 text-blue-700 border-blue-200",
      RELOCATION: "bg-slate-50 text-slate-700 border-slate-200",
      INTEGRATION: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };

    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
          colors[type as keyof typeof colors]
        }`}
      >
        {type}
      </span>
    );
  };

  const filteredCountries = COUNTRIES.filter((country) =>
    country.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const filteredLanguages = LANGUAGES.filter((language) =>
    language.toLowerCase().includes(languageSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <p className="mb-4 text-sm text-rose-600">
            {error || "Profile not found"}
          </p>
          <Button onClick={fetchProfile} variant="soft" size="md">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
          {/* Left Column - Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Basic info
                </h2>

                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      variant="soft"
                      size="sm"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-600 shadow-sm">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500">Agency name</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedProfile.name || ""}
                          onChange={(e) =>
                            setEditedProfile({
                              ...editedProfile,
                              name: e.target.value,
                            })
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                        />
                      ) : (
                        <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                          {profile.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-600 shadow-sm">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500">Email</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
                          {profile.email || "Not set"}
                        </p>
                        {profile.status === "APPROVED" && (
                          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        This email is used for account access.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-600 shadow-sm">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500">Phone</p>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editedProfile.phone || ""}
                          onChange={(e) =>
                            setEditedProfile({
                              ...editedProfile,
                              phone: e.target.value,
                            })
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                          placeholder="+1 234 567 8900"
                        />
                      ) : (
                        <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                          {profile.phone || "Not set"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-600 shadow-sm">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500">Website</p>
                      {isEditing ? (
                        <input
                          type="url"
                          value={editedProfile.website || ""}
                          onChange={(e) =>
                            setEditedProfile({
                              ...editedProfile,
                              website: e.target.value,
                            })
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                          placeholder="https://example.com"
                        />
                      ) : profile.website ? (
                        <a
                          href={profile.website}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block truncate text-sm font-semibold text-blue-700 hover:underline"
                        >
                          {profile.website}
                        </a>
                      ) : (
                        <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                          Not set
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Service Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm"
            >
              <h2 className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FileText className="h-4 w-4 text-blue-600" />
                Description
              </h2>
              {isEditing ? (
                <textarea
                  value={editedProfile.service_description || ""}
                  onChange={(e) =>
                    setEditedProfile({
                      ...editedProfile,
                      service_description: e.target.value,
                    })
                  }
                  rows={6}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Describe your agency's services, expertise, and what makes you unique..."
                />
              ) : (
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-5">
                  {profile.service_description ? (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                      {profile.service_description}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No description provided.
                    </p>
                  )}
                </div>
              )}
            </motion.div>

            {/* Operating Countries & Languages */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    Coverage
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Where you operate and the languages you support.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                    {(editedProfile.operating_countries?.length ?? 0)} countries
                  </div>
                  <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                    {(editedProfile.languages_supported?.length ?? 0)} languages
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 relative">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">Operating countries</p>
                        <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {editedProfile.operating_countries?.length ?? 0}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Add the countries where you can handle cases.
                      </p>
                    </div>

                    {isEditing && (
                      <div className="inline-block">
                        <Button
                          onClick={() => setShowCountryDropdown(true)}
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </Button>
                      </div>
                    )}
                  </div>

                  {(editedProfile.operating_countries?.length ?? 0) > 0 ? (
                    <div className="rounded-xl border border-slate-200/70 bg-white p-3">
                      <div className="flex flex-wrap gap-2">
                        {editedProfile.operating_countries?.map((country, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                          >
                            {country}
                            {isEditing && (
                              <Button
                                onClick={() => handleRemoveCountry(idx)}
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full text-blue-700/70 hover:text-blue-800"
                                title="Remove"
                                aria-label="Remove country"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                      <p className="text-sm font-medium text-slate-700">No countries added</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {isEditing ? "Use Add to include your coverage." : "Edit your profile to add coverage."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">Languages supported</p>
                        <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {editedProfile.languages_supported?.length ?? 0}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Helps candidates know what you can support.
                      </p>
                    </div>

                    {isEditing && (
                      <div className="inline-block">
                        <Button
                          onClick={() => setShowLanguageDropdown(true)}
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </Button>
                      </div>
                    )}
                  </div>

                  {(editedProfile.languages_supported?.length ?? 0) > 0 ? (
                    <div className="rounded-xl border border-slate-200/70 bg-white p-3">
                      <div className="flex flex-wrap gap-2">
                        {editedProfile.languages_supported?.map((lang, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700"
                          >
                            {lang}
                            {isEditing && (
                              <Button
                                onClick={() => handleRemoveLanguage(idx)}
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full text-slate-500 hover:text-slate-700"
                                title="Remove"
                                aria-label="Remove language"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                      <p className="text-sm font-medium text-slate-700">No languages added</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {isEditing ? "Use Add to include supported languages." : "Edit your profile to add languages."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Stats & Info */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm"
            >
              <h2 className="mb-5 text-sm font-semibold text-slate-900">
                Quick Stats
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200/70 bg-blue-50 text-blue-700">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">Total cases</p>
                      <p className="mt-1 text-2xl font-bold leading-none text-slate-900">
                        {stats?.totalCases || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200/70 bg-emerald-50 text-emerald-700">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">Active</p>
                      <p className="mt-1 text-2xl font-bold leading-none text-slate-900">
                        {stats?.activeCases || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">Completed</p>
                      <p className="mt-1 text-2xl font-bold leading-none text-slate-900">
                        {stats?.completedCases || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">Clients</p>
                      <p className="mt-1 text-2xl font-bold leading-none text-slate-900">
                        {stats?.totalClients || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Account Information */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm"
            >
              <h2 className="mb-5 text-sm font-semibold text-slate-900">
                Account Information
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/40 px-4 py-3">
                  <p className="text-sm font-medium text-slate-600">Agency type</p>
                  <div>{getTypeBadge(profile.type)}</div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/40 px-4 py-3">
                  <p className="text-sm font-medium text-slate-600">Status</p>
                  <div>{getStatusBadge(profile.status)}</div>
                </div>

                {profile.rating && (
                  <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/40 px-4 py-3">
                    <p className="text-sm font-medium text-slate-600">Rating</p>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      <span className="text-sm font-semibold text-slate-900">
                        {profile.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}

                {profile.success_rate && (
                  <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/40 px-4 py-3">
                    <p className="text-sm font-medium text-slate-600">Success rate</p>
                    <span className="text-sm font-semibold text-slate-900">
                      {(profile.success_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/40 px-4 py-3">
                  <p className="text-sm font-medium text-slate-600">Member since</p>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>
                      {new Date(profile.created_at).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-slate-50/40 px-4 py-3">
                  <p className="text-sm font-medium text-slate-600">Account ID</p>
                  <p className="mt-2 break-all rounded-lg border border-slate-200/70 bg-white px-3 py-2 font-mono text-xs text-slate-600">
                    {profile.agency_id}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Add Country Modal */}
      <AnimatePresence>
        {showCountryDropdown && isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Add operating country"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900">Add country</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Select a country to add to your operating coverage.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setShowCountryDropdown(false);
                    setCountrySearch("");
                  }}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  aria-label="Close"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="bg-slate-50/40 px-6 py-5">
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search countries..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />

                <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-slate-200/70 bg-white p-1">
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map((country) => (
                      <Button
                        key={country}
                        onClick={() => handleAddCountry(country)}
                        variant="ghost"
                        className="h-auto w-full justify-start rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"
                        disabled={editedProfile.operating_countries?.includes(country)}
                      >
                        <span className="truncate">{country}</span>
                        {editedProfile.operating_countries?.includes(country) && (
                          <span className="ml-2 shrink-0 text-emerald-600">✓</span>
                        )}
                      </Button>
                    ))
                  ) : (
                    <div className="px-3 py-8 text-center">
                      <p className="text-sm font-medium text-slate-700">No results</p>
                      <p className="mt-1 text-xs text-slate-500">Try a different search.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 bg-white px-6 py-4">
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      setShowCountryDropdown(false);
                      setCountrySearch("");
                    }}
                    variant="outline"
                    size="md"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Language Modal */}
      <AnimatePresence>
        {showLanguageDropdown && isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Add supported language"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900">Add language</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Select a language you can support.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setShowLanguageDropdown(false);
                    setLanguageSearch("");
                  }}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  aria-label="Close"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="bg-slate-50/40 px-6 py-5">
                <input
                  type="text"
                  value={languageSearch}
                  onChange={(e) => setLanguageSearch(e.target.value)}
                  placeholder="Search languages..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />

                <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-slate-200/70 bg-white p-1">
                  {filteredLanguages.length > 0 ? (
                    filteredLanguages.map((language) => (
                      <Button
                        key={language}
                        onClick={() => handleAddLanguage(language)}
                        variant="ghost"
                        className="h-auto w-full justify-start rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50"
                        disabled={editedProfile.languages_supported?.includes(language)}
                      >
                        <span className="truncate">{language}</span>
                        {editedProfile.languages_supported?.includes(language) && (
                          <span className="ml-2 shrink-0 text-emerald-600">✓</span>
                        )}
                      </Button>
                    ))
                  ) : (
                    <div className="px-3 py-8 text-center">
                      <p className="text-sm font-medium text-slate-700">No results</p>
                      <p className="mt-1 text-xs text-slate-500">Try a different search.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-200 bg-white px-6 py-4">
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      setShowLanguageDropdown(false);
                      setLanguageSearch("");
                    }}
                    variant="outline"
                    size="md"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
