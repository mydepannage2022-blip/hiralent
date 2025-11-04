"use client";

import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import SectionCard2 from "./SectionCard2";
import LabeledInput from "./LabeledInput";

const SecuritySection: React.FC = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const startEdit = () => {
        setOldPassword("");
        setNewPassword("");
        setIsEditing(true);
    };

    const handleSave = () => {
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
        <SectionCard2 title="Security" icon={<ShieldCheck className="w-5 h-5" />}>
            {isEditing ? (
                <form onSubmit={(e) => e.preventDefault()}>
                    <div className="grid sm:grid-cols-2 gap-6 sm:gap-4">
                        <LabeledInput
                            label="Old Password"
                            placeholder="Enter old password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            type="password"
                            required
                        />
                        <LabeledInput
                            label="New Password"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            type="password"
                            required
                        />
                    </div>

                    <div className="flex gap-2 mt-5">
                        <button
                            type="button"
                            onClick={handleSave}
                            className="bg-[#005DDC] text-white px-6 py-1.5 rounded-md text-sm font-medium"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="text-[#515151] text-sm px-6 py-1.5 rounded-md hover:border hover:border-[#515151] font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Password</p>
                        <p>••••••••</p>
                    </div>
                    <button
                        onClick={startEdit}
                        className="border border-[#005DDC] text-[#005DDC] px-4 py-1.5 rounded-md text-sm transition-colors"
                    >
                        Reset Password
                    </button>
                </div>
            )}
        </SectionCard2>
    );
};

export default SecuritySection;