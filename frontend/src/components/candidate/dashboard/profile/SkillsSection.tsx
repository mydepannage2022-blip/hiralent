"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Edit2,
  X,
  Check,
  Plus,
  Trash2,
  Search,
  Code2,
  BarChart3,
} from "lucide-react";

import {
  useUpdateSkills,
  useAddSkill,
  useDeleteSkill,
} from "@/src/lib/profile/profile.queries";
import { SkillData } from "@/src/lib/profile/profile.api";
import { useProfile } from "@/src/context/ProfileContext";

/**
 * ✅ Technical sub-categories (UI only)
 * We infer these from skill_name.
 */
type TechGroupKey =
  | "Overview"
  | "Frontend"
  | "Backend"
  | "Databases"
  | "DevOps"
  | "Cloud"
  | "Data & Analytics"
  | "AI & ML"
  | "Testing"
  | "Tools"
  | "Other";

const TECH_GROUP_ORDER: TechGroupKey[] = [
  "Overview",
  "Frontend",
  "Backend",
  "Databases",
  "DevOps",
  "Cloud",
  "Data & Analytics",
  "AI & ML",
  "Testing",
  "Tools",
  "Other",
];

const TECH_GROUP_DESC: Record<TechGroupKey, string> = {
  Overview: "Quick statistics + summary",
  Frontend: "UI frameworks, styling, client-side",
  Backend: "APIs, server frameworks, architecture",
  Databases: "SQL/NoSQL engines, warehouses",
  DevOps: "CI/CD, monitoring, containers",
  Cloud: "Cloud providers & managed services",
  "Data & Analytics": "BI, ETL, analytics stacks",
  "AI & ML": "ML, embeddings, MLOps",
  Testing: "QA automation & test frameworks",
  Tools: "Dev tools, docs, misc",
  Other: "Unclassified technical skills",
};

/**
 * 🎨 Professional palette (soft, not bland, not neon)
 */
const TECH_GROUP_STYLE: Record<
  TechGroupKey,
  {
    chipBg: string;
    chipBorder: string;
    chipText: string;
    iconBg: string;
    iconText: string;
    headerBg: string;
    dotBg: string;
    dotBorder: string;
  }
> = {
  Overview: {
    chipBg: "bg-gradient-to-r from-indigo-50 to-slate-50",
    chipBorder: "border-indigo-100",
    chipText: "text-indigo-800",
    iconBg: "bg-indigo-50",
    iconText: "text-indigo-700",
    headerBg: "bg-gradient-to-r from-indigo-50 to-white",
    dotBg: "bg-indigo-100",
    dotBorder: "border-indigo-200",
  },
  Frontend: {
    chipBg: "bg-gradient-to-r from-sky-50 to-slate-50",
    chipBorder: "border-sky-100",
    chipText: "text-sky-800",
    iconBg: "bg-sky-50",
    iconText: "text-sky-700",
    headerBg: "bg-gradient-to-r from-sky-50 to-white",
    dotBg: "bg-sky-100",
    dotBorder: "border-sky-200",
  },
  Backend: {
    chipBg: "bg-gradient-to-r from-emerald-50 to-slate-50",
    chipBorder: "border-emerald-100",
    chipText: "text-emerald-800",
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-700",
    headerBg: "bg-gradient-to-r from-emerald-50 to-white",
    dotBg: "bg-emerald-100",
    dotBorder: "border-emerald-200",
  },
  Databases: {
    chipBg: "bg-gradient-to-r from-amber-50 to-slate-50",
    chipBorder: "border-amber-100",
    chipText: "text-amber-900",
    iconBg: "bg-amber-50",
    iconText: "text-amber-700",
    headerBg: "bg-gradient-to-r from-amber-50 to-white",
    dotBg: "bg-amber-100",
    dotBorder: "border-amber-200",
  },
  DevOps: {
    chipBg: "bg-gradient-to-r from-orange-50 to-slate-50",
    chipBorder: "border-orange-100",
    chipText: "text-orange-900",
    iconBg: "bg-orange-50",
    iconText: "text-orange-700",
    headerBg: "bg-gradient-to-r from-orange-50 to-white",
    dotBg: "bg-orange-100",
    dotBorder: "border-orange-200",
  },
  Cloud: {
    chipBg: "bg-gradient-to-r from-blue-50 to-slate-50",
    chipBorder: "border-blue-100",
    chipText: "text-blue-900",
    iconBg: "bg-blue-50",
    iconText: "text-blue-700",
    headerBg: "bg-gradient-to-r from-blue-50 to-white",
    dotBg: "bg-blue-100",
    dotBorder: "border-blue-200",
  },
  "Data & Analytics": {
    chipBg: "bg-gradient-to-r from-violet-50 to-slate-50",
    chipBorder: "border-violet-100",
    chipText: "text-violet-900",
    iconBg: "bg-violet-50",
    iconText: "text-violet-700",
    headerBg: "bg-gradient-to-r from-violet-50 to-white",
    dotBg: "bg-violet-100",
    dotBorder: "border-violet-200",
  },
  "AI & ML": {
    chipBg: "bg-gradient-to-r from-fuchsia-50 to-slate-50",
    chipBorder: "border-fuchsia-100",
    chipText: "text-fuchsia-900",
    iconBg: "bg-fuchsia-50",
    iconText: "text-fuchsia-700",
    headerBg: "bg-gradient-to-r from-fuchsia-50 to-white",
    dotBg: "bg-fuchsia-100",
    dotBorder: "border-fuchsia-200",
  },
  Testing: {
    chipBg: "bg-gradient-to-r from-rose-50 to-slate-50",
    chipBorder: "border-rose-100",
    chipText: "text-rose-900",
    iconBg: "bg-rose-50",
    iconText: "text-rose-700",
    headerBg: "bg-gradient-to-r from-rose-50 to-white",
    dotBg: "bg-rose-100",
    dotBorder: "border-rose-200",
  },
  Tools: {
    chipBg: "bg-gradient-to-r from-slate-50 to-white",
    chipBorder: "border-slate-200",
    chipText: "text-slate-800",
    iconBg: "bg-slate-50",
    iconText: "text-slate-700",
    headerBg: "bg-gradient-to-r from-slate-50 to-white",
    dotBg: "bg-slate-100",
    dotBorder: "border-slate-200",
  },
  Other: {
    chipBg: "bg-gradient-to-r from-gray-50 to-white",
    chipBorder: "border-gray-200",
    chipText: "text-gray-800",
    iconBg: "bg-gray-50",
    iconText: "text-gray-700",
    headerBg: "bg-gradient-to-r from-gray-50 to-white",
    dotBg: "bg-gray-100",
    dotBorder: "border-gray-200",
  },
};

function normalize(s: string) {
  return (s || "").trim().toLowerCase();
}

function classifyTechnical(skillName: string): TechGroupKey {
  const n = normalize(skillName);

  if (
    n.includes("react") ||
    n.includes("next") ||
    n.includes("vue") ||
    n.includes("angular") ||
    n.includes("svelte") ||
    n.includes("tailwind") ||
    n.includes("css") ||
    n.includes("html") ||
    n.includes("frontend") ||
    n.includes("ui") ||
    n.includes("ux") ||
    n.includes("bootstrap") ||
    n.includes("sass") ||
    n.includes("storybook")
  )
    return "Frontend";

  if (
    n.includes("node") ||
    n.includes("express") ||
    n.includes("nestjs") ||
    n.includes("spring") ||
    n.includes("django") ||
    n.includes("fastapi") ||
    n.includes("flask") ||
    n.includes("laravel") ||
    n.includes("rails") ||
    n.includes("api") ||
    n.includes("grpc") ||
    n.includes("microservice") ||
    n.includes("server") ||
    n.includes("auth") ||
    n.includes("graphql")
  )
    return "Backend";

  if (
    n.includes("postgres") ||
    n.includes("mysql") ||
    n.includes("mongodb") ||
    n.includes("redis") ||
    n.includes("sqlite") ||
    n.includes("oracle") ||
    n === "sql" ||
    n.includes("elasticsearch") ||
    n.includes("opensearch") ||
    n.includes("snowflake") ||
    n.includes("redshift") ||
    n.includes("bigquery") ||
    n.includes("dynamodb") ||
    n.includes("cassandra")
  )
    return "Databases";

  if (
    n.includes("docker") ||
    n.includes("kubernetes") ||
    n.includes("k8s") ||
    n.includes("ci/cd") ||
    n.includes("cicd") ||
    n.includes("github actions") ||
    n.includes("gitlab") ||
    n.includes("jenkins") ||
    n.includes("terraform") ||
    n.includes("ansible") ||
    n.includes("prometheus") ||
    n.includes("grafana") ||
    n.includes("monitor") ||
    n.includes("observability") ||
    n.includes("nginx")
  )
    return "DevOps";

  if (
    n.includes("aws") ||
    n.includes("azure") ||
    n.includes("gcp") ||
    n.includes("google cloud") ||
    n.includes("lambda") ||
    n.includes("cloud") ||
    n.includes("s3") ||
    n.includes("ec2") ||
    n.includes("eks") ||
    n.includes("aks") ||
    n.includes("firebase") ||
    n.includes("vercel") ||
    n.includes("netlify")
  )
    return "Cloud";

  if (
    n.includes("power bi") ||
    n.includes("tableau") ||
    n.includes("looker") ||
    n.includes("etl") ||
    n.includes("glue") ||
    n.includes("airflow") ||
    n.includes("dbt") ||
    n.includes("spark") ||
    n.includes("hadoop") ||
    n.includes("analytics") ||
    n.includes("data")
  )
    return "Data & Analytics";

  if (
    n.includes("mlflow") ||
    n.includes("weights & biases") ||
    n.includes("wandb") ||
    n.includes("pytorch") ||
    n.includes("tensorflow") ||
    n.includes("keras") ||
    n.includes("scikit") ||
    n.includes("sklearn") ||
    n.includes("embedding") ||
    n.includes("minilm") ||
    n.includes("llm") ||
    n.includes("rag") ||
    n.includes("langchain") ||
    n.includes("qdrant") ||
    n.includes("vector") ||
    n.includes("huggingface") ||
    n.includes("machine learning") ||
    n.includes("deep learning")
  )
    return "AI & ML";

  if (
    n.includes("selenium") ||
    n.includes("cypress") ||
    n.includes("playwright") ||
    n.includes("jest") ||
    n.includes("vitest") ||
    n.includes("mocha") ||
    n.includes("junit") ||
    n.includes("pytest") ||
    n.includes("testing") ||
    n.includes("qa")
  )
    return "Testing";

  if (
    n.includes("git") ||
    n.includes("github") ||
    n.includes("postman") ||
    n.includes("swagger") ||
    n.includes("openapi") ||
    n.includes("vscode") ||
    n.includes("jira") ||
    n.includes("uml") ||
    n.includes("figma") ||
    n.includes("tinymce") ||
    n.includes("beautifulsoup") ||
    n.includes("streamlit")
  )
    return "Tools";

  return "Other";
}

/**
 * ✅ Professional proficiency pill styles
 */
function getProficiencyPill(p: string) {
  const n = normalize(p);
  switch (n) {
    case "expert":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "advanced":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "intermediate":
      return "bg-amber-50 text-amber-900 border-amber-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function clamp01(v: number) {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function format1(v: number) {
  return Math.round(v * 10) / 10;
}

const SkillsSection: React.FC = () => {
  const { profileData, setProfileData } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<TechGroupKey>("Overview");

  const [newSkill, setNewSkill] = useState<SkillData>({
    skill_name: "",
    skill_category: "technical",
    proficiency: "beginner",
    years_experience: 1,
  });

  const { mutate: updateSkills, isPending: isUpdating } = useUpdateSkills();
  const { mutate: addSkill, isPending: isAdding } = useAddSkill();
  const { mutate: deleteSkill, isPending: isDeleting } = useDeleteSkill();

  useEffect(() => {
    if (profileData?.skills) setSkills(profileData.skills);
  }, [profileData]);

  const handleEdit = () => {
    setIsEditing(true);
    setSkills([...(profileData?.skills || [])]);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSkills([...(profileData?.skills || [])]);
    setSearchQuery("");
    setActiveGroup("Overview");
    setNewSkill({
      skill_name: "",
      skill_category: "technical",
      proficiency: "beginner",
      years_experience: 1,
    });
  };

  const handleSave = () => {
    updateSkills(skills, {
      onSuccess: () => {
        setIsEditing(false);
        setProfileData({ ...profileData, skills: [...skills] });
      },
      onError: (error) => console.error("❌ API Error:", error),
    });
  };

  const handleAddSkill = () => {
    if (!newSkill.skill_name.trim()) return;

    // Optional: persist per add if you want:
    // addSkill(newSkill, { onSuccess: ... });

    setSkills((prev) => [...prev, { ...newSkill }]);
    setNewSkill({
      skill_name: "",
      skill_category: "technical",
      proficiency: "beginner",
      years_experience: 1,
    });
  };

  const handleRemoveSkill = (index: number) => {
    const skillToDelete = skills[index];
    if (skillToDelete.skill_id) {
      deleteSkill(skillToDelete.skill_id, {
        onSuccess: () => setSkills((prev) => prev.filter((_, i) => i !== index)),
      });
    } else {
      setSkills((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSkillChange = (
    index: number,
    field: keyof SkillData,
    value: string | number
  ) => {
    setSkills((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const baseViewSkills = profileData?.skills || [];
  const totalTechnicalCount = useMemo(
    () => (baseViewSkills as any[]).filter((s) => s.skill_category === "technical").length,
    [baseViewSkills]
  );

  // ✅ Only technical skills in view
  const technicalSkills = useMemo(() => {
    return (baseViewSkills as any[]).filter((s) => s.skill_category === "technical");
  }, [baseViewSkills]);

  // Search matches (name, proficiency, group)
  const filteredTechnical = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return technicalSkills;

    return (technicalSkills as any[]).filter((s) => {
      const name = normalize(s.skill_name);
      const prof = normalize(s.proficiency);
      const group = normalize(classifyTechnical(s.skill_name));
      return name.includes(q) || prof.includes(q) || group.includes(q);
    });
  }, [technicalSkills, searchQuery]);

  // Group into sub-categories
  const groupedTechnical = useMemo(() => {
    const groups: Record<TechGroupKey, SkillData[]> = {
      Overview: [],
      Frontend: [],
      Backend: [],
      Databases: [],
      DevOps: [],
      Cloud: [],
      "Data & Analytics": [],
      "AI & ML": [],
      Testing: [],
      Tools: [],
      Other: [],
    };

    for (const s of filteredTechnical as any[]) {
      const g = classifyTechnical(s.skill_name);
      groups[g].push(s);
    }

    // sort inside each group
    (TECH_GROUP_ORDER.filter((k) => k !== "Overview") as TechGroupKey[]).forEach((k) => {
      groups[k].sort((a: any, b: any) =>
        String(a.skill_name).localeCompare(String(b.skill_name))
      );
    });

    return groups;
  }, [filteredTechnical]);

  // Counts per group (for navigation)
  const groupCounts = useMemo(() => {
    const counts: Record<TechGroupKey, number> = {
      Overview: technicalSkills.length,
      Frontend: 0,
      Backend: 0,
      Databases: 0,
      DevOps: 0,
      Cloud: 0,
      "Data & Analytics": 0,
      "AI & ML": 0,
      Testing: 0,
      Tools: 0,
      Other: 0,
    };

    for (const s of technicalSkills as any[]) {
      const g = classifyTechnical(s.skill_name);
      counts[g] += 1;
    }

    return counts;
  }, [technicalSkills]);

  // Stats for Overview
  const stats = useMemo(() => {
    const list = technicalSkills as any[];
    const total = list.length;

    const yearsAvg =
      total === 0
        ? 0
        : list.reduce((acc, s) => acc + Number(s.years_experience ?? 0), 0) / total;

    const profCounts = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
      expert: 0,
      other: 0,
    };

    for (const s of list) {
      const p = normalize(s.proficiency);
      if (p === "beginner") profCounts.beginner += 1;
      else if (p === "intermediate") profCounts.intermediate += 1;
      else if (p === "advanced") profCounts.advanced += 1;
      else if (p === "expert") profCounts.expert += 1;
      else profCounts.other += 1;
    }

    const topProf =
      Object.entries(profCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "beginner";

    const topGroup =
      (Object.entries(groupCounts) as any[])
        .filter(([k]: any) => k !== "Overview")
        .sort((a: any, b: any) => b[1] - a[1])[0]?.[0] ?? "Other";

    const profBars = {
      beginner: total ? profCounts.beginner / total : 0,
      intermediate: total ? profCounts.intermediate / total : 0,
      advanced: total ? profCounts.advanced / total : 0,
      expert: total ? profCounts.expert / total : 0,
      other: total ? profCounts.other / total : 0,
    };

    return { total, yearsAvg, topProf, topGroup, profCounts, profBars };
  }, [technicalSkills, groupCounts]);

  // Content for selected group
  const activeItems = useMemo(() => {
    if (activeGroup === "Overview") return [];
    return groupedTechnical[activeGroup] || [];
  }, [activeGroup, groupedTechnical]);

  const renderSkillGrid = (items: any[]) => {
    if (!items.length) {
      return (
        <div className="text-center py-10 text-gray-500 text-sm">
          No skills in this category.
        </div>
      );
    }

    const style = TECH_GROUP_STYLE[activeGroup];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[430px] overflow-y-auto pr-2 category-scrollbar">
        {items.map((skill: any, index: number) => (
          <motion.div
            key={`${skill.skill_id ?? skill.skill_name}-${index}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-sm transition-all hover:border-blue-200"
          >
            {/* ✅ FIX: Pill moved BELOW the name so it never blocks it */}
            <div className="mb-2">
              <h5
                className="font-semibold text-gray-900 text-sm leading-snug"
                title={skill.skill_name}
              >
                <span className="line-clamp-2 break-words">
                  {skill.skill_name}
                </span>
              </h5>

              <div className="mt-2">
                <span
                  className={[
                    "inline-flex items-center",
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                    "uppercase tracking-wide",
                    "max-w-full",
                    getProficiencyPill(skill.proficiency),
                  ].join(" ")}
                  title={skill.proficiency}
                >
                  {String(skill.proficiency)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="inline-flex items-center gap-2">
                <span
                  className={[
                    "w-2.5 h-2.5 rounded-full border",
                    style.dotBg,
                    style.dotBorder,
                  ].join(" ")}
                />
                Technical
              </span>
              <span className="font-medium text-gray-700 tabular-nums">
                {skill.years_experience}{" "}
                {Number(skill.years_experience) === 1 ? "year" : "years"}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm lg:text-lg font-semibold text-gray-900">
            Professional Skills
            {totalTechnicalCount > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-500">
                (Technical: {totalTechnicalCount})
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Dashboard-style view: stats + navigation by technical categories.
          </p>
        </div>

        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        ) : (
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isUpdating ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* VIEW MODE */}
      {!isEditing ? (
        <>
          {totalTechnicalCount > 0 ? (
            <>
              {/* Search */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search (name, proficiency, or category)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* NAV */}
                <div className="lg:col-span-4">
                  <div className="border border-gray-200 rounded-xl overflow-hidden h-fit lg:sticky lg:top-4 bg-white">
                    <div className="px-4 py-3 border-b bg-gradient-to-r from-indigo-50 to-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-700" />
                      <p className="text-sm font-semibold text-gray-900">
                        Categories
                      </p>
                    </div>

                    <div className="p-2 max-h-[520px] overflow-y-auto nav-scrollbar">
                      {TECH_GROUP_ORDER.map((g) => {
                        const count =
                          g === "Overview"
                            ? filteredTechnical.length
                            : groupedTechnical[g]?.length ?? 0;

                        if (searchQuery.trim() && g !== "Overview" && count === 0)
                          return null;

                        const isActive = activeGroup === g;
                        const s = TECH_GROUP_STYLE[g];

                        return (
                          <button
                            key={g}
                            onClick={() => setActiveGroup(g)}
                            className={[
                              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors mb-1 last:mb-0 border border-transparent",
                              isActive
                                ? `${s.chipBg} ${s.chipText} ${s.chipBorder} border`
                                : "hover:bg-gray-50 text-gray-700",
                            ].join(" ")}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={[
                                  "w-9 h-9 rounded-xl border flex items-center justify-center",
                                  isActive ? s.chipBorder : "border-gray-200",
                                  s.iconBg,
                                ].join(" ")}
                              >
                                <Code2
                                  className={[
                                    "w-4 h-4",
                                    isActive ? s.iconText : "text-gray-500",
                                  ].join(" ")}
                                />
                              </div>

                              <div className="min-w-0 text-left">
                                <div className="font-semibold truncate">{g}</div>
                                <div className="text-[11px] text-gray-500 truncate">
                                  {TECH_GROUP_DESC[g]}
                                </div>
                              </div>
                            </div>

                            <span
                              className={[
                                "ml-3 text-xs px-2 py-0.5 rounded-full border tabular-nums",
                                isActive
                                  ? `${s.chipBorder} ${s.chipBg} ${s.chipText}`
                                  : "border-gray-200 bg-gray-50 text-gray-600",
                              ].join(" ")}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* CONTENT */}
                <div className="lg:col-span-8">
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <div
                      className={[
                        "px-4 py-3 border-b",
                        TECH_GROUP_STYLE[activeGroup].headerBg,
                      ].join(" ")}
                    >
                      {activeGroup === "Overview" ? (
                        <>
                          <h4 className="text-sm font-semibold text-gray-900">
                            Technical Overview
                          </h4>
                          <p className="text-xs text-gray-500">
                            Quick stats based on your technical skills.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <div
                              className={[
                                "w-3 h-3 rounded-full border",
                                TECH_GROUP_STYLE[activeGroup].dotBg,
                                TECH_GROUP_STYLE[activeGroup].dotBorder,
                              ].join(" ")}
                            />
                            <h4 className="text-sm font-semibold text-gray-900">
                              {activeGroup}{" "}
                              <span className="ml-1 text-xs font-normal text-gray-500">
                                ({activeItems.length})
                              </span>
                            </h4>
                          </div>
                          <p className="text-xs text-gray-500">
                            {TECH_GROUP_DESC[activeGroup]}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Scrollable content */}
                    <div className="p-4 max-h-[520px] overflow-y-auto pr-2 skill-scrollbar">
                      {activeGroup === "Overview" ? (
                        <div className="space-y-4">
                          {/* Stat cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="p-4 rounded-xl border bg-gradient-to-br from-indigo-50 to-white">
                              <p className="text-xs text-gray-600">
                                Total technical
                              </p>
                              <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">
                                {stats.total}
                              </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-gradient-to-br from-emerald-50 to-white">
                              <p className="text-xs text-gray-600">Avg years</p>
                              <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">
                                {format1(stats.yearsAvg)}
                              </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-gradient-to-br from-amber-50 to-white">
                              <p className="text-xs text-gray-600">
                                Top proficiency
                              </p>
                              <p className="mt-1 text-xl lg:text-2xl font-semibold text-gray-900 leading-tight break-words capitalize">
                                <span className="inline-block max-w-full truncate align-bottom">
                                  {String(stats.topProf)}
                                </span>
                              </p>
                            </div>

                            <div className="p-4 rounded-xl border bg-gradient-to-br from-slate-50 to-white">
                              <p className="text-xs text-gray-600">Most common</p>
                              <p className="mt-1 text-xl lg:text-2xl font-semibold text-gray-900 leading-tight break-words">
                                <span className="inline-block max-w-full truncate align-bottom">
                                  {String(stats.topGroup)}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Proficiency distribution */}
                          <div className="p-4 rounded-xl border bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-semibold text-gray-900">
                                Proficiency distribution
                              </p>
                              <p className="text-xs text-gray-500">
                                based on your technical skills
                              </p>
                            </div>

                            <div className="space-y-3">
                              {([
                                ["Beginner", "beginner"],
                                ["Intermediate", "intermediate"],
                                ["Advanced", "advanced"],
                                ["Expert", "expert"],
                              ] as const).map(([label, key]) => {
                                const pct = clamp01(stats.profBars[key]) * 100;
                                const count = (stats.profCounts as any)[key] ?? 0;

                                const barClass =
                                  key === "expert"
                                    ? "bg-emerald-500/70"
                                    : key === "advanced"
                                    ? "bg-blue-500/70"
                                    : key === "intermediate"
                                    ? "bg-amber-500/70"
                                    : "bg-slate-500/60";

                                return (
                                  <div key={key}>
                                    <div className="flex items-center justify-between text-[11px] sm:text-xs text-gray-600 mb-1">
                                      <span className="font-medium text-gray-700">
                                        {label}
                                      </span>
                                      <span className="tabular-nums">
                                        {count} • {Math.round(pct)}%
                                      </span>
                                    </div>
                                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                      <div
                                        className={`h-full ${barClass} transition-all duration-300`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Category distribution */}
                          <div className="p-4 rounded-xl border bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-semibold text-gray-900">
                                Category distribution
                              </p>
                              <p className="text-xs text-gray-500">
                                click a category on the left to open it
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-2 category-scrollbar">
                              {TECH_GROUP_ORDER.filter((k) => k !== "Overview").map(
                                (k) => {
                                  const count = groupCounts[k] || 0;
                                  const pct = stats.total ? (count / stats.total) * 100 : 0;
                                  const s = TECH_GROUP_STYLE[k];

                                  return (
                                    <div
                                      key={k}
                                      className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div
                                          className={[
                                            "w-3 h-3 rounded-full border",
                                            s.dotBg,
                                            s.dotBorder,
                                          ].join(" ")}
                                        />
                                        <span className="text-gray-700 truncate">{k}</span>
                                      </div>
                                      <span className="text-gray-500 tabular-nums">
                                        {count} • {Math.round(pct)}%
                                      </span>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        renderSkillGrid(activeItems as any[])
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-50 to-slate-50 rounded-full flex items-center justify-center mb-3 border border-indigo-100">
                <Plus className="w-6 h-6 text-indigo-500" />
              </div>
              <p className="text-gray-600 text-sm mb-2">No technical skills yet.</p>
              <button
                onClick={handleEdit}
                className="text-blue-700 text-sm font-medium hover:text-blue-800"
              >
                Add Technical Skills
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* EDIT MODE */}
          {skills.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-600">
              <span className="px-2 py-1 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200">
                Total: <strong className="text-gray-900">{skills.length}</strong>
              </span>
              <span className="px-2 py-1 rounded-full border bg-sky-50 text-sky-700 border-sky-200">
                Technical:{" "}
                <strong className="text-gray-900">
                  {skills.filter((s) => s.skill_category === "technical").length}
                </strong>
              </span>
              <span className="px-2 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                Soft Skills:{" "}
                <strong className="text-gray-900">
                  {skills.filter((s) => s.skill_category === "soft").length}
                </strong>
              </span>
            </div>
          )}

          <div className="max-h-[560px] overflow-y-auto pr-2 skill-scrollbar space-y-4">
            {skills.map((skill, index) => (
              <div
                key={skill.skill_id ?? `${skill.skill_name}-${index}`}
                className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-blue-200 transition-colors"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Skill Name
                  </label>
                  <input
                    type="text"
                    value={skill.skill_name}
                    onChange={(e) =>
                      handleSkillChange(index, "skill_name", e.target.value)
                    }
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., React.js"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={skill.skill_category}
                    onChange={(e) =>
                      handleSkillChange(index, "skill_category", e.target.value)
                    }
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="technical">Technical</option>
                    <option value="soft">Soft Skill</option>
                    <option value="language">Language</option>
                    <option value="certification">Certification</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Proficiency
                  </label>
                  <select
                    value={skill.proficiency}
                    onChange={(e) =>
                      handleSkillChange(index, "proficiency", e.target.value)
                    }
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Years
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={skill.years_experience ?? 0}
                    onChange={(e) =>
                      handleSkillChange(
                        index,
                        "years_experience",
                        parseInt(e.target.value || "0")
                      )
                    }
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => handleRemoveSkill(index)}
                    className="w-full px-2 py-1.5 text-red-700 hover:bg-red-50 rounded-lg text-sm flex items-center justify-center gap-1 border border-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {/* Add New Skill */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 border border-dashed border-indigo-200 bg-gradient-to-r from-indigo-50 to-white rounded-xl">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Skill Name
                </label>
                <input
                  type="text"
                  value={newSkill.skill_name}
                  onChange={(e) =>
                    setNewSkill({ ...newSkill, skill_name: e.target.value })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Python"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newSkill.skill_category}
                  onChange={(e) =>
                    setNewSkill({
                      ...newSkill,
                      skill_category: e.target.value as SkillData["skill_category"],
                    })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="technical">Technical</option>
                  <option value="soft">Soft Skill</option>
                  <option value="language">Language</option>
                  <option value="certification">Certification</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Proficiency
                </label>
                <select
                  value={newSkill.proficiency}
                  onChange={(e) =>
                    setNewSkill({
                      ...newSkill,
                      proficiency: e.target.value as SkillData["proficiency"],
                    })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Years
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={newSkill.years_experience ?? 0}
                  onChange={(e) =>
                    setNewSkill({
                      ...newSkill,
                      years_experience: parseInt(e.target.value || "0"),
                    })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAddSkill}
                  disabled={!newSkill.skill_name.trim()}
                  className="w-full px-2 py-1.5 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg text-sm flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Styles: line clamp + scrollbars */}
      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .skill-scrollbar::-webkit-scrollbar,
        .nav-scrollbar::-webkit-scrollbar,
        .category-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .skill-scrollbar::-webkit-scrollbar-track,
        .nav-scrollbar::-webkit-scrollbar-track,
        .category-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 999px;
        }
        .skill-scrollbar::-webkit-scrollbar-thumb,
        .nav-scrollbar::-webkit-scrollbar-thumb,
        .category-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }
        .skill-scrollbar::-webkit-scrollbar-thumb:hover,
        .nav-scrollbar::-webkit-scrollbar-thumb:hover,
        .category-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </motion.div>
  );
};

export default SkillsSection;
