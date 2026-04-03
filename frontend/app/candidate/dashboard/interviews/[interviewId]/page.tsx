'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  ArrowLeft,
  PlayCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Eye,
  Smartphone,
  MonitorOff,
  Wifi,
  Mic,
  Camera,
} from 'lucide-react';
import { getInterview } from '@/src/lib/interview/interview.api';
import InterviewStatusBadge from '@/src/components/candidate/dashboard/interviews/InterviewStatusBadge';
import type { CandidateInterviewListItem } from '@/src/types/interview.types';

export default function InterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params?.interviewId as string;

  const [interview, setInterview] = useState<CandidateInterviewListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        setIsLoading(true);
        const data = await getInterview(interviewId);
        setInterview(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load interview details');
      } finally {
        setIsLoading(false);
      }
    };
    if (interviewId) fetchInterview();
  }, [interviewId]);

  const handleStartInterview = () => {
    router.push(`/candidate/dashboard/interviews/${interviewId}/setup`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const canStartInterview = interview?.status === 'PENDING' || interview?.status === 'IN_PROGRESS';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="w-8 h-8 animate-spin text-[#005DDC]" />
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-600">{error || 'Interview not found'}</p>
        <button
          onClick={() => router.push('/candidate/dashboard/interviews')}
          className="text-[#005DDC] hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Interviews
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Back Button */}
      <button
        onClick={() => router.push('/candidate/dashboard/interviews')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Interviews
      </button>

      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#005DDC] rounded-2xl px-6 py-5 text-white"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold leading-tight">{interview.jobTitle}</h1>
            {interview.companyName && (
              <p className="text-blue-100 text-sm mt-1">{interview.companyName}</p>
            )}
            {interview.scheduledDate && (
              <div className="flex items-center gap-3 mt-3 text-blue-100 text-sm">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(interview.scheduledDate)}
                </span>
                <span className="text-blue-300">·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(interview.scheduledDate)}
                </span>
              </div>
            )}
          </div>
          <InterviewStatusBadge status={interview.status} size="lg" />
        </div>
      </motion.div>

      {/* Completed state */}
      {interview.status === 'COMPLETED' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-3"
        >
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-emerald-900">Interview Completed</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              Completed on {formatDate(interview.completedAt)}. The recruiter will review your responses shortly.
            </p>
          </div>
        </motion.div>
      )}

      {/* Expired state */}
      {interview.status === 'EXPIRED' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-orange-50 border border-orange-100 rounded-2xl p-5 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-orange-900">Interview Expired</p>
            <p className="text-sm text-orange-700 mt-0.5">
              This interview has expired. Please contact the recruiter if you need to reschedule.
            </p>
          </div>
        </motion.div>
      )}

      {canStartInterview && (
        <>
          {/* Before You Begin */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white border border-gray-200 rounded-2xl p-5"
          >
            <h2 className="font-semibold text-gray-900 mb-4">Before You Begin</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: Camera, label: 'Camera & Mic', desc: 'Must be working and allowed' },
                { icon: Wifi, label: 'Stable Internet', desc: 'Use a reliable connection' },
                { icon: Mic, label: 'Quiet Space', desc: 'Find a well-lit, quiet area' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#005DDC]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Fraud / Proctoring Warning */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <h2 className="font-semibold text-amber-900">Integrity & Proctoring Notice</h2>
            </div>
            <p className="text-sm text-amber-800 mb-4">
              This interview is monitored for integrity. The following violations are automatically detected and reported to the recruiter:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { icon: Eye, label: 'Face not visible', desc: 'Stay in front of the camera at all times' },
                { icon: Eye, label: 'Multiple faces detected', desc: 'Only you should be in frame' },
                { icon: Smartphone, label: 'Phone detected', desc: 'No phones or devices during the interview' },
                { icon: MonitorOff, label: 'Tab switching', desc: 'Do not leave or minimize this window' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-2.5 bg-amber-100/60 rounded-xl px-3 py-2.5">
                  <Icon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-900">{label}</p>
                    <p className="text-xs text-amber-700 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Start Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex justify-center pt-2 pb-4"
          >
            <button
              onClick={handleStartInterview}
              className="flex items-center gap-3 px-8 py-3.5 bg-[#005DDC] text-white rounded-xl font-semibold hover:bg-[#004EB7] transition-colors"
            >
              <PlayCircle className="w-5 h-5" />
              {interview.status === 'IN_PROGRESS' ? 'Continue Interview' : 'Start Interview'}
            </button>
          </motion.div>
        </>
      )}
    </div>
  );
}
