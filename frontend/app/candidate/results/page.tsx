"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Code, BookOpen, ArrowRight } from 'lucide-react';

interface SubmissionData {
  questionId: string;
  questionTitle: string;
  language: string;
  code: string;
  score: number;
  runtimeMs?: number;
  results?: Array<{ name: string; passed: boolean; output: string }>;
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <ResultsInner />
    </Suspense>
  );
}

function ResultsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submission, setSubmission] = useState<SubmissionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Retrieve submission data from URL params
    try {
      const data = searchParams?.get('data');
      if (data) {
        const parsed = JSON.parse(decodeURIComponent(data));
        setSubmission(parsed);
      }
    } catch (error) {
      console.error('Failed to parse submission data', error);
    }
    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
        <div className="text-slate-700">Loading results...</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
        <div className="text-slate-700">No submission data found</div>
      </div>
    );
  }

  const testsPassed = submission.results?.filter(r => r.passed).length || 0;
  const totalTests = submission.results?.length || 0;
  const isPassed = submission.score >= 80;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-6 pt-24">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex justify-center">
            {isPassed ? (
              <div className="p-4 bg-emerald-100 rounded-full shadow-sm border border-emerald-200">
                <CheckCircle className="w-12 h-12 text-emerald-600" />
              </div>
            ) : (
              <div className="p-4 bg-yellow-100 rounded-full shadow-sm border border-yellow-200">
                <AlertCircle className="w-12 h-12 text-yellow-600" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 text-center">
            {isPassed ? '🎉 Perfect!' : '📊 Completed'}
          </h1>
          <p className="text-slate-600 text-center">Your answer to this question has been evaluated</p>
        </div>

        {/* Question Title */}
        <div className="bg-white backdrop-blur border border-slate-200 rounded-xl p-6 mb-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-800">Question</h2>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{submission.questionTitle}</h3>
          <div className="flex gap-2 mt-3">
            <span className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
              {submission.language}
            </span>
          </div>
        </div>

        {/* Score Card */}
        <div className="bg-white backdrop-blur border border-slate-200 rounded-xl p-8 mb-6 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score */}
            <div className="text-center">
              <p className="text-slate-600 text-sm mb-3 font-semibold">Score on this Question</p>
              <div className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                {submission.score}%
              </div>
              <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-600 to-blue-600 transition-all duration-1000"
                  style={{ width: `${submission.score}%` }}
                />
              </div>
            </div>

            {/* Tests */}
            <div className="text-center">
              <p className="text-slate-600 text-sm mb-3 font-semibold">Test Cases Passed</p>
              <div className="text-5xl font-bold text-emerald-600">
                {testsPassed}/{totalTests}
              </div>
              <p className="text-slate-600 text-sm mt-2">
                {totalTests === testsPassed && totalTests > 0 ? '✨ All Passed!' : totalTests === 0 ? 'No tests' : `${totalTests - testsPassed} failed`}
              </p>
            </div>
          </div>
        </div>

        {/* Your Code */}
        <div className="bg-white backdrop-blur border border-slate-200 rounded-xl p-6 shadow-lg mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Code className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-800">Your Solution</h2>
          </div>
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 max-h-80 overflow-auto">
            <pre className="text-sm text-slate-100 font-mono whitespace-pre-wrap break-words">
              {submission.code}
            </pre>
          </div>
        </div>

        {/* Test Results */}
        {submission.results && submission.results.length > 0 && (
          <div className="bg-white backdrop-blur border border-slate-200 rounded-xl p-6 shadow-lg mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Test Results</h2>
            <div className="space-y-3">
              {submission.results.map((test, idx) => (
                <div 
                  key={idx} 
                  className={`rounded-lg p-4 border ${test.passed 
                    ? 'bg-emerald-50 border-emerald-300' 
                    : 'bg-rose-50 border-rose-300'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-800 font-semibold">Test {idx + 1}</span>
                    <span className={`text-sm font-bold ${test.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {test.passed ? '✓ PASSED' : '✗ FAILED'}
                    </span>
                  </div>
                  <pre className="text-xs text-slate-100 bg-slate-900 p-2 rounded overflow-auto">
                    {test.output}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => router.push('/candidate/question')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-lg transition font-medium border border-slate-300 shadow-sm"
          >
            Try Another Question
          </button>
          <button
            onClick={() => router.push('/candidate/home')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg transition font-medium shadow-lg hover:shadow-xl"
          >
            Back to Home
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
