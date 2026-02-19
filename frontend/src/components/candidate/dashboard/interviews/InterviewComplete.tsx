'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Home } from 'lucide-react';
import Link from 'next/link';

interface InterviewCompleteProps {
  jobTitle?: string;
  companyName?: string;
}

const InterviewComplete: React.FC<InterviewCompleteProps> = ({
  jobTitle,
  companyName,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[500px] text-center px-4"
    >
      {/* Success Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
        >
          <CheckCircle className="w-14 h-14 text-green-600" />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold text-gray-900 mb-3"
      >
        Interview Completed!
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-gray-600 max-w-md mb-2"
      >
        Great job! You've successfully completed your AI interview
        {jobTitle && ` for the ${jobTitle} position`}
        {companyName && ` at ${companyName}`}.
      </motion.p>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-blue-50 border border-blue-100 rounded-xl p-5 max-w-md mt-4 mb-8"
      >
        <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
        <ul className="text-sm text-blue-700 space-y-2 text-left">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            Your responses have been recorded and saved
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            The recruiter will review your interview
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
            You'll receive an update on the next steps
          </li>
        </ul>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <Link
          href="/candidate/dashboard/interviews"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
          View All Interviews
        </Link>
        <Link
          href="/candidate/dashboard"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#005DDC] text-white rounded-xl font-medium hover:bg-[#004EB7] transition-colors"
        >
          <Home className="w-5 h-5" />
          Back to Dashboard
        </Link>
      </motion.div>

      {/* Confetti Effect (decorative) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: ['#005DDC', '#22C55E', '#F59E0B', '#EC4899'][i % 4],
              left: `${Math.random() * 100}%`,
              top: '-10px',
            }}
            initial={{ y: -20, opacity: 1 }}
            animate={{
              y: '100vh',
              opacity: 0,
              rotate: Math.random() * 360,
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              delay: Math.random() * 0.5,
              ease: 'easeIn',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default InterviewComplete;
