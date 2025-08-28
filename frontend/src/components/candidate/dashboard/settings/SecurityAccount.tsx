import React, { useState } from "react";
import { ShieldAlert } from "lucide-react";

function SecurityAccount() {
  const [isEditing, setIsEditing] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSave = () => {
    console.log("Old Password:", oldPassword);
    console.log("New Password:", newPassword);
    // 🔹 Yaha API call karni hogi password reset ke liye
    setOldPassword("");
    setNewPassword("");
    setIsEditing(false);
  };

  const handleCancel = () => {
    setOldPassword("");
    setNewPassword("");
    setIsEditing(false);
  };

  return (
    <div className="border border-gray-300 p-4 rounded-lg  mb-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <ShieldAlert />
          <span className="font-medium ml-2">Security</span>
        </div>
      </div>

      {isEditing ? (
        // 🔹 Edit Mode
        <div className="grid grid-cols-2 gap-4">
          {/* Old Password */}
          <div className="flex flex-col relative">
            <label className="font-[500] absolute bg-white py-[4px] px-[8px] text-sm top-[-15px] left-[12px]">Old Password <span className="text-red-600">*</span></label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter old password"
              className="border rounded-md py-[11.2px] px-3"
            />
          </div>

          {/* New Password */}
          <div className="flex flex-col relative">
            <label className="font-[500] absolute bg-white py-[4px] px-[8px] text-sm top-[-15px] left-[12px]">New Password<span className="text-red-600">*</span></label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="border rounded-md py-[11.2px] px-3"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-md"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="text-gray-600 px-4 py-2 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // 🔹 View Mode
        <div className="flex justify-between flex-col md:flex-row">
          <div className="flex flex-col mb-2 md:mb-0">
            <span className="font-medium">Password</span>
            <span className="text-gray-400 font-medium">*************</span>
          </div>
          <div>
            <button
              onClick={() => setIsEditing(true)}
              className="w-full border border-blue-600 text-blue-600 font-semibold px-4 py-2 rounded-md"
            >
              Reset Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityAccount;
