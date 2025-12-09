"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SkillRadarCard, {
  AssessmentSkillRadarResponse,
  CandidateSkillRadar,
} from "./SkillRadarCard";
import { X } from "lucide-react";

interface Props {
  token: string;
  assessment: {
    assessment_id: string;
    title: string;
  };
  onClose: () => void;
}

const AssessmentAnalyticsModal: React.FC<Props> = ({
  token,
  assessment,
  onClose,
}) => {
  const [radarData, setRadarData] =
    useState<AssessmentSkillRadarResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateSkillRadar | null>(null);

  const API_BASE =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api/v1";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE}/employer/assessments/${assessment.assessment_id}/skill-radar`,
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
        setRadarData(json);
        setSelectedCandidate(json.candidates[0] ?? null);
      } catch (e: any) {
        console.error(e);
        setError("Failed to load analytics for this assessment.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [assessment.assessment_id, API_BASE, token]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-full max-w-6xl max-h-[85vh] bg-[#F6FAFF] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        initial={{ scale: 0.95, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 30, opacity: 0 }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white">
          <div>
            <h2 className="text-sm font-bold tracking-wide uppercase">
              Assessment Analytics
            </h2>
            <p className="text-xs opacity-90">{assessment.title}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY (scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-xs text-slate-500">
              Loading analytics...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          ) : !radarData ? (
            <div className="text-xs text-slate-500">
              No analytics data found for this assessment.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* LEFT COLUMN – CANDIDATES */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Candidates
                  </h3>
                  <span className="text-[11px] px-2 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                    {radarData.candidates.length}{" "}
                    {radarData.candidates.length === 1
                      ? "candidate"
                      : "candidates"}
                  </span>
                </div>

                {radarData.candidates.length === 0 ? (
                  <div className="px-4 py-6 text-xs text-slate-500">
                    No completed candidates yet.
                  </div>
                ) : (
                  <div className="p-3 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                    {radarData.candidates.map((c: CandidateSkillRadar) => (
                      <button
                        key={c.candidateId}
                        onClick={() => setSelectedCandidate(c)}
                        className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                          selectedCandidate?.candidateId === c.candidateId
                            ? "border-[#1B73E8] bg-[#EBF3FF] shadow-sm"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 flex items-center justify-center rounded-full bg-[#1B73E8]/10 text-[#1B73E8] text-[11px] font-semibold">
                            {c.candidateName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {c.candidateName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {c.skillLevel || "No level"} ·{" "}
                              {c.overallScore != null
                                ? `${c.overallScore}%`
                                : "No score yet"}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN – RADAR */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Skill Radar
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {selectedCandidate
                        ? `Category scores for ${selectedCandidate.candidateName}`
                        : "Category scores for completed candidate assessments"}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500">Scale: 0–100</span>
                </div>

                <div className="p-4 flex-1">
                  {radarData.candidates.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                      No completed assessments yet. Once candidates finish their
                      tests, their skills will appear here.
                    </div>
                  ) : (
                    <SkillRadarCard
                      token={token}
                      assessmentId={assessment.assessment_id}
                      selectedCandidateId={selectedCandidate?.candidateId ?? null}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AssessmentAnalyticsModal;
