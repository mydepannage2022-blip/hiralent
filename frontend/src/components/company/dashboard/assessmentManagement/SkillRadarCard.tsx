"use client";

import React, { useMemo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Gauge } from "lucide-react";

export interface SkillRadarPoint {
  label: string;
  score: number; // 0–100
}

export default function SkillRadarCard({
  title = "Skill Radar",
  radar,
  scaleLabel = "Scale: 0–100",
  emptyLabel = "No radar data available yet.",
  heightClass = "h-80",
  outerRadius = "78%",
}: {
  title?: string;
  radar: SkillRadarPoint[];
  scaleLabel?: string;
  emptyLabel?: string;
  heightClass?: string; // ✅ allow bigger charts
  outerRadius?: string | number; // ✅ allow more “full” radar
}) {
  const data = useMemo(() => {
    const arr = Array.isArray(radar) ? radar : [];
    return arr
      .filter((p) => p && String(p.label || "").trim().length > 0)
      .map((p) => ({
        skill: String(p.label).trim(),
        score:
          typeof p.score === "number" && Number.isFinite(p.score)
            ? Math.max(0, Math.min(100, Math.round(p.score)))
            : 0,
      }));
  }, [radar]);

  const hasData = data.length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
            <Gauge className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="text-[11px] text-slate-500">Category scores</p>
          </div>
        </div>
        <span className="text-[11px] text-slate-500">{scaleLabel}</span>
      </div>

      {!hasData ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center text-sm text-slate-600">
          {emptyLabel}
        </div>
      ) : (
        <div className={`mt-4 ${heightClass}`}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius={outerRadius} data={data}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fill: "#64748B", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: "#94A3B8", fontSize: 10 }}
                stroke="#E2E8F0"
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#2563EB"
                fill="#2563EB"
                strokeWidth={2}
                strokeOpacity={0.9}
                fillOpacity={0.16}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 12 }}
                formatter={(value: any) => [`${value}%`, "Score"]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
