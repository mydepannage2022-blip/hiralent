import React, { useState } from "react";
import { User, SquarePen } from "lucide-react";

function SettingsFullname() {
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("Ahmed");
  const [lastName, setLastName] = useState("Shahid");

  const handleSave = () => {
    // Yaha pe API call ya backend save karna ho sakta hai
    console.log("Saved:", firstName, lastName);
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Reset values (optional)
    setFirstName("Ahmed");
    setLastName("Shahid");
    setIsEditing(false);
  };

  return (
    <div className="border border-gray-300 p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <User />
          <span className="font-medium ml-2">Full name</span>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600"
          >
            <SquarePen />
          </button>
        )}
      </div>

      {isEditing ? (
        // 🔹 Edit Mode
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col relative">
            <label className="font-[500] absolute bg-white py-[4px] px-[8px] text-sm top-[-15px] left-[12px]">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="border rounded-md py-[11.2px] px-3"
            />
          </div>
          <div className="flex flex-col relative">
            <label className="font-[500] absolute bg-white py-[4px] px-[8px] text-sm top-[-15px] left-[12px]">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="border rounded-md py-[11.2px] px-3"
            />
          </div>

          <div className="col-span-2 flex gap-4 mt-4">
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // 🔹 View Mode
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="font-medium">First name</span>
            <span className="text-gray-400 text-sm">{firstName}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-medium">Last name</span>
            <span className="text-gray-400 text-sm">{lastName}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsFullname;
