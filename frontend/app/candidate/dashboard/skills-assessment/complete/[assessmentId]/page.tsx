'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Sparkles } from 'lucide-react';

export default function AssessmentCompletePage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.assessmentId as string;
  
  const [timeRemaining, setTimeRemaining] = useState(60); // 60 seconds
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!assessmentId) {
      router.push('/candidate/dashboard/skills-assessment');
      return;
    }

    // Countdown timer
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect after 1 minute
          router.push(`/candidate/dashboard/skills-assessment/results/${assessmentId}`);
          return 0;
        }
        return prev - 1;
      });

      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + (100 / 60); // Increase by 1.67% per second
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [assessmentId, router]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <CheckCircle className="w-16 h-16 text-green-500" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-2 -right-2"
              >
              </motion.div>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-bold text-gray-800 mb-4"
          >
            Assessment Completed!
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 text-sm mb-8"
          >
            Great job! We're analyzing your responses and generating personalized insights.
          </motion.p>

          {/* Processing Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-50 rounded-xl p-6 mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">
                Processing in progress...
              </span>
            </div>

            <div className="space-y-3 text-sm text-gray-600 text-left max-w-md mx-auto">
              <ProcessingStep 
                text="Evaluating your answers with AI" 
                delay={0.6}
              />
              <ProcessingStep 
                text="Calculating skill level and performance metrics" 
                delay={0.8}
              />
              <ProcessingStep 
                text="Generating personalized recommendations" 
                delay={1.0}
              />
              <ProcessingStep 
                text="Creating detailed performance report" 
                delay={1.2}
              />
            </div>
          </motion.div>

          {/* Timer Display */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 ring ring-1 ring-blue-500 text-blue-500 px-6 py-3 rounded-full font-semibold text-lg">
              <Clock className="w-5 h-5" />
              <span className='text-xs'>Results ready in {formatTime(timeRemaining)}</span>
            </div>
          </motion.div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
            />
          </div>

          <p className="text-xs text-gray-500 mt-4">
            You'll be automatically redirected to your results
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// Processing Step Component
function ProcessingStep({ text, delay }: { text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-3"
    >
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span>{text}</span>
    </motion.div>
  );
}