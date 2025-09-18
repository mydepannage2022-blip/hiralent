import React from "react";
import { ScanEye, LockKeyhole } from "lucide-react";

function QuestionAccount() {
  return (
    <div className="w-full p-5 rounded-xl shadow-sm bg-white">
      <div className="border-b-1 border-gray-300 pb-3 mb-5">
        <div className="text-xl w-12 h-12 flex justify-center items-center rounded-full text-[#002F6E] bg-[#EFF5FF] mb-2">
          <ScanEye />
        </div>
        <span className="text-sm md:text-lg font-medium mb-2">Why isn’t my info shown here?</span>
        <p className="text-xs text-gray-400">
          We’re hiding some account details to protect your identiWe’re hiding
          some account details to protect your identity.We’re hiding some
          account details to protect your identity.We’re hiding some account
          details to protect your identity.We’re hiding some{" "}
        </p>
      </div>
      <div className=" pb-3 mb-3">
        <div className="text-xl w-12 h-12 flex justify-center items-center rounded-full text-[#002F6E] bg-[#EFF5FF] mb-2">
          <LockKeyhole />
        </div>
        <span className="text-sm md:text-lg font-medium mb-2">Which details can be edited?</span>
        <p className="text-xs text-gray-400">
          Details Airbnb uses to verify your identity can’t be changed. Contact
          info and some personal details can be edited, but we may ask you
          verify your identity the next time you book or create a listing.
        </p>
      </div>
    </div>
  );
}

export default QuestionAccount;
