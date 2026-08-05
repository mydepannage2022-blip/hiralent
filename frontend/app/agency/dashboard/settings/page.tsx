"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { API_V1_BASE } from "@/src/lib/config/api";
import {
  Shield,
  Bell,
  Eye,
  EyeOff,
  Database,
  Download,
  Trash2,
  Mail,
  AlertCircle,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/src/components/agency/ui/button";

export default function SettingsPage() {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [caseUpdates, setCaseUpdates] = useState(true);
  const [newClients, setNewClients] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      setChangingPassword(true);
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `${API_V1_BASE}/agency/settings/password`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change password");
      }

      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleNotificationSave = async () => {
    try {
      setSavingNotifications(true);
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `${API_V1_BASE}/agency/settings/notifications`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            emailNotifications,
            caseUpdates,
            newClients,
            systemAlerts,
            weeklyReports,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save notification settings");

      toast.success("Notification preferences updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `${API_V1_BASE}/agency/settings/export-data`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to export data");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agency-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Data exported successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to export data");
    }
  };

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );

    if (confirmed) {
      const doubleConfirm = window.confirm(
        "This will permanently delete all your data. Are you absolutely sure?"
      );

      if (doubleConfirm) {
        toast.error("Please contact support to delete your account");
      }
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto">
        <div className="space-y-6">
          {/* Security Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50/40">
                <Shield className="w-4 h-4 text-blue-700" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Security</h2>
                <p className="text-xs text-slate-500">Password and access</p>
              </div>
            </div>

            {/* Change Password */}
            <div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Change password
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update your password to keep your account secure
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full h-11 px-4 pr-12 border border-slate-200/70 rounded-xl bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-11 px-4 pr-12 border border-slate-200/70 rounded-xl bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Must be at least 8 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-11 px-4 pr-12 border border-slate-200/70 rounded-xl bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end">
                  <Button
                    onClick={handlePasswordChange}
                    disabled={changingPassword}
                    variant="soft"
                  >
                    {changingPassword ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Notification Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50/40">
                <Bell className="w-4 h-4 text-blue-700" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Notifications
                </h2>
                <p className="text-xs text-slate-500">Email and activity alerts</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 divide-y divide-slate-200/70">
              {/* Email Notifications */}
              <div className="flex items-center justify-between gap-4 p-4 hover:bg-white/60 transition-colors rounded-t-2xl">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white">
                    <Mail className="w-4.5 h-4.5 text-slate-500" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Email notifications</p>
                    <p className="text-sm text-slate-600">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                    emailNotifications
                      ? "bg-blue-600 border-blue-600"
                      : "bg-slate-200 border-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      emailNotifications ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Case Updates */}
              <div className="flex items-center justify-between gap-4 p-4 hover:bg-white/60 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white">
                    <AlertCircle className="w-4.5 h-4.5 text-slate-500" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Case updates</p>
                    <p className="text-sm text-slate-600">
                      Get notified about case status changes
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCaseUpdates(!caseUpdates)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                    caseUpdates
                      ? "bg-blue-600 border-blue-600"
                      : "bg-slate-200 border-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      caseUpdates ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* New Clients */}
              <div className="flex items-center justify-between gap-4 p-4 hover:bg-white/60 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white">
                    <User className="w-4.5 h-4.5 text-slate-500" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">New clients</p>
                    <p className="text-sm text-slate-600">
                      Notify when new clients are assigned
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setNewClients(!newClients)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                    newClients
                      ? "bg-blue-600 border-blue-600"
                      : "bg-slate-200 border-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      newClients ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* System Alerts */}
              <div className="flex items-center justify-between gap-4 p-4 hover:bg-white/60 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white">
                    <AlertCircle className="w-4.5 h-4.5 text-slate-500" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">System alerts</p>
                    <p className="text-sm text-slate-600">
                      Important system notifications
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSystemAlerts(!systemAlerts)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                    systemAlerts
                      ? "bg-blue-600 border-blue-600"
                      : "bg-slate-200 border-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      systemAlerts ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Weekly Reports */}
              <div className="flex items-center justify-between gap-4 p-4 hover:bg-white/60 transition-colors rounded-b-2xl">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white">
                    <Calendar className="w-4.5 h-4.5 text-slate-500" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Weekly reports</p>
                    <p className="text-sm text-slate-600">
                      Receive weekly performance summaries
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setWeeklyReports(!weeklyReports)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                    weeklyReports
                      ? "bg-blue-600 border-blue-600"
                      : "bg-slate-200 border-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      weeklyReports ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <Button
                onClick={handleNotificationSave}
                disabled={savingNotifications}
                variant="soft"
              >
                {savingNotifications ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </motion.div>

          {/* Data Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50/40">
                <Database className="w-4 h-4 text-blue-700" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Data management
                </h2>
                <p className="text-xs text-slate-500">Export and account controls</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Export Data */}
              <div className="flex items-center justify-between gap-4 p-4 border border-slate-200/70 rounded-2xl bg-slate-50/40">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white">
                    <Download className="w-4.5 h-4.5 text-blue-700" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Export your data</p>
                    <p className="text-sm text-slate-600">
                      Download a copy of all your account data
                    </p>
                  </div>
                </div>
                <Button onClick={handleExportData} variant="soft">
                  Export
                </Button>
              </div>

              {/* Delete Account */}
              <div className="flex items-center justify-between gap-4 p-4 border border-red-200/70 bg-white rounded-2xl">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200/70 bg-red-50">
                    <Trash2 className="w-4.5 h-4.5 text-red-700" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Delete account</p>
                    <p className="text-sm text-slate-600">
                      Permanently delete your account and all data
                    </p>
                  </div>
                </div>
                <Button onClick={handleDeleteAccount} variant="danger">
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}