import React from "react";
import { User, SquarePen } from "lucide-react";

function SettingsFullname() {
  return (
    <div className="border-1 border-gray-300 p-4 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex">
          <span>
            <User />
          </span>
          <span className="font-medium">&nbsp; Full name</span>
        </div>
        <div className="text-blue-600">
          <SquarePen />
        </div>
      </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
            <span className="font-medium">First name</span>
            <span className="text-gray-400 text-sm">Ahmed</span>
            </div>
            <div className="flex flex-col">
                <span className="font-medium">Last name</span>
            <span className="text-gray-400 text-sm">Shahid</span>
            </div>
        </div>
    </div>
  );
}

export default SettingsFullname;
