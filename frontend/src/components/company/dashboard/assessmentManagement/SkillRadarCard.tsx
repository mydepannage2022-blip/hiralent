"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Gauge } from "lucide-react";

export interface SkillRadarPoint {
  label: string;
  score: number; // 0–100
}

export interface CandidateSkillRadar {
  candidateId: string;
  candidateName: string;
  jobId?: string | null;
  employerAssessmentId?: string | null;
  overallScore?: number | null;
  skillLevel?: string | null;
  radar: SkillRadarPoint[];
}

export interface AssessmentSkillRadarResponse {
  assessmentId: string;
  jobId: string;
  companyId: string;
  title: string;
  candidates: CandidateSkillRadar[];
}

interface SkillRadarCardProps {
  token: string;
  assessmentId: string;
  selectedCandidateId?: string | null;
}

type ChartRow = {
  skill: string;
  [key: string]: number | string;
};

const SkillRadarCard: React.FC<SkillRadarCardProps> = ({
  token,
  assessmentId,
  selectedCandidateId,
}) => {
  const [data, setData] = useState<AssessmentSkillRadarResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !assessmentId) return;

    const API_BASE =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

    const fetchRadar = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE}/employer/assessments/${assessmentId}/skill-radar`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`HTTP ${res.status}: ${txt}`);
        }

        const json = (await res.json()) as AssessmentSkillRadarResponse;
        setData(json);
      } catch (err: any) {
        console.error("Failed to load skill radar:", err);
        setError("Unable to load skill radar for this assessment.");
      } finally {
        setLoading(false);
      }
    };

    fetchRadar();
  }, [token, assessmentId]);

  // Filter candidates: if a candidate is selected, show only that one
  const candidatesToShow: CandidateSkillRadar[] = useMemo(() => {
    if (!data?.candidates?.length) return [];
    if (!selectedCandidateId) return data.candidates;
    return data.candidates.filter(
      (c) => c.candidateId === selectedCandidateId
    );
  }, [data, selectedCandidateId]);

  const chartData: ChartRow[] = useMemo(() => {
    if (!candidatesToShow.length) return [];

    const skillSet = new Set<string>();
    candidatesToShow.forEach((c) =>
      c.radar.forEach((p) => skillSet.add(p.label))
    );
    const skills = Array.from(skillSet);

    return skills.map((skill) => {
      const row: ChartRow = { skill };
      candidatesToShow.forEach((c) => {
        const point = c.radar.find((p) => p.label === skill);
        row[c.candidateName] = point?.score ?? 0;
      });
      return row;
    });
  }, [candidatesToShow]);

  const hasData =
    candidatesToShow.length > 0 && chartData.length > 0;

  // Purple-centric palette (unchanged by Tailwind)
  const palette = ["#7C3AED", "#A855F7", "#EC4899", "#6366F1"];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm h-full">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF2FF]">
            <Gauge className="h-4 w-4 text-[#4C1D95]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Skill Graph
            </h3>
            <p className="text-[11px] text-slate-500">
              Category scores on a 0–100 scale
            </p>
          </div>
        </div>
        {data?.candidates?.length ? (
          <div className="text-[11px] text-slate-500">
            {data.candidates.length}{" "}
            {data.candidates.length === 1 ? "candidate" : "candidates"}
          </div>
        ) : null}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6 text-xs text-slate-500">
          Loading skill radar...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && !hasData && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
          No completed assessments yet. Once candidates finish their tests,
          their skills will appear here.
        </div>
      )}

      {!loading && !error && hasData && (
        <div className="mt-2 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fill: "#64748B", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: "#CBD5F5", fontSize: 10 }}
                stroke="#E2E8F0"
              />
              {candidatesToShow.map((c, idx) => (
                <Radar
                  key={c.candidateId}
                  name={c.candidateName}
                  dataKey={c.candidateName}
                  stroke={palette[idx % palette.length]}
                  fill={palette[idx % palette.length]}
                  strokeWidth={2}
                  strokeOpacity={0.9}
                  fillOpacity={0.25}
                />
              ))}
              <Legend />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SkillRadarCard;
