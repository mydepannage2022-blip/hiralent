import React, { useState } from "react";
import { FolderClosed } from "lucide-react";

function SettingsAccount() {
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState("ahmed@fronxsolutions.com");
  const [newEmail, setNewEmail] = useState("");

  const handleSave = () => {
    if (newEmail.trim() !== "") {
      setEmail(newEmail);
      console.log("Email updated to:", newEmail); // yaha API call kar sakte ho
    }
    setNewEmail("");
    setIsEditing(false);
  };

  const handleCancel = () => {
    setNewEmail("");
    setIsEditing(false);
  };

  return (
    <div className="border border-gray-300 p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <FolderClosed />
          <span className="font-medium ml-2">Account</span>
        </div>
      </div>

      {isEditing ? (
        // 🔹 Edit Mode
        <div className="grid grid-cols-2 gap-4">
          {/* Current Email */}
          <div className="flex flex-col relative">
            <label className="font-[500] absolute bg-white py-[4px] px-[8px] text-sm top-[-15px] left-[12px]">Email Address</label>
            <input
              type="email"
              value={email}
              readOnly
              className="border rounded-md py-[11.2px] px-3"
            />
          </div>

          {/* New Email */}
          <div className="flex flex-col relative">
            <label className="font-[500] absolute bg-white py-[4px] px-[8px] text-sm top-[-15px] left-[12px]">New Email Address</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="+98 991 679 2356"
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
            <span className="font-medium">Email Address</span>
            <span className="text-gray-400 text-sm">{email}</span>
          </div>
          <div>
            <button
              onClick={() => setIsEditing(true)}
              className="w-full border border-blue-600 text-blue-600 font-semibold px-4 py-2 rounded-md"
            >
              Reset Email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsAccount;
