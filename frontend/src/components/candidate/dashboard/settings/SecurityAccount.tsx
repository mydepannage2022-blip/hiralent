"use client";
import React, { useState } from "react";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import axios from "axios";

function SecurityAccount() {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      await axios.put(
        `${process.env.NEXT_PUBLIC_BASE_URL}/auth/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setIsEditing(false);
        setSuccess("");
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setIsEditing(false);
  };

  return (
    <div className="border border-gray-200 p-5 rounded-xl mb-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <ShieldCheck size={18} className="text-[#005DDC]" />
          </div>
          <span className="font-semibold text-gray-800">Security</span>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg">
              {success}
            </div>
          )}

          {/* Current Password */}
          <div className="flex flex-col relative">
            <label className="text-sm font-medium text-gray-600 mb-1.5">
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full border border-gray-300 rounded-lg py-2.5 px-3 pr-10 text-sm focus:outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC]"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1.5">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 pr-10 text-sm focus:outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC]"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-600 mb-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full border border-gray-300 rounded-lg py-2.5 px-3 pr-10 text-sm focus:outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400">Password must be at least 8 characters long</p>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#005DDC] hover:bg-[#0046B3] text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Update Password"}
            </button>
            <button
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center flex-col md:flex-row gap-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-600">Password</span>
            <span className="text-gray-400 font-medium text-lg tracking-wider">••••••••••</span>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="border border-[#005DDC] text-[#005DDC] hover:bg-blue-50 font-medium px-5 py-2 rounded-lg text-sm transition-colors"
          >
            Change Password
          </button>
        </div>
      )}
    </div>
  );
}

export default SecurityAccount;
