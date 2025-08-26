import React from "react";
import { ShieldAlert } from "lucide-react";

function SecurityAccount() {
  return (
    <div className="border-1 border-gray-300 p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex">
          <span>
            <ShieldAlert />
          </span>
          <span className="font-medium">&nbsp; Security</span>
        </div>
      </div>
      <div className="flex justify-between flex-col md:flex-row">
        <div className="flex flex-col mb-2 md:mb-0">
          <span className="font-medium">Password</span>
          <span className="text-gray-400 font-medium">*************</span>
        </div>
        <div>
          <button className="w-full border border-blue-600 text-blue-600 font-semibold px-4 py-2 rounded-md">
            Reset Password
          </button>
        </div>
      </div>
    </div>
  );
}

export default SecurityAccount;
