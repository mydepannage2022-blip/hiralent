"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import countryList from "country-list";
import ISO6391 from "iso-639-1";
import {
  Building2,
  Mail,
  Phone,
  Globe,
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
        icon: Clock,
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        text: "Pending Review",
      },
      APPROVED: {
        icon: CheckCircle,
        color: "bg-green-100 text-green-800 border-green-200",
        text: "Verified",
      },
      REJECTED: {
        icon: XCircle,
        color: "bg-red-100 text-red-800 border-red-200",
        text: "Rejected",
      },
      SUSPENDED: {
        icon: XCircle,
        color: "bg-gray-100 text-gray-800 border-gray-200",
        text: "Suspended",
      },
    };

    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    const Icon = badge.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${badge.color}`}
      >
        <Icon className="w-4 h-4" />
        {badge.text}
      </span>
    );
  };

  const getTypeBadge = (type: string | null) => {
    if (!type) return null;
    const colors = {
      VISA: "bg-blue-100 text-blue-800 border-blue-200",
      RELOCATION: "bg-purple-100 text-purple-800 border-purple-200",
      INTEGRATION: "bg-green-100 text-green-800 border-green-200",
    };

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Profile not found"}</p>
          <button
            onClick={fetchProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Agency Profile
            </h1>
            <p className="text-slate-600">
              Manage your agency information and settings
            </p>
          </div>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Edit className="w-5 h-5" />
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-all"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
          {/* Left Column - Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                Basic Information
              </h2>

              <div className="space-y-6">
                {/* Agency Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Agency Name *
                  </label>
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
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                      <Building2 className="w-5 h-5 text-slate-400" />
                      <span className="font-medium text-slate-800">
                        {profile.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-700">
                      {profile.email || "Not set"}
                    </span>
                    {profile.status === "APPROVED" && (
                      <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone Number
                  </label>
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
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1 234 567 8900"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                      <Phone className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-700">
                        {profile.phone || "Not set"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Website
                  </label>
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
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
                      <Globe className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-700">
                        {profile.website || "Not set"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Service Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                About Agency
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Describe your agency's services, expertise, and what makes you unique..."
                />
              ) : (
                <p className="text-slate-700 leading-relaxed">
                  {profile.service_description || "No description provided"}
                </p>
              )}
            </motion.div>

            {/* Operating Countries & Languages */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-6">
                Service Coverage
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {/* Operating Countries */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Operating Countries
                    </label>
                    {isEditing && (
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setShowCountryDropdown(!showCountryDropdown)
                          }
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </button>

                        {showCountryDropdown && (
  <div className="absolute left-0 bottom-full mb-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
                            <div className="p-2">
                              <input
                                type="text"
                                value={countrySearch}
                                onChange={(e) =>
                                  setCountrySearch(e.target.value)
                                }
                                placeholder="Search countries..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filteredCountries.map((country) => (
                                <button
                                  key={country}
                                  onClick={() => handleAddCountry(country)}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-slate-700"
                                  disabled={editedProfile.operating_countries?.includes(
                                    country
                                  )}
                                >
                                  {country}
                                  {editedProfile.operating_countries?.includes(
                                    country
                                  ) && (
                                    <span className="text-green-600 ml-2">
                                      ✓
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editedProfile.operating_countries &&
                    editedProfile.operating_countries.length > 0 ? (
                      editedProfile.operating_countries.map((country, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                        >
                          {country}
                          {isEditing && (
                            <button
                              onClick={() => handleRemoveCountry(idx)}
                              className="hover:text-blue-900"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-sm">
                        No countries listed
                      </span>
                    )}
                  </div>
                </div>

                {/* Languages Supported */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Languages Supported
                    </label>
                    {isEditing && (
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setShowLanguageDropdown(!showLanguageDropdown)
                          }
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </button>

                        {showLanguageDropdown && (
  <div className="absolute left-0 bottom-full mb-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
                            <div className="p-2">
                              <input
                                type="text"
                                value={languageSearch}
                                onChange={(e) =>
                                  setLanguageSearch(e.target.value)
                                }
                                placeholder="Search languages..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {filteredLanguages.map((language) => (
                                <button
                                  key={language}
                                  onClick={() => handleAddLanguage(language)}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-purple-50 text-slate-700"
                                  disabled={editedProfile.languages_supported?.includes(
                                    language
                                  )}
                                >
                                  {language}
                                  {editedProfile.languages_supported?.includes(
                                    language
                                  ) && (
                                    <span className="text-green-600 ml-2">
                                      ✓
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editedProfile.languages_supported &&
                    editedProfile.languages_supported.length > 0 ? (
                      editedProfile.languages_supported.map((lang, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center gap-2"
                        >
                          {lang}
                          {isEditing && (
                            <button
                              onClick={() => handleRemoveLanguage(idx)}
                              className="hover:text-purple-900"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-sm">
                        No languages listed
                      </span>
                    )}
                  </div>
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
              className="bg-white rounded-2xl shadow-xl p-6"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-6">
                Quick Stats
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-slate-600">Total Cases</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {stats?.totalCases || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-sm text-slate-600">Active Cases</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {stats?.activeCases || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-purple-600" />
                    <div>
                      <p className="text-sm text-slate-600">Completed</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {stats?.completedCases || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-yellow-600" />
                    <div>
                      <p className="text-sm text-slate-600">Total Clients</p>
                      <p className="text-2xl font-bold text-slate-800">
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
              className="bg-white rounded-2xl shadow-xl p-6"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-6">
                Account Information
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Agency Type</p>
                  {getTypeBadge(profile.type)}
                </div>

                <div>
                  <p className="text-sm text-slate-600 mb-1">Status</p>
                  {getStatusBadge(profile.status)}
                </div>

                {profile.rating && (
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Rating</p>
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <span className="font-bold text-slate-800">
                        {profile.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                )}

                {profile.success_rate && (
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Success Rate</p>
                    <span className="font-bold text-green-600">
                      {(profile.success_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                )}

                <div>
                  <p className="text-sm text-slate-600 mb-1">Member Since</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-800">
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

                <div>
                  <p className="text-sm text-slate-600 mb-1">Account ID</p>
                  <span className="text-xs text-slate-500 font-mono">
                    {profile.agency_id}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
