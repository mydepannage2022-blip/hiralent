import { Suspense } from 'react';
import QuestionBankPage from '@/src/components/company/dashboard/questionbank/QuestionBankPage';

export default function QuestionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <QuestionBankPage />
    </Suspense>
  );
}