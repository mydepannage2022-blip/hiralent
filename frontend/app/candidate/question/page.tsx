"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, BookOpen, Code, CheckCircle } from 'lucide-react';

interface Question {
  id: string;
  title: string;
  description: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  language?: string;
  testCases?: Array<{ input: string; expected: string }>;
}

export default function QuestionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <QuestionInner />
    </Suspense>
  );
}

function QuestionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock question data - replace with real API call
    const mockQuestions: Record<string, Question> = {
      'q1': {
        id: 'q1',
        title: 'Sum of Two Numbers',
        description: `Write a function that takes two numbers as input and returns their sum.

Example:
- Input: 5, 3
- Output: 8

Requirements:
- Handle positive and negative numbers
- Return the correct sum`,
        difficulty: 'easy',
        language: 'python',
        testCases: [
          { input: '5, 3', expected: '8' },
          { input: '-2, 7', expected: '5' },
          { input: '0, 0', expected: '0' }
        ]
      },
      'q2': {
        id: 'q2',
        title: 'Fibonacci Sequence',
        description: `Generate the first N numbers of the Fibonacci sequence.

The Fibonacci sequence starts with 0 and 1, and each subsequent number is the sum of the previous two.

Example:
- Input: 5
- Output: [0, 1, 1, 2, 3]

Requirements:
- Handle N up to 100
- Return a list of Fibonacci numbers`,
        difficulty: 'medium',
        language: 'python',
        testCases: [
          { input: '5', expected: '[0, 1, 1, 2, 3]' },
          { input: '1', expected: '[0]' }
        ]
      }
    };

    // Get question ID from URL params or use default
    const questionId = searchParams?.get('id') || 'q1';
    const q = mockQuestions[questionId];

    if (q) {
      setQuestion(q);
    }
    setLoading(false);
  }, [searchParams]);

  const handleStartCoding = () => {
    if (question) {
      const params = new URLSearchParams({
        id: question.id,
        title: question.title,
        language: question.language || 'python',
        difficulty: question.difficulty || 'easy'
      });
      router.push(`/code-run?${params.toString()}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
        <div className="text-slate-200 text-lg">Loading question...</div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
        <div className="text-slate-200 text-lg">Question not found</div>
      </div>
    );
  }

  const difficultyColor = {
    easy: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
    hard: 'bg-rose-500/20 text-rose-300 border-rose-500/50'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-6 pt-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <h1 className="text-3xl font-bold text-slate-800">Coding Challenge</h1>
          </div>
          <p className="text-slate-600">Read the question carefully and click "Start Coding" to begin</p>
        </div>

        {/* Question Card */}
        <div className="bg-white backdrop-blur border border-slate-200 rounded-xl p-8 mb-8 shadow-lg">
          {/* Title & Meta */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-3">{question.title}</h2>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm border font-medium ${difficultyColor[question.difficulty || 'easy']}`}>
                {(question.difficulty || 'easy').charAt(0).toUpperCase() + (question.difficulty || 'easy').slice(1)}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm border border-indigo-200">
                <Code className="w-4 h-4" />
                {question.language || 'Python'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Problem Description</h3>
            <div className="prose max-w-none">
              <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                {question.description}
              </p>
            </div>
          </div>

          {/* Test Cases Preview */}
          {question.testCases && question.testCases.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Sample Test Cases</h3>
              <div className="space-y-3">
                {question.testCases.map((testCase, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-600 mb-2 font-semibold">Test Case {idx + 1}</p>
                        <p className="text-slate-800 font-mono text-sm">Input: <span className="text-indigo-600 font-semibold">{testCase.input}</span></p>
                        <p className="text-slate-800 font-mono text-sm">Expected: <span className="text-indigo-600 font-semibold">{testCase.expected}</span></p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Button */}
          <div className="pt-6 border-t border-slate-200">
            <button
              onClick={handleStartCoding}
              className="w-full inline-flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-lg transition transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              <Code className="w-5 h-5" />
              Start Coding
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">💡 Tips</h3>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>• Read the problem description carefully</li>
            <li>• Check the sample test cases to understand the expected output</li>
            <li>• You can run your code multiple times before submitting</li>
            <li>• Pay attention to edge cases</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
