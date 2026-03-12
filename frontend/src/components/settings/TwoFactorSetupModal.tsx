"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Copy, CheckCheck, Loader2 } from "lucide-react";
import { useSetup2FA, useEnable2FA } from "@/src/lib/auth/auth.queries";

interface Props {
  onClose: () => void;
}

export default function TwoFactorSetupModal({ onClose }: Props) {
  const [step, setStep] = useState<"qr" | "verify">("qr");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [qrData, setQrData] = useState<{ qrCodeDataUrl: string; manualCode: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setupMutation = useSetup2FA();
  const enableMutation = useEnable2FA();

  // Auto-start setup when modal opens
  React.useEffect(() => {
    setupMutation.mutate(undefined, {
      onSuccess: (data) => setQrData({ qrCodeDataUrl: data.qrCodeDataUrl, manualCode: data.manualCode }),
    });
  }, []);

  const handleCopy = () => {
    if (qrData?.manualCode) {
      navigator.clipboard.writeText(qrData.manualCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otpDigits];
    updated[index] = value.slice(-1);
    setOtpDigits(updated);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleEnable = () => {
    const code = otpDigits.join("");
    if (code.length !== 6) return;
    enableMutation.mutate(code, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 360, damping: 36 }}
        className="bg-white rounded-2xl border border-gray-200 w-full max-w-md p-6 relative shadow-xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <X size={15} className="text-gray-500" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} className="text-[#005DDC]" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 text-base">Set Up Two-Factor Authentication</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {step === "qr" ? "Step 1 of 2 — Scan QR Code" : "Step 2 of 2 — Confirm Code"}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === "qr" ? (
            <motion.div
              key="qr"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {setupMutation.isPending || !qrData ? (
                <div className="flex flex-col items-center py-10 gap-3">
                  <Loader2 size={28} className="animate-spin text-[#005DDC]" />
                  <p className="text-sm text-gray-400">Generating QR code...</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Scan the QR code below using <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP authenticator app.
                  </p>
                  <div className="flex justify-center">
                    <div className="p-3 border border-gray-200 rounded-xl bg-gray-50">
                      <img src={qrData.qrCodeDataUrl} alt="2FA QR Code" className="w-44 h-44" />
                    </div>
                  </div>

                  {/* Manual entry */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">Or enter the code manually:</p>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <code className="text-xs font-mono text-gray-700 flex-1 break-all">{qrData.manualCode}</code>
                      <button onClick={handleCopy} className="text-gray-400 hover:text-[#005DDC] transition-colors flex-shrink-0">
                        {copied ? <CheckCheck size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep("verify")}
                    className="w-full bg-[#005DDC] hover:bg-[#0046B3] text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                  >
                    Next: I&apos;ve scanned the QR code
                  </button>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <p className="text-sm text-gray-600">
                Enter the 6-digit code from your authenticator app to confirm setup.
              </p>

              {/* OTP input */}
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-11 h-12 text-center text-lg font-semibold border-2 rounded-xl focus:outline-none focus:border-[#005DDC] border-gray-200 transition-colors"
                  />
                ))}
              </div>

              <button
                onClick={handleEnable}
                disabled={enableMutation.isPending || otpDigits.join("").length !== 6}
                className="w-full bg-[#005DDC] hover:bg-[#0046B3] text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {enableMutation.isPending ? (
                  <><Loader2 size={15} className="animate-spin" /> Enabling...</>
                ) : (
                  "Enable Two-Factor Authentication"
                )}
              </button>

              <button
                onClick={() => setStep("qr")}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Back to QR code
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
