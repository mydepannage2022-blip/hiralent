import React from "react";

function DeleteAccount() {
  return (
    <div className="border-1 border-gray-300 p-4 rounded-lg">
      <div className="flex justify-between flex-col items-center md:flex-row">
        <div className="flex flex-col">
          <span className="font-medium">Delete Account</span>
          <p className="text-gray-400 text-sm mb-2">We’d hate to see you go, but you’re welcome to delete your account anytime. Just remember, once you delete it, it’s gone forever delete it, it’s gone forever delete it, i</p>
        </div>
        <div>
          <button className="w-full md:w-[200px] bg-red-600 text-white font-semibold px-4 py-2 rounded-md">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteAccount;
