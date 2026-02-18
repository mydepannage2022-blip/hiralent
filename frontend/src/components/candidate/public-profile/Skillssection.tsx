// components/candidate/dashboard/profile/skills/SkillRadarSection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SkillCategory } from "@/src/types/profile";
import {
  ShieldCheck,
  Sparkles,
  Code2,
  TrendingUp,
  Award,
  Search,
  Zap,
  Target,
  Layers,
  Brain,
  Star,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";
import { useProfile } from "@/src/context/ProfileContext";

interface ContextSkillData {
  skill_id?: string;
  skill_name: string;
  skill_category: SkillCategory;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  years_experience?: number;
  is_verified?: boolean;
}

const LOGO_BLUE = "#0B5CFF";

// Radar categories with icons and colors
const RADAR_CATEGORIES = [
  {
    key: "frontend" as const,
    label: "Frontend",
    icon: Code2,
    color: "from-sky-400 to-blue-500",
    bgColor: "bg-sky-50",
    textColor: "text-sky-700",
    borderColor: "border-sky-200",
    angle: 0,
  },
  {
    key: "backend" as const,
    label: "Backend",
    icon: Layers,
    color: "from-emerald-400 to-green-500",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
    angle: 60,
  },
  {
    key: "database" as const,
    label: "Database",
    icon: Award,
    color: "from-amber-400 to-orange-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
    angle: 120,
  },
  {
    key: "devops" as const,
    label: "DevOps",
    icon: Zap,
    color: "from-violet-400 to-purple-500",
    bgColor: "bg-violet-50",
    textColor: "text-violet-700",
    borderColor: "border-violet-200",
    angle: 180,
  },
  {
    key: "ai_ml" as const,
    label: "AI & ML",
    icon: Brain,
    color: "from-fuchsia-400 to-pink-500",
    bgColor: "bg-fuchsia-50",
    textColor: "text-fuchsia-700",
    borderColor: "border-fuchsia-200",
    angle: 240,
  },
  {
    key: "tools" as const,
    label: "Tools",
    icon: Target,
    color: "from-slate-400 to-gray-500",
    bgColor: "bg-slate-50",
    textColor: "text-slate-700",
    borderColor: "border-slate-200",
    angle: 300,
  },
] as const;

type RadarCategory = typeof RADAR_CATEGORIES[number]['key'];

const normalize = (s: string) => (s || "").trim().toLowerCase();

// Classify skills into radar categories
function classifySkillToRadar(skillName: string): RadarCategory {
  const n = normalize(skillName);

  // Frontend
  if (
    n.includes("react") ||
    n.includes("next") ||
    n.includes("vue") ||
    n.includes("angular") ||
    n.includes("svelte") ||
    n.includes("tailwind") ||
    n.includes("css") ||
    n.includes("html") ||
    n.includes("frontend")
  ) return "frontend";

  // Backend
  if (
    n.includes("node") ||
    n.includes("express") ||
    n.includes("nestjs") ||
    n.includes("django") ||
    n.includes("flask") ||
    n.includes("spring") ||
    n.includes("laravel") ||
    n.includes("api") ||
    n.includes("graphql")
  ) return "backend";

  // Database
  if (
    n.includes("postgres") ||
    n.includes("mysql") ||
    n.includes("mongodb") ||
    n.includes("redis") ||
    n.includes("sql") ||
    n.includes("database") ||
    n.includes("prisma")
  ) return "database";

  // DevOps
  if (
    n.includes("docker") ||
    n.includes("kubernetes") ||
    n.includes("ci/cd") ||
    n.includes("jenkins") ||
    n.includes("terraform") ||
    n.includes("ansible") ||
    n.includes("nginx")
  ) return "devops";

  // AI & ML
  if (
    n.includes("pytorch") ||
    n.includes("tensorflow") ||
    n.includes("machine learning") ||
    n.includes("deep learning") ||
    n.includes("ai") ||
    n.includes("ml") ||
    n.includes("langchain") ||
    n.includes("embedding")
  ) return "ai_ml";

  // Tools
  return "tools";
}

function getProficiencyLevel(p: ContextSkillData["proficiency"]): number {
  switch (p) {
    case "expert": return 4;
    case "advanced": return 3;
    case "intermediate": return 2;
    case "beginner": return 1;
    default: return 1;
  }
}

function getProficiencyColor(p: ContextSkillData["proficiency"]) {
  switch (p) {
    case "expert": return "bg-emerald-500";
    case "advanced": return "bg-blue-500";
    case "intermediate": return "bg-amber-500";
    default: return "bg-slate-400";
  }
}

export default function SkillRadarSection() {
  const { profileData } = useProfile();
  const [skills, setSkills] = useState<ContextSkillData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<RadarCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCategory, setHoveredCategory] = useState<RadarCategory | null>(null);

  useEffect(() => {
    if (profileData?.skills) {
      const mapped = profileData.skills
        .filter((skill: any) => skill.skill_category === "technical")
        .map((skill: any) => ({
          skill_id: skill.skill_id,
          skill_name: skill.skill_name || "",
          skill_category: "technical" as SkillCategory,
          proficiency: (skill.proficiency || "beginner") as ContextSkillData["proficiency"],
          years_experience: skill.years_experience || 0,
          is_verified: !!skill.is_verified,
        }));
      setSkills(mapped);
    } else {
      setSkills([]);
    }
  }, [profileData]);

  // Calculate radar data
  const radarData = useMemo(() => {
    const data = RADAR_CATEGORIES.map((cat) => {
      const categorySkills = skills.filter(
        (s) => classifySkillToRadar(s.skill_name) === cat.key
      );

      const avgLevel = categorySkills.length > 0
        ? categorySkills.reduce((acc, s) => acc + getProficiencyLevel(s.proficiency), 0) / categorySkills.length
        : 0;

      const verifiedCount = categorySkills.filter((s) => s.is_verified).length;

      return {
        ...cat,
        count: categorySkills.length,
        avgLevel,
        percentage: (avgLevel / 4) * 100,
        verifiedCount,
        skills: categorySkills,
      };
    });

    return data;
  }, [skills]);

  // Filtered skills for selected category
  const displaySkills = useMemo(() => {
    let filtered = selectedCategory
      ? skills.filter((s) => classifySkillToRadar(s.skill_name) === selectedCategory)
      : skills;

    if (searchQuery.trim()) {
      const q = normalize(searchQuery);
      filtered = filtered.filter((s) => normalize(s.skill_name).includes(q));
    }

    return filtered.sort((a, b) => getProficiencyLevel(b.proficiency) - getProficiencyLevel(a.proficiency));
  }, [skills, selectedCategory, searchQuery]);

  const stats = useMemo(() => {
    const total = skills.length;
    const verified = skills.filter((s) => s.is_verified).length;
    const avgLevel = total > 0
      ? skills.reduce((acc, s) => acc + getProficiencyLevel(s.proficiency), 0) / total
      : 0;

    return { total, verified, avgLevel };
  }, [skills]);

  if (!profileData) {
    return (
      <section className="w-full">
        <div className="rounded-2xl border bg-white shadow-sm p-6 animate-pulse">
          <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
          <div className="h-96 w-full bg-slate-100 rounded" />
        </div>
      </section>
    );
  }

  if (skills.length === 0) {
    return (
      <section className="w-full">
        <div className="rounded-2xl border bg-white shadow-sm p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
            <Code2 className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Technical Skills Radar</h3>
          <p className="mt-1 text-sm text-slate-500">No technical skills found yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-b from-slate-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Technical Skills Radar</h2>
                <p className="text-sm text-slate-500">Interactive visualization of your expertise</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                <div className="text-xs text-slate-500">Total Skills</div>
              </div>
              <div className="h-12 w-px bg-slate-200" />
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-600">{stats.verified}</div>
                <div className="text-xs text-slate-500">Verified</div>
              </div>
              <div className="h-12 w-px bg-slate-200" />
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{Math.round((stats.avgLevel / 4) * 100)}%</div>
                <div className="text-xs text-slate-500">Avg Level</div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Radar Chart */}
            <div className="lg:col-span-5">
              <div className="relative aspect-square max-w-md mx-auto">
                <svg viewBox="0 0 400 400" className="w-full h-full">
                  {/* Background circles */}
                  {[1, 2, 3, 4].map((level) => (
                    <circle
                      key={level}
                      cx="200"
                      cy="200"
                      r={level * 40}
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                  ))}

                  {/* Grid lines */}
                  {RADAR_CATEGORIES.map((cat) => {
                    const angle = (cat.angle * Math.PI) / 180;
                    const x = 200 + Math.cos(angle) * 160;
                    const y = 200 + Math.sin(angle) * 160;

                    return (
                      <line
                        key={cat.key}
                        x1="200"
                        y1="200"
                        x2={x}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        opacity="0.5"
                      />
                    );
                  })}

                  {/* Data polygon */}
                  <motion.polygon
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.3 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    points={radarData
                      .map((cat) => {
                        const angle = (cat.angle * Math.PI) / 180;
                        const r = (cat.avgLevel / 4) * 160;
                        const x = 200 + Math.cos(angle) * r;
                        const y = 200 + Math.sin(angle) * r;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                    fill="url(#radarGradient)"
                    stroke={LOGO_BLUE}
                    strokeWidth="2"
                  />

                  {/* Data points */}
                  {radarData.map((cat, idx) => {
                    const angle = (cat.angle * Math.PI) / 180;
                    const r = (cat.avgLevel / 4) * 160;
                    const x = 200 + Math.cos(angle) * r;
                    const y = 200 + Math.sin(angle) * r;

                    return (
                      <motion.g
                        key={cat.key}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.1, duration: 0.5 }}
                      >
                        <circle
                          cx={x}
                          cy={y}
                          r="8"
                          fill="white"
                          stroke={LOGO_BLUE}
                          strokeWidth="3"
                          className="cursor-pointer transition-all hover:r-10"
                          onMouseEnter={() => setHoveredCategory(cat.key)}
                          onMouseLeave={() => setHoveredCategory(null)}
                          onClick={() => setSelectedCategory(cat.key === selectedCategory ? null : cat.key)}
                        />
                        {hoveredCategory === cat.key && (
                          <text
                            x={x}
                            y={y - 15}
                            textAnchor="middle"
                            className="text-xs font-semibold fill-slate-900"
                          >
                            {Math.round(cat.percentage)}%
                          </text>
                        )}
                      </motion.g>
                    );
                  })}

                  {/* Gradient definition */}
                  <defs>
                    <radialGradient id="radarGradient">
                      <stop offset="0%" stopColor={LOGO_BLUE} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={LOGO_BLUE} stopOpacity="0.1" />
                    </radialGradient>
                  </defs>
                </svg>

                {/* Category labels around the radar */}
                {radarData.map((cat) => {
                  const angle = (cat.angle * Math.PI) / 180;
                  const labelDistance = 220;
                  const x = 200 + Math.cos(angle) * labelDistance;
                  const y = 200 + Math.sin(angle) * labelDistance;

                  const Icon = cat.icon;

                  return (
                    <motion.button
                      key={cat.key}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      onClick={() => setSelectedCategory(cat.key === selectedCategory ? null : cat.key)}
                      className={`absolute flex flex-col items-center gap-1 transition-all ${
                        selectedCategory === cat.key ? 'scale-110' : 'hover:scale-105'
                      }`}
                      style={{
                        left: `${(x / 400) * 100}%`,
                        top: `${(y / 400) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-xl shadow-lg transition-all ${
                          selectedCategory === cat.key
                            ? `bg-gradient-to-br ${cat.color} scale-110`
                            : cat.bgColor
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 ${
                            selectedCategory === cat.key ? 'text-white' : cat.textColor
                          }`}
                        />
                      </div>
                      <div className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {cat.label}
                      </div>
                      <div className="text-xs text-slate-500">{cat.count} skills</div>
                    </motion.button>
                  );
                })}

                {/* Center stat */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <div className="text-3xl font-bold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {stats.total}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Skills</div>
                </div>
              </div>
            </div>

            {/* Skills List */}
            <div className="lg:col-span-7">
              <div className="h-full flex flex-col">
                {/* Category indicator */}
                {selectedCategory && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 flex items-center justify-between p-3 rounded-xl border bg-gradient-to-r from-slate-50 to-white"
                  >
                    <div className="flex items-center gap-2">
                      {(() => {
                        const cat = radarData.find((c) => c.key === selectedCategory);
                        const Icon = cat?.icon;
                        return (
                          <>
                            {Icon && (
                              <div className={`p-2 rounded-lg ${cat?.bgColor}`}>
                                <Icon className={`w-4 h-4 ${cat?.textColor}`} />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {cat?.label} Skills
                              </div>
                              <div className="text-xs text-slate-500">
                                {cat?.count} skills • {Math.round(cat?.percentage || 0)}% avg proficiency
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      View all →
                    </button>
                  </motion.div>
                )}

                {/* Skills grid */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 skill-scrollbar max-h-[500px]">
                  <AnimatePresence mode="popLayout">
                    {displaySkills.map((skill, index) => {
                      const cat = radarData.find(
                        (c) => c.key === classifySkillToRadar(skill.skill_name)
                      );
                      const level = getProficiencyLevel(skill.proficiency);

                      return (
                        <motion.div
                          key={skill.skill_id || index}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="group relative p-4 rounded-xl border bg-white hover:shadow-md transition-all hover:border-blue-200"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-sm font-semibold text-slate-900 truncate">
                                  {skill.skill_name}
                                </h4>
                                {skill.is_verified && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                                    <BadgeCheck className="w-3 h-3" />
                                    Verified
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mb-3">
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${cat?.bgColor} ${cat?.textColor} ${cat?.borderColor} border`}
                                >
                                  {cat?.label}
                                </span>
                                <span className="text-xs text-slate-500 capitalize">
                                  {skill.proficiency}
                                </span>
                                {typeof skill.years_experience === "number" && skill.years_experience > 0 && (
                                  <span className="text-xs text-slate-500">
                                    • {skill.years_experience}y exp
                                  </span>
                                )}
                              </div>

                              {/* Proficiency bar */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span>Proficiency</span>
                                  <span className="font-semibold text-slate-700">
                                    {Math.round((level / 4) * 100)}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(level / 4) * 100}%` }}
                                    transition={{ delay: index * 0.05, duration: 0.5 }}
                                    className={`h-full ${getProficiencyColor(skill.proficiency)}`}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Star rating */}
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4].map((i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i <= level
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'fill-slate-200 text-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {displaySkills.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Search className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-sm font-medium text-slate-700">No skills found</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Try adjusting your search or category filter
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollbar styles */}
      <style jsx global>{`
        .skill-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .skill-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 999px;
        }
        .skill-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }
        .skill-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </section>
  );
}