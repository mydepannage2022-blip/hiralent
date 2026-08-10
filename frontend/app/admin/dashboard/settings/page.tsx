"use client";

import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  User,
  Lock,
  SlidersHorizontal,
  Save,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { adminFetch } from "@/src/lib/admin/api";

interface Me {
  user_id: string;
  email: string;
  full_name: string;
  mfa_enabled: boolean;
}

interface PlatformSettings {
  allow_new_registrations: boolean;
  maintenance_mode: boolean;
  support_email: string | null;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [savingPwd, setSavingPwd] = useState(false);

  const [platform, setPlatform] = useState<PlatformSettings>({
    allow_new_registrations: true,
    maintenance_mode: false,
    support_email: "",
  });
  const [savingPlatform, setSavingPlatform] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const flash = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 6000);
  };

  const load = async () => {
    try {
      setLoading(true);
      const [meRes, platformRes] = await Promise.all([
        adminFetch<Me>("/admin/me"),
        adminFetch<PlatformSettings>("/admin/settings/platform"),
      ]);
      setMe(meRes);
      setFullName(meRes.full_name);
      setPlatform({
        allow_new_registrations: platformRes.allow_new_registrations,
        maintenance_mode: platformRes.maintenance_mode,
        support_email: platformRes.support_email || "",
      });
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveProfile = async () => {
    if (!fullName.trim()) {
      flash("Name cannot be empty", "error");
      return;
    }
    try {
      setSavingProfile(true);
      const updated = await adminFetch<Me>("/admin/me", { method: "PUT", body: { full_name: fullName.trim() } });
      setMe(updated);
      // keep the navbar/localStorage copy in sync so the header reflects the new name
      try {
        const stored = localStorage.getItem("adminUser");
        if (stored) {
          const parsed = JSON.parse(stored);
          localStorage.setItem("adminUser", JSON.stringify({ ...parsed, full_name: updated.full_name, name: updated.full_name }));
        }
      } catch {
        /* ignore */
      }
      flash("Profile updated", "success");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!pwd.currentPassword || !pwd.newPassword) {
      flash("Current and new password are required", "error");
      return;
    }
    if (pwd.newPassword.length < 8) {
      flash("New password must be at least 8 characters", "error");
      return;
    }
    if (pwd.newPassword !== pwd.confirm) {
      flash("New passwords do not match", "error");
      return;
    }
    try {
      setSavingPwd(true);
      await adminFetch("/admin/me/password", {
        method: "PUT",
        body: { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword },
      });
      setPwd({ currentPassword: "", newPassword: "", confirm: "" });
      flash("Password changed", "success");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to change password", "error");
    } finally {
      setSavingPwd(false);
    }
  };

  const savePlatform = async () => {
    try {
      setSavingPlatform(true);
      const updated = await adminFetch<PlatformSettings>("/admin/settings/platform", {
        method: "PUT",
        body: {
          allow_new_registrations: platform.allow_new_registrations,
          maintenance_mode: platform.maintenance_mode,
          support_email: platform.support_email || "",
        },
      });
      setPlatform({
        allow_new_registrations: updated.allow_new_registrations,
        maintenance_mode: updated.maintenance_mode,
        support_email: updated.support_email || "",
      });
      flash("Platform settings saved", "success");
    } catch (e) {
      flash(e instanceof Error ? e.message : "Failed to save settings", "error");
    } finally {
      setSavingPlatform(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <SettingsIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
            <p className="text-slate-500">Manage your account and platform configuration</p>
          </div>
        </div>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-800">Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
            <input
              value={me?.email || ""}
              disabled
              className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-800">Change Password</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Current password</label>
            <input
              type="password"
              value={pwd.currentPassword}
              onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">New password</label>
            <input
              type="password"
              value={pwd.newPassword}
              onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Confirm new password</label>
            <input
              type="password"
              value={pwd.confirm}
              onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={savePassword}
            disabled={savingPwd}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {savingPwd ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>

      {/* Platform settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <SlidersHorizontal className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-800">Platform</h2>
        </div>

        <div className="space-y-3">
          <label className="flex items-start justify-between gap-4 p-4 border border-slate-200 rounded-xl">
            <div>
              <p className="font-medium text-slate-800">Allow new registrations</p>
              <p className="text-sm text-slate-500">
                When off, public sign-ups are blocked platform-wide (enforced at the registration API).
              </p>
            </div>
            <input
              type="checkbox"
              checked={platform.allow_new_registrations}
              onChange={(e) => setPlatform({ ...platform, allow_new_registrations: e.target.checked })}
              className="mt-1 w-5 h-5 accent-blue-600"
            />
          </label>

          <label className="flex items-start justify-between gap-4 p-4 border border-slate-200 rounded-xl">
            <div>
              <p className="font-medium text-slate-800">Maintenance mode</p>
              <p className="text-sm text-slate-500">
                Advisory flag surfaced to operators. (Banner/enforcement wiring is a separate task.)
              </p>
            </div>
            <input
              type="checkbox"
              checked={platform.maintenance_mode}
              onChange={(e) => setPlatform({ ...platform, maintenance_mode: e.target.checked })}
              className="mt-1 w-5 h-5 accent-blue-600"
            />
          </label>

          <div className="p-4 border border-slate-200 rounded-xl">
            <label className="block font-medium text-slate-800 mb-1">Support email</label>
            <p className="text-sm text-slate-500 mb-2">Shown to users needing help.</p>
            <input
              type="email"
              value={platform.support_email || ""}
              onChange={(e) => setPlatform({ ...platform, support_email: e.target.value })}
              placeholder="support@hiralent.com"
              className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={savePlatform}
            disabled={savingPlatform}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {savingPlatform ? "Saving..." : "Save Platform Settings"}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 ${
              toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <p className="font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
