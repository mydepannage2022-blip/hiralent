import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

const faqs = [
  {
    question: "How do I update my profile?",
    answer:
      "Go to your Dashboard and click on 'My Profile'. You can edit your personal information, skills, experience, education, and upload a new resume or profile picture.",
  },
  {
    question: "How do I apply for a job?",
    answer:
      "Browse available jobs from the 'Find Jobs' section. Click on any job to view details and click 'Apply Now'. Make sure your profile is complete for better chances.",
  },
  {
    question: "How does messaging work?",
    answer:
      "Once an employer shows interest in your profile or you apply for a job, you can communicate through the Messages section in your dashboard. You'll receive notifications for new messages.",
  },
  {
    question: "How do I delete my account?",
    answer:
      "You can delete your account from the Settings page under the 'Danger Zone' section. Type 'DELETE' to confirm. This action is permanent and cannot be undone.",
  },
  {
    question: "How can I manage my active sessions?",
    answer:
      "In your Settings page, the Active Sessions panel shows all devices where you're currently logged in. You can terminate any session or all other sessions for security.",
  },
];

function QuestionAccount() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full p-5 rounded-xl shadow-sm bg-white">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
          <HelpCircle size={18} className="text-[#005DDC]" />
        </div>
        <span className="font-semibold text-gray-800">FAQ</span>
      </div>

      <div className="space-y-2">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="border border-gray-100 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggle(index)}
              className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 pr-4">
                {faq.question}
              </span>
              {openIndex === index ? (
                <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
              )}
            </button>
            {openIndex === index && (
              <div className="px-4 pb-3">
                <p className="text-sm text-gray-500 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuestionAccount;
