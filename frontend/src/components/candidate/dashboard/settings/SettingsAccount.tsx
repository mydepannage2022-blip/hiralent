import React from "react";
import { FolderClosed } from "lucide-react";

function SettingsAccount() {
  return (
    <div className="border-1 border-gray-300 p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex">
          <span>
            <FolderClosed />
          </span>
          <span className="font-medium">&nbsp; Account</span>
        </div>
      </div>
      <div className="flex justify-between flex-col md:flex-row">
        <div className="flex flex-col mb-2 md:mb-0">
          <span className="font-medium">Email Address</span>
          <span className="text-gray-400 text-sm">
            ahmed@fronxsolutions.com
          </span>
        </div>
        <div>
          <button className="w-full border border-blue-600 text-blue-600 font-semibold px-4 py-2 rounded-md">
            Reset Email
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsAccount;
