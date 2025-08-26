import React from "react";
import { MonitorSmartphone, Laptop, Hand, X } from "lucide-react";

function DevicesAccount() {
  return (
    <div className="w-full p-5 rounded-xl shadow-sm bg-white">
      <div className="flex justify-center flex-col items-center">
        <span>
          <MonitorSmartphone size={96} strokeWidth={1.75} />
        </span>
        <span className="text-lg font-medium">Devices</span>
      </div>

      <div className="w-full">
        <span className="font-medium">This device</span>

        <div className="flex gap-1 items-center mb-2">
          <Laptop size={20} />
          <span className="font-medium">macbook</span>
        </div>

        <div className="flex gap-1 items-center justify-center border-y border-gray-300 py-2 mb-2">
          <span className="text-red-600">
            <Hand size={20} />
          </span>
          <span className="font-medium text-red-600">
            Terminate All Other Sessions
          </span>
        </div>

        <span className="font-medium">Active Devices</span>

        <div className="flex items-center justify-between w-full  py-2">
          <div className="flex items-center gap-3">
            <Laptop size={22} className="text-gray-600" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm md:text-base font-medium">
                Chrome 134 Web 10.9.44A
              </span>
              <span className="text-xs text-gray-500">
                Hillsboro, United States · Tue
              </span>
            </div>
          </div>

          <button className="p-1 rounded-full hover:bg-gray-100">
            <X size={18} className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default DevicesAccount;
