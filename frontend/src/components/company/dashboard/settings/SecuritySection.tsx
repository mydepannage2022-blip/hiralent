"use client";

import React, { useState } from "react";
import { ShieldCheck, KeyRound, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import SectionCard2 from "./SectionCard2";
import LabeledInput from "./LabeledInput";
import { useAuth } from "@/src/context/AuthContext";
import { useDisable2FA } from "@/src/lib/auth/auth.queries";
import TwoFactorSetupModal from "@/src/components/settings/TwoFactorSetupModal";

const SecuritySection: React.FC = () => {
    const { user } = useAuth();
    const disableMutation = useDisable2FA();

    const [isEditing, setIsEditing] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    // 2FA state
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);
    const [disableCode, setDisableCode] = useState("");

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

    const handleDisable2FA = () => {
        if (!disableCode || disableCode.length !== 6) return;
        disableMutation.mutate(disableCode, {
            onSuccess: () => {
                setShowDisableConfirm(false);
                setDisableCode("");
            },
        });
    };

    const mfaEnabled = user?.mfa_enabled ?? false;

    return (
        <>
            <SectionCard2 title="Security" icon={<ShieldCheck className="w-5 h-5" />}>
                {/* Password */}
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

                {/* Divider */}
                <div className="border-t border-gray-100 my-5" />

                {/* 2FA */}
                <div className="flex items-center gap-2 mb-4">
                    <KeyRound size={16} className="text-[#005DDC]" />
                    <div>
                        <span className="font-semibold text-gray-800 block text-sm">Two-Factor Authentication</span>
                        <span className="text-xs text-gray-400">Add an extra layer of security to your account</span>
                    </div>
                </div>

                <div className="flex items-center justify-between flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Status:</span>
                        {mfaEnabled ? (
                            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 text-xs font-medium px-2.5 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 border border-gray-200 text-xs font-medium px-2.5 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                Not enabled
                            </span>
                        )}
                    </div>

                    {mfaEnabled ? (
                        <button
                            onClick={() => setShowDisableConfirm(true)}
                            className="border border-red-300 text-red-600 hover:bg-red-50 font-medium px-5 py-1.5 rounded-md text-sm transition-colors"
                        >
                            Disable 2FA
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowSetupModal(true)}
                            className="bg-[#005DDC] hover:bg-[#0046B3] text-white font-medium px-5 py-1.5 rounded-md text-sm transition-colors"
                        >
                            Enable 2FA
                        </button>
                    )}
                </div>

                {/* Disable confirmation */}
                <AnimatePresence>
                    {showDisableConfirm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-4 overflow-hidden"
                        >
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
                                <p className="text-sm text-red-700 font-medium">Confirm disable 2FA</p>
                                <p className="text-xs text-red-500">Enter your current authenticator code to disable two-factor authentication.</p>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={disableCode}
                                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                                    placeholder="6-digit code"
                                    className="w-full border border-red-200 rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 bg-white"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleDisable2FA}
                                        disabled={disableMutation.isPending || disableCode.length !== 6}
                                        className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {disableMutation.isPending ? (
                                            <><Loader2 size={13} className="animate-spin" /> Disabling...</>
                                        ) : (
                                            "Confirm Disable"
                                        )}
                                    </button>
                                    <button
                                        onClick={() => { setShowDisableConfirm(false); setDisableCode(""); }}
                                        className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </SectionCard2>

            {/* Setup modal */}
            <AnimatePresence>
                {showSetupModal && (
                    <TwoFactorSetupModal onClose={() => setShowSetupModal(false)} />
                )}
            </AnimatePresence>
        </>
    );
};

export default SecuritySection;
