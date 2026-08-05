"use client";

import React, { useState } from "react";
import { API_HOST } from "@/src/lib/config/api";
import {
  AlertCircle,
  ChevronDown,
  Sparkles,
  Check,
  Plus,
  Loader2,
  RefreshCw,
  Zap,
  FileText,
  TrendingUp,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAddSkill } from "@/src/lib/candidate/profile.mutations";

/* ── Types ── */
type ReasonGroup = {
  type: "skills" | "profile" | "score" | "other";
  items: string[];
};

// ── Clé partagée — doit correspondre exactement à profile.mutations.ts ──
const MY_SKILLS_KEY = ["candidate", "profile", "skills"] as const;

/* ── Fetch candidate's existing skills ── */
function useMySkills() {
  return useQuery({
    queryKey: MY_SKILLS_KEY,
    queryFn: async () => {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
      const BASE_URL = API_HOST;
      const { data } = await axios.get(`${BASE_URL}/api/v1/candidates/profile`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const skills: any[] = data?.profile?.skills ?? data?.skills ?? [];
      return new Set(
        skills.map((s) => (s.skill_name ?? s).toString().toLowerCase().trim())
      );
    },
    // FIX : staleTime 0 → refetch immédiatement après invalidateQueries
    staleTime: 0,
  });
}

/* ── Parse reason codes into groups ── */
function parseReasons(reasons: string[]): ReasonGroup[] {
  const skills: string[] = [];
  const profile: string[] = [];
  const score: string[] = [];
  const other: string[] = [];

  for (const r of reasons) {
    if (r.startsWith("MISSING_SKILL:")) {
      skills.push(r.split(":")[1]);
    } else if (r.startsWith("MISSING_FIELD:")) {
      const field = r.split(":")[1];
      const labels: Record<string, string> = {
        resume_url: "Resume",
        headline: "Professional headline",
        profile_picture_url: "Profile photo",
        about_me: "About me section",
        skills: "Skills list",
        preferred_locations: "Preferred locations",
      };
      profile.push(labels[field] ?? field);
    } else if (r.startsWith("LOW_PROFILE_SCORE:")) {
      const rest = r.replace("LOW_PROFILE_SCORE:", "");
      const min = rest.match(/min=(\d+)/)?.[1];
      const actual = rest.match(/actual=(\d+)/)?.[1];
      score.push(
        actual && min
          ? `Your score is ${actual}% — this role requires ${min}%`
          : "Profile score too low for this role"
      );
    } else if (r === "PROFILE_NOT_READY") {
      profile.push("Your profile isn't complete yet");
    } else if (r === "JOB_NOT_ACTIVE") {
      other.push("This job is no longer active");
    } else if (r === "JOB_NOT_FOUND") {
      other.push("Job not found");
    } else if (r.startsWith("UNKNOWN_REQUIRED_FIELD:")) {
      profile.push(`Missing: ${r.split(":")[1]}`);
    } else {
      other.push(r);
    }
  }

  const groups: ReasonGroup[] = [];
  if (skills.length) groups.push({ type: "skills", items: skills });
  if (profile.length) groups.push({ type: "profile", items: profile });
  if (score.length) groups.push({ type: "score", items: score });
  if (other.length) groups.push({ type: "other", items: other });
  return groups;
}

/* ── Skill tag with add button ── */
function SkillTag({ skill }: { skill: string }) {
  const queryClient = useQueryClient();
  const { mutate, isPending, isSuccess, isError } = useAddSkill();

  function handleAdd() {
    if (isSuccess || isPending) return;
    mutate(skill, {
      onSuccess: () => {
        // FIX : mise à jour optimiste locale du cache mySkills.
        // Le tag disparaît IMMÉDIATEMENT — sans naviguer ni attendre le réseau.
        // profile.mutations.ts invalide ensuite pour sync serveur en arrière-plan.
        queryClient.setQueryData<Set<string>>(MY_SKILLS_KEY, (prev) => {
          const next = new Set(prev ?? []);
          next.add(skill.toLowerCase().trim());
          return next;
        });
      },
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleAdd}
        disabled={isPending || isSuccess}
        title={
          isSuccess
            ? "Added to your profile!"
            : isError
            ? "Failed — try again"
            : `Add "${skill}" to your profile`
        }
        className={`
          group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
          border transition-all duration-200 select-none
          ${
            isSuccess
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default"
              : isError
              ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100 cursor-pointer"
              : isPending
              ? "bg-slate-50 border-slate-200 text-slate-400 cursor-wait"
              : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer active:scale-95 shadow-sm"
          }
        `}
      >
        <span
          className={`flex items-center justify-center w-4 h-4 rounded-full transition-colors
          ${
            isSuccess
              ? "bg-emerald-500 text-white"
              : isError
              ? "bg-red-400 text-white"
              : isPending
              ? "bg-slate-300 text-white"
              : "bg-slate-100 text-slate-400 group-hover:bg-indigo-500 group-hover:text-white"
          }`}
        >
          {isSuccess ? (
            <Check className="w-2.5 h-2.5" />
          ) : isPending ? (
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
          ) : isError ? (
            <RefreshCw className="w-2.5 h-2.5" />
          ) : (
            <Plus className="w-2.5 h-2.5" />
          )}
        </span>
        {skill}
      </button>

      {isSuccess && (
        <span className="text-[10px] text-emerald-600 font-medium px-1 flex items-center gap-1">
          <Check className="w-2.5 h-2.5" />
          Added — badge updates shortly
        </span>
      )}
    </div>
  );
}

/* ── Profile item row ── */
function ProfileItem({ item }: { item: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg bg-white border border-slate-100">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
      <span className="text-xs text-slate-600 font-medium">{item}</span>
    </div>
  );
}

/* ── Group configs ── */
const GROUP_CONFIG = {
  skills: {
    icon: Zap,
    label: "Skills to add",
    accent: "text-amber-600",
    bg: "bg-amber-50/60",
    border: "border-amber-100",
  },
  profile: {
    icon: FileText,
    label: "Complete your profile",
    accent: "text-blue-600",
    bg: "bg-blue-50/60",
    border: "border-blue-100",
  },
  score: {
    icon: TrendingUp,
    label: "Profile score",
    accent: "text-violet-600",
    bg: "bg-violet-50/60",
    border: "border-violet-100",
  },
  other: {
    icon: AlertCircle,
    label: "Other requirements",
    accent: "text-slate-500",
    bg: "bg-slate-50/60",
    border: "border-slate-200",
  },
};

/* ── Main component ── */
export default function EligibilityReasons({
  reasons,
  mode = "blocking",
}: {
  reasons: string[];
  mode?: "blocking" | "suggestions";
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: mySkills } = useMySkills();

  if (!reasons?.length) return null;

  const groups = parseReasons(reasons);

  // FIX 3 : filtrer les skills déjà dans le profil du candidat.
  // Après setQueryData optimiste dans SkillTag.handleAdd, mySkills contient
  // déjà le skill → le tag disparaît immédiatement sans naviguer.
  const filteredGroups = groups
    .map((g) => {
      if (g.type !== "skills" || !mySkills) return g;
      return {
        ...g,
        items: g.items.filter((sk) => !mySkills.has(sk.toLowerCase().trim())),
      };
    })
    .filter((g) => g.items.length > 0);

  if (!filteredGroups.length) return null;

  const isSuggestion = mode === "suggestions";
  const totalItems = filteredGroups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-200
        ${
          isSuggestion
            ? "border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-white"
            : "border-amber-100 bg-gradient-to-br from-amber-50/40 to-white"
        }
      `}
    >
      {/* ── Header ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center justify-center w-7 h-7 rounded-lg
              ${isSuggestion ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"}`}
          >
            {isSuggestion ? (
              <Sparkles className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
          </span>

          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800 leading-tight">
              {isSuggestion ? "Boost your match" : "Profile requirements missing"}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {totalItems} item{totalItems !== 1 ? "s" : ""} to address
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full
              ${
                isSuggestion
                  ? "bg-indigo-100 text-indigo-600"
                  : "bg-amber-100 text-amber-700"
              }`}
          >
            {totalItems}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-3">
          {filteredGroups.map((g) => {
            const cfg = GROUP_CONFIG[g.type];
            const Icon = cfg.icon;

            return (
              <div key={g.type} className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3.5`}>
                <div className={`flex items-center gap-2 mb-3 ${cfg.accent}`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    {isSuggestion && g.type === "skills" ? "Suggested skills" : cfg.label}
                  </span>
                  <span
                    className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/80 border ${cfg.border}`}
                  >
                    {g.items.length}
                  </span>
                </div>

                {g.type === "skills" ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {g.items.map((sk) => (
                        <SkillTag key={sk} skill={sk} />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 pt-1 flex items-center gap-1">
                      <Plus className="w-2.5 h-2.5" />
                      {isSuggestion
                        ? "Click to add a skill to your profile"
                        : "Adding these skills may make you eligible for this job"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {g.items.map((item) => (
                      <ProfileItem key={item} item={item} />
                    ))}
                    {g.type === "profile" && (
                      <p className="text-[10px] text-slate-400 pt-1">
                        A complete profile significantly increases your chances.
                      </p>
                    )}
                    {g.type === "score" && (
                      <p className="text-[10px] text-slate-400 pt-1">
                        Fill in more profile sections to improve your score.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}