"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAddSkill } from "@/src/lib/profile/profile.queries";

interface Props {
  skills: string[];
}

export default function AddSkillsModal({ skills }: Props) {
  const router = useRouter();
  const addSkill = useAddSkill();

  const [selected, setSelected] = useState<Set<string>>(new Set(skills));
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 350);
    return () => clearTimeout(t);
  }, []);

  const toggle = (skill: string) => {
    if (added.has(skill) || isSubmitting || done) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(skill) ? next.delete(skill) : next.add(skill);
      return next;
    });
  };

  const handleAdd = async () => {
    if (isSubmitting || done || selected.size === 0) return;
    setIsSubmitting(true);
    for (const skill of [...selected].filter(s => !added.has(s))) {
      await new Promise<void>(resolve => {
        const payload = { skill_name: skill.slice(0, 50), skill_category: "technical" as const, proficiency: "intermediate" as const, years_experience: 0 };
        console.log("[AddSkillsModal] sending payload:", payload);
        addSkill.mutate(
          payload,
          {
            onSuccess: () => {
              setAdded(prev => new Set([...prev, skill]));
              resolve();
            },
            onError: (err: any) => {
              // 400 "Skill already exists" → treat as success silently
              const msg: string = err?.response?.data?.message ?? err?.message ?? "";
              const alreadyExists =
                msg.toLowerCase().includes("already exists") ||
                err?.response?.status === 409;
              if (alreadyExists) {
                setAdded(prev => new Set([...prev, skill]));
              }
              resolve();
            },
          }
        );
      });
    }
    setIsSubmitting(false);
    setDone(true);
    setTimeout(dismiss, 1800);
  };

  const dismiss = () => {
    setVisible(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("addSkills");
    router.replace(url.pathname + (url.search || ""), { scroll: false });
  };

  const pendingCount = [...selected].filter(s => !added.has(s)).length;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismiss}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          />

          {/* Centering wrapper */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5 pointer-events-none">
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              className="pointer-events-auto w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
            >
              {/* Blue accent top bar */}
              <div className="h-1 w-full" style={{ background: "#005DDC" }} />

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "#EEF4FF" }}
                  >
                    <Zap size={16} style={{ color: "#005DDC" }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 leading-tight">
                      Add missing skills
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Required for the job you just viewed
                    </p>
                  </div>
                </div>

                <button
                  onClick={dismiss}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">

                {/* Label */}
                <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">
                  Select skills to add
                </p>

                {/* Skill chips */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {skills.map((skill, i) => {
                    const isAdded = added.has(skill);
                    const isSelected = selected.has(skill);

                    return (
                      <motion.button
                        key={skill}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, type: "spring", stiffness: 380, damping: 28 }}
                        onClick={() => toggle(skill)}
                        whileTap={!isAdded ? { scale: 0.95 } : {}}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all duration-150 outline-none"
                        style={{
                          cursor: isAdded ? "default" : "pointer",
                          ...(isAdded ? {
                            background: "#F0FFF4",
                            color: "#16A34A",
                            borderColor: "#BBF7D0",
                          } : isSelected ? {
                            background: "#005DDC",
                            color: "#ffffff",
                            borderColor: "#005DDC",
                            boxShadow: "0 2px 8px rgba(0,93,220,0.25)",
                          } : {
                            background: "#F8FAFC",
                            color: "#475569",
                            borderColor: "#E2E8F0",
                          }),
                        }}
                      >
                        <AnimatePresence mode="wait">
                          {isAdded && (
                            <motion.span
                              key="chk"
                              initial={{ scale: 0, rotate: -20 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 20 }}
                              className="flex"
                            >
                              <Check size={11} strokeWidth={3} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {skill}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Progress bar while submitting */}
                <AnimatePresence>
                  {isSubmitting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: "#005DDC" }}
                          initial={{ width: "0%" }}
                          animate={{ width: `${(added.size / selected.size) * 100}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Adding {added.size} of {selected.size} skills…
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Success */}
                <AnimatePresence>
                  {done && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-100 mb-4"
                    >
                      <Check size={14} className="text-green-600 flex-shrink-0" strokeWidth={2.5} />
                      <span className="text-xs font-medium text-green-700">
                        Skills added to your profile!
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <motion.button
                    onClick={handleAdd}
                    disabled={isSubmitting || done || pendingCount === 0}
                    whileHover={!isSubmitting && !done && pendingCount > 0 ? { scale: 1.01 } : {}}
                    whileTap={!isSubmitting && !done && pendingCount > 0 ? { scale: 0.985 } : {}}
                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200"
                    style={{
                      cursor: isSubmitting || done || pendingCount === 0 ? "default" : "pointer",
                      ...(done ? {
                        background: "#F0FFF4",
                        color: "#16A34A",
                        border: "1px solid #BBF7D0",
                      } : pendingCount === 0 ? {
                        background: "#F1F5F9",
                        color: "#94A3B8",
                        border: "1px solid #E2E8F0",
                      } : {
                        background: "#005DDC",
                        color: "#ffffff",
                        border: "1px solid #005DDC",
                        boxShadow: "0 2px 12px rgba(0,93,220,0.3)",
                      }),
                    }}
                  >
                    {isSubmitting ? (
                      <><Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Adding…</>
                    ) : done ? (
                      <><Check size={14} strokeWidth={2.5} /> Added to your profile</>
                    ) : (
                      <>Add {pendingCount} skill{pendingCount !== 1 ? "s" : ""} to profile</>
                    )}
                  </motion.button>

                  <button
                    onClick={dismiss}
                    className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-gray-400 border border-gray-200 bg-transparent hover:text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all duration-150"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </AnimatePresence>
  );
}
