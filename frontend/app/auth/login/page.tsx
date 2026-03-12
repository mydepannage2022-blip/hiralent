// pages/auth/login.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLogin, useVerifyLogin2FA, useSetupWithToken } from "../../../src/lib/auth/auth.queries";
import { getAuthPageConfig } from "../../../config/authPagesConfig";
import SmartLink from "@/src/components/layout/SmartLink";
import AuthLayout from "@/src/components/layout/AuthLayout";
import { ShieldCheck, Loader2, Copy, CheckCheck, Key, Download } from "lucide-react";
import { useRouter } from "next/navigation";

interface FormData { email: string; password: string }
interface FormErrors { email?: string; password?: string }
interface FormTouched { email?: boolean; password?: boolean }

type Step = "credentials" | "setup-qr" | "setup-verify" | "setup-recovery" | "mfa-verify";

/** Modern 6-digit OTP boxes */
const OtpBoxes = ({
  digits,
  onChange,
  onSubmit,
  inputRefs,
}: {
  digits: string[];
  onChange: (i: number, val: string) => void;
  onSubmit: () => void;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
}) => {
  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
    if (e.key === "Enter" && digits.join("").length === 6) onSubmit();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      pasted.split("").forEach((ch, i) => onChange(i, ch));
      inputRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <motion.input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          autoFocus={i === 0}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(-1);
            onChange(i, val);
            if (val && i < 5) inputRefs.current[i + 1]?.focus();
            if (val && i === 5) onSubmit();
          }}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-all duration-150 ${
            digit
              ? "border-[#1B73E8] bg-blue-50 text-[#1B73E8] shadow-sm shadow-blue-100"
              : "border-gray-200 bg-white text-gray-800 hover:border-gray-300"
          } focus:border-[#1B73E8] focus:bg-blue-50 focus:shadow-sm focus:shadow-blue-100`}
          whileTap={{ scale: 0.95 }}
        />
      ))}
    </div>
  );
};

const LoginPage = () => {
  const router = useRouter();
  const loginMutation = useLogin();
  const verifyMutation = useVerifyLogin2FA();
  const setupWithTokenMutation = useSetupWithToken();
  const pageConfig = getAuthPageConfig("login");

  const [formData, setFormData] = useState<FormData>({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [passwordVisibility, setPasswordVisibility] = useState(false);
  const [step, setStep] = useState<Step>("credentials");
  const [tempToken, setTempToken] = useState("");
  const [qrData, setQrData] = useState<{ qrCodeDataUrl: string; manualCode: string } | null>(null);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [copied, setCopied] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [codesCopied, setCodesCopied] = useState(false);

  // Watch login mutation result to transition to the right step
  useEffect(() => {
    const data = loginMutation.data as any;
    if (!data) return;

    if (data.requiresMFASetup && data.tempToken) {
      setTempToken(data.tempToken);
      setupWithTokenMutation.mutate(data.tempToken, {
        onSuccess: (qr) => {
          setQrData({ qrCodeDataUrl: qr.qrCodeDataUrl, manualCode: qr.manualCode });
          setStep("setup-qr");
        },
      });
    } else if (data.requiresMFA && data.tempToken) {
      setTempToken(data.tempToken);
      setStep("mfa-verify");
    }
  }, [loginMutation.data]);

  // Watch verify mutation result for first-time setup recovery codes
  useEffect(() => {
    const data = verifyMutation.data as any;
    if (data?.recoveryCodes?.length > 0) {
      setRecoveryCodes(data.recoveryCodes);
      setStep("setup-recovery");
    }
  }, [verifyMutation.data]);

  const validate = (name: keyof FormData, value: string): string | undefined => {
    if (name === "email") {
      if (!value.trim()) return "Email is required";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid email address";
    }
    if (name === "password") {
      if (!value) return "Password is required";
      if (value.length < 6) return "Password must be at least 6 characters";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as keyof FormData;
    setFormData((p) => ({ ...p, [field]: value }));
    if (touched[field]) setErrors((p) => ({ ...p, [field]: validate(field, value) }));
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as keyof FormData;
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors((p) => ({ ...p, [field]: validate(field, value) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const newErrors: FormErrors = {};
    (Object.keys(formData) as (keyof FormData)[]).forEach((k) => {
      const err = validate(k, formData[k]);
      if (err) newErrors[k] = err;
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      loginMutation.mutate({ email: formData.email.toLowerCase().trim(), password: formData.password });
    }
  };

  const handleOtpChange = (i: number, val: string) => {
    const updated = [...otpDigits];
    updated[i] = val;
    setOtpDigits(updated);
  };

  const handleVerify = useCallback(() => {
    const code = otpDigits.join("");
    if (code.length !== 6) return;
    verifyMutation.mutate({ tempToken, mfaToken: code });
  }, [otpDigits, tempToken, verifyMutation]);

  const handleCopy = () => {
    if (qrData?.manualCode) {
      navigator.clipboard.writeText(qrData.manualCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyAllCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCodesCopied(true);
    setTimeout(() => setCodesCopied(false), 2000);
  };

  const handleDownloadCodes = () => {
    const text = `Hiralent Recovery Codes\nGenerated: ${new Date().toLocaleDateString()}\n\nKeep these codes safe. Each code can only be used once.\n\n${recoveryCodes.join("\n")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hiralent-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleProceedToDashboard = () => {
    const data = verifyMutation.data as any;
    const role = data?.user?.role;
    if (role === "candidate") router.push("/candidate/dashboard");
    else if (role === "company_admin") router.push("/company/dashboard");
    else if (role === "agency_admin") router.push("/agency/dashboard");
    else router.push("/");
  };

  const inputClass = (field: keyof FormData) => {
    const base = "w-full px-4 py-3 border rounded-lg focus:outline-none text-xs text-[#757575]";
    return touched[field] && errors[field]
      ? `${base} border-red-500 focus:ring-2 focus:ring-red-500 focus:border-transparent`
      : `${base} border-gray-300 focus:ring-2 focus:ring-[#063B82] focus:border-transparent`;
  };

  const recoveryLinkUrl = `/auth/recovery-code?token=${encodeURIComponent(tempToken)}`;

  return (
    <AuthLayout
      backgroundImage={pageConfig.backgroundImage}
      testimonials={pageConfig.testimonials}
      title={pageConfig.title}
      subtitle={pageConfig.subtitle}
      showTabs={false}
      activeTab="candidate"
    >
      <AnimatePresence mode="wait">

        {/* ─── STEP 1: Email + Password ─── */}
        {step === "credentials" && (
          <motion.form
            key="credentials"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
              <label className="block text-[#222] font-medium text-xs mb-1">Email<span className="text-red-500">*</span></label>
              <motion.input
                type="email" name="email" id="email"
                value={formData.email} onChange={handleInputChange} onBlur={handleInputBlur}
                placeholder="Enter your Email Address"
                className={inputClass("email")} required
                whileFocus={{ scale: 1.02 }} transition={{ duration: 0.3 }}
              />
              {touched.email && errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }}>
              <label className="block text-[#222] font-medium text-xs mb-1">Password<span className="text-red-500">*</span></label>
              <div className="relative">
                <motion.input
                  type={passwordVisibility ? "text" : "password"} name="password" id="password"
                  value={formData.password} onChange={handleInputChange} onBlur={handleInputBlur}
                  placeholder="Enter your Password"
                  className={`${inputClass("password")} pr-10`}
                  whileFocus={{ scale: 1.02 }} transition={{ duration: 0.3 }}
                />
                <motion.button type="button" onClick={() => setPasswordVisibility((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                  {passwordVisibility ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </motion.button>
              </div>
              {touched.password && errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </motion.div>

            <div className="text-right">
              <SmartLink href="/auth/forgot-password" className="text-[#1B73E8] hover:underline text-xs">Forgot your password?</SmartLink>
            </div>

            <motion.button type="submit" disabled={loginMutation.isPending || setupWithTokenMutation.isPending}
              className="w-full bg-[#1B73E8] text-white py-3 rounded-lg font-medium hover:bg-[#1557B0] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
              whileHover={{ scale: loginMutation.isPending ? 1 : 1.03 }} whileTap={{ scale: 0.97 }}>
              {loginMutation.isPending || setupWithTokenMutation.isPending
                ? <><Loader2 size={15} className="animate-spin" /> Signing in...</>
                : "Sign In"}
            </motion.button>

            <div className="text-center text-gray-500 text-sm">OR</div>

            <motion.button type="button"
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </motion.button>

            <motion.div className="text-center text-sm text-gray-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              Don&apos;t have an account?{" "}
              <SmartLink href="/auth/signup" className="text-[#1B73E8] hover:underline">Sign up</SmartLink>
            </motion.div>
          </motion.form>
        )}

        {/* ─── STEP 2a: First-time 2FA setup — QR code ─── */}
        {step === "setup-qr" && (
          <motion.div key="setup-qr"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.22 }} className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldCheck size={28} className="text-[#1B73E8]" />
              </div>
              <h2 className="text-base font-semibold text-gray-800">Set Up Two-Factor Authentication</h2>
              <p className="text-xs text-gray-500">Scan the QR code with Google Authenticator or any TOTP app.</p>
            </div>

            {!qrData ? (
              <div className="flex flex-col items-center py-8 gap-3">
                <Loader2 size={28} className="animate-spin text-[#1B73E8]" />
                <p className="text-sm text-gray-400">Generating QR code...</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <div className="p-3 border border-gray-200 rounded-xl bg-gray-50">
                    <img src={qrData.qrCodeDataUrl} alt="2FA QR Code" className="w-44 h-44" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 text-center">
                    Can&apos;t scan? Enter this <span className="text-[#1B73E8] font-semibold">setup key</span> manually in your app:
                  </p>
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <code className="text-xs font-mono text-gray-700 flex-1 break-all">{qrData.manualCode}</code>
                    <button onClick={handleCopy} className="text-gray-400 hover:text-[#1B73E8] transition-colors flex-shrink-0">
                      {copied ? <CheckCheck size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 text-center">
                    This is your <strong>authenticator setup key</strong>, not a recovery code.
                  </p>
                </div>

                <motion.button onClick={() => { setOtpDigits(["","","","","",""]); setStep("setup-verify"); }}
                  className="w-full bg-[#1B73E8] text-white py-3 rounded-lg font-medium hover:bg-[#1557B0] transition-colors text-sm"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  I&apos;ve scanned the code — Continue
                </motion.button>
              </>
            )}
          </motion.div>
        )}

        {/* ─── STEP 2b: First-time 2FA setup — confirm code ─── */}
        {step === "setup-verify" && (
          <motion.div key="setup-verify"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.22 }} className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldCheck size={28} className="text-[#1B73E8]" />
              </div>
              <h2 className="text-base font-semibold text-gray-800">Confirm Your Authenticator</h2>
              <p className="text-xs text-gray-500">Enter the 6-digit code shown in your app to complete setup.</p>
            </div>

            <OtpBoxes digits={otpDigits} onChange={handleOtpChange} onSubmit={handleVerify} inputRefs={otpRefs} />

            <motion.button onClick={handleVerify}
              disabled={verifyMutation.isPending || otpDigits.join("").length !== 6}
              className="w-full bg-[#1B73E8] text-white py-3 rounded-lg font-medium hover:bg-[#1557B0] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {verifyMutation.isPending
                ? <><Loader2 size={15} className="animate-spin" /> Verifying...</>
                : "Verify & Sign In"}
            </motion.button>

            <button onClick={() => setStep("setup-qr")}
              className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Back to QR code
            </button>
          </motion.div>
        )}

        {/* ─── STEP 2c: Show recovery codes (first-time setup only) ─── */}
        {step === "setup-recovery" && (
          <motion.div key="setup-recovery"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.22 }} className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto">
                <Key size={28} className="text-amber-500" />
              </div>
              <h2 className="text-base font-semibold text-gray-800">Save Your Recovery Codes</h2>
              <p className="text-xs text-gray-500">
                Store these codes somewhere safe. Each code can be used <strong>once</strong> if you lose access to your authenticator app.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1.5 max-h-52 overflow-y-auto">
              {recoveryCodes.map((code, i) => (
                <div key={i} className="font-mono text-xs text-gray-700 bg-white border border-gray-100 rounded-lg px-3 py-2 tracking-wider break-all">
                  <span className="text-gray-400 mr-2 select-none">{i + 1}.</span>{code}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={handleCopyAllCodes}
                className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-lg py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                {codesCopied ? <CheckCheck size={13} className="text-green-500" /> : <Copy size={13} />}
                {codesCopied ? "Copied!" : "Copy all"}
              </button>
              <button onClick={handleDownloadCodes}
                className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 rounded-lg py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                <Download size={13} />
                Download
              </button>
            </div>

            <motion.button onClick={handleProceedToDashboard}
              className="w-full bg-[#1B73E8] text-white py-3 rounded-lg font-medium hover:bg-[#1557B0] transition-colors text-sm"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              I&apos;ve saved my codes — Go to Dashboard
            </motion.button>
          </motion.div>
        )}

        {/* ─── STEP 3: Returning user — enter existing 2FA code ─── */}
        {step === "mfa-verify" && (
          <motion.div key="mfa-verify"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.22 }} className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldCheck size={28} className="text-[#1B73E8]" />
              </div>
              <h2 className="text-base font-semibold text-gray-800">Two-Factor Authentication</h2>
              <p className="text-xs text-gray-500">Enter the 6-digit code from your authenticator app.</p>
            </div>

            <OtpBoxes digits={otpDigits} onChange={handleOtpChange} onSubmit={handleVerify} inputRefs={otpRefs} />

            <motion.button onClick={handleVerify}
              disabled={verifyMutation.isPending || otpDigits.join("").length !== 6}
              className="w-full bg-[#1B73E8] text-white py-3 rounded-lg font-medium hover:bg-[#1557B0] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {verifyMutation.isPending
                ? <><Loader2 size={15} className="animate-spin" /> Verifying...</>
                : "Verify"}
            </motion.button>

            <div className="text-center space-y-2">
              <SmartLink
                href={recoveryLinkUrl}
                className="text-xs text-[#1B73E8] hover:underline flex items-center justify-center gap-1"
              >
                <Key size={12} />
                Use a recovery code instead
              </SmartLink>
              <button
                onClick={() => {
                  setStep("credentials");
                  setOtpDigits(["","","","","",""]);
                  setTempToken("");
                  loginMutation.reset();
                }}
                className="block w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
                ← Back to login
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </AuthLayout>
  );
};

export default LoginPage;
