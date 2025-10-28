"use client";

import React, { useState } from "react";
import { SquareUser } from "lucide-react";
import SectionCard2 from "./SectionCard2";
import LabeledInput from "./LabeledInput";

const AccountSection: React.FC = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [email, setEmail] = useState("hr@hiralent.com");
    const [newEmail, setNewEmail] = useState("");

    const handleStartEdit = () => {
        setNewEmail("");
        setIsEditing(true);
    };

    const handleSave = () => {
        if (newEmail.trim()) {
            setEmail(newEmail.trim());
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setNewEmail("");
        setIsEditing(false);
    };

    return (
        <SectionCard2 title="Account" icon={<SquareUser className="w-5 h-5" />}>
            {isEditing ? (
                <form onSubmit={(e) => e.preventDefault()}>
                    <div className="grid sm:grid-cols-2 gap-6 sm:gap-4">
                        <LabeledInput
                            label="Current Email"
                            value={email}
                            readOnly
                            type="email"
                        />
                        <LabeledInput
                            label="New Email"
                            placeholder="Enter new email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            required
                            type="email"
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
                        <p className="font-medium">Email Address</p>
                        <p>{email}</p>
                    </div>
                    <button
                        onClick={handleStartEdit}
                        className="border border-[#005DDC] text-[#005DDC] px-4 py-1.5 rounded-md text-sm transition-colors"
                    >
                        Reset Email
                    </button>
                </div>
            )}
        </SectionCard2>
    );
};

export default AccountSection;