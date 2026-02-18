import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HiRalent Code Assessment',
  description: 'Take your coding assessment on HiRalent',
};

export default function CodeAssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Assessment-only layout: No navbar, no footer, full-screen experience */}
      {children}
    </>
  );
}
