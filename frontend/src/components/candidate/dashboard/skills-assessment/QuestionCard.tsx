"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Circle,
  Code,
  FileText,
  AlertCircle,
  Clock,
  ArrowRight,
} from "lucide-react";

interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean; // Only used for showing results
}

interface Question {
  id: string;
  questionText: string;
  type: "MCQ" | "CODING" | "ESSAY" | "TRUE_FALSE" | "SCENARIO" | "SHORT_ANSWER";
  options?: QuestionOption[];
  timeLimit?: number; // in seconds
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  category?: string;
}

interface QuestionCardProps {
  question: Question;
  currentQuestionIndex: number;
  totalQuestions: number;
  selectedAnswer?: string | string[];
  onAnswerChange?: (answer: string | string[]) => void;
  onSubmit?: () => void;
  isSubmitted?: boolean;
  showResults?: boolean;
  timeRemaining?: number;
  isLoading?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  currentQuestionIndex,
  totalQuestions,
  selectedAnswer,
  onAnswerChange,
  onSubmit,
  isSubmitted = false,
  showResults = false,
  timeRemaining,
  isLoading = false,
}) => {
  const [answer, setAnswer] = useState<string | string[]>(selectedAnswer || "");
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    setAnswer(selectedAnswer || "");
    setIsAnswered(!!selectedAnswer);
  }, [selectedAnswer]);

  const handleAnswerSelect = (optionId: string) => {
    if (isSubmitted) return;

    let newAnswer: string | string[];

    if (
      question.type === "MCQ" ||
      question.type === "TRUE_FALSE" ||
      question.type === "SCENARIO"
    ) {
      newAnswer = optionId;
      setAnswer(newAnswer);
      setIsAnswered(true);
      onAnswerChange?.(newAnswer);
    }
  };

  const handleTextAnswerChange = (value: string) => {
    if (isSubmitted) return;
    setAnswer(value);
    setIsAnswered(value.trim().length > 0);
    onAnswerChange?.(value);
  };

  const handleSubmit = () => {
    if (isAnswered && !isSubmitted && onSubmit) {
      onSubmit();
    }
  };

  const getQuestionIcon = () => {
    switch (question.type) {
      case "CODING":
        return <Code className="h-5 w-5" />;
      case "ESSAY":
        return <FileText className="h-5 w-5" />;
      case "MCQ":
      case "TRUE_FALSE":
      case "SCENARIO":
      default:
        return <Circle className="h-5 w-5" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return "bg-green-50 text-green-600";
      case "INTERMEDIATE":
        return "bg-yellow-50 text-yellow-600";
      case "ADVANCED":
        return "bg-orange-50 text-orange-600";
      case "EXPERT":
        return "bg-red-50 text-red-600";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  const renderTimeWarning = () => {
    if (!timeRemaining) return null;

    const isWarning = timeRemaining <= 30; // Last 30 seconds
    const isCritical = timeRemaining <= 10; // Last 10 seconds

    if (isWarning) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 ${
            isCritical
              ? "bg-red-100 text-red-700"
              : "bg-orange-100 text-orange-700"
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">
            {isCritical ? "Time almost up!" : "Running out of time!"}
          </span>
          <Clock className="h-4 w-4 ml-auto" />
          <span className="font-bold">{timeRemaining}s</span>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full "
    >
      {/* Question Header */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-[#005DDC]">
              {getQuestionIcon()}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#222]">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </h2>
              <div className="flex items-center gap-2 text-sm text-[#757575]">
                <span>{question.type}</span>
                {question.difficulty && (
                  <>
                    <span>•</span>
                    <span
                      className={`px-2 py-1 rounded-md text-xs ${getDifficultyColor(
                        question.difficulty
                      )}`}
                    >
                      {question.difficulty}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="text-right">
            <div className="text-sm text-[#757575] mb-1">Progress</div>
            <div className="text-sm font-semibold text-[#005DDC]">
              {Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%
            </div>
          </div>
        </div>

        {/* Time Warning */}
        {renderTimeWarning()}

        {/* Question Text */}
        <div className="mb-6">
          <p className="text-sm text-[#222] leading-relaxed">
            {question.questionText}
          </p>
        </div>

        {/* Answer Section */}
        <div className="space-y-4">
          {/* Multiple Choice Questions */}
          {(question.type === "MCQ" ||
            question.type === "TRUE_FALSE" ||
            question.type === "SCENARIO") &&
            question.options && (
              <div className="space-y-3">
                {question.options.map((option, index) => {
                  const isSelected = answer === option.id;
                  const isCorrectOption = showResults && option.isCorrect;
                  const isWrongSelection =
                    showResults && isSelected && !option.isCorrect;

                  return (
                    <motion.div
                      key={option.id}
                      whileHover={!isSubmitted ? { scale: 1.01 } : {}}
                      whileTap={!isSubmitted ? { scale: 0.99 } : {}}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSubmitted
                          ? isCorrectOption
                            ? "border-green-500 bg-green-50"
                            : isWrongSelection
                            ? "border-red-500 bg-red-50"
                            : "border-gray-200 bg-gray-50"
                          : isSelected
                          ? "border-[#005DDC] bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => handleAnswerSelect(option.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            isSubmitted
                              ? isCorrectOption
                                ? "bg-green-500"
                                : isWrongSelection
                                ? "bg-red-500"
                                : "bg-gray-300"
                              : isSelected
                              ? "bg-[#005DDC]"
                              : "bg-gray-300"
                          }`}
                        >
                          {(isSelected ||
                            (showResults && option.isCorrect)) && (
                            <CheckCircle className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <span className="text-[#222] font-normal text-sm">
                          {String.fromCharCode(65 + index)}. {option.text}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

          {/* Coding Questions */}
          {question.type === "CODING" && (
            <div>
              <label className="block text-sm font-medium text-[#222] mb-2">
                Your Code:
              </label>
              <textarea
                value={typeof answer === "string" ? answer : ""}
                onChange={(e) => handleTextAnswerChange(e.target.value)}
                disabled={isSubmitted}
                className="w-full h-64 p-4 border border-gray-200 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-[#005DDC] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Write your code here..."
              />
            </div>
          )}

          {/* Short Answer Questions - ADD THIS */}
          {question.type === "SHORT_ANSWER" && (
            <div>
              <label className="block text-sm font-medium text-[#222] mb-2">
                Your Answer:
              </label>
              <textarea
                value={typeof answer === "string" ? answer : ""}
                onChange={(e) => handleTextAnswerChange(e.target.value)}
                disabled={isSubmitted}
                className="w-full h-24 p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-[#005DDC] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Write your answer in 1-2 sentences..."
                maxLength={500}
              />
              <div className="flex justify-between text-xs text-[#757575] mt-1">
                <span>Keep it brief and clear</span>
                <span>
                  {typeof answer === "string" ? answer.length : 0}/500
                  characters
                </span>
              </div>
            </div>
          )}

          {/* Essay Questions */}
          {question.type === "ESSAY" && (
            <div>
              <label className="block text-sm font-medium text-[#222] mb-2">
                Your Answer:
              </label>
              <textarea
                value={typeof answer === "string" ? answer : ""}
                onChange={(e) => handleTextAnswerChange(e.target.value)}
                disabled={isSubmitted}
                className="w-full h-32 p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-[#005DDC] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Type your answer here..."
              />
              <div className="flex justify-between text-xs text-[#757575] mt-1">
                <span>Be clear and concise</span>
                <span>
                  {typeof answer === "string" ? answer.length : 0} characters
                </span>
              </div>
            </div>
          )}

          {/* TRUE/FALSE Questions - ADD THIS (before MCQ section) */}
          {question.type === "TRUE_FALSE" && (
            <div className="space-y-3">
              {["True", "False"].map((option, index) => {
                const optionId = option.toLowerCase();
                const isSelected = answer === optionId;
                const isCorrectOption =
                  showResults &&
                  question.options?.find((o) => o.id === optionId)?.isCorrect;
                const isWrongSelection =
                  showResults && isSelected && !isCorrectOption;

                return (
                  <motion.div
                    key={optionId}
                    whileHover={!isSubmitted ? { scale: 1.01 } : {}}
                    whileTap={!isSubmitted ? { scale: 0.99 } : {}}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSubmitted
                        ? isCorrectOption
                          ? "border-green-500 bg-green-50"
                          : isWrongSelection
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 bg-gray-50"
                        : isSelected
                        ? "border-[#005DDC] bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => handleAnswerSelect(optionId)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isSubmitted
                            ? isCorrectOption
                              ? "bg-green-500"
                              : isWrongSelection
                              ? "bg-red-500"
                              : "bg-gray-300"
                            : isSelected
                            ? "bg-[#005DDC]"
                            : "bg-gray-300"
                        }`}
                      >
                        {(isSelected || (showResults && isCorrectOption)) && (
                          <CheckCircle className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className="text-[#222] font-medium text-sm">
                        {option}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* SCENARIO Questions */}
          {question.type === "SCENARIO" && question.options && (
            <div>
              {/* Scenario context box */}
              <div className="mb-4 p-4 bg-blue-50 border-l-4 border-[#005DDC] rounded">
                <p className="text-sm text-[#222] leading-relaxed">
                  <span className="font-semibold">Scenario:</span> Read the
                  situation carefully before selecting your answer.
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {question.options.map((option, index) => {
                  const isSelected = answer === option.id;

                  return (
                    <motion.div
                      key={option.id}
                      whileHover={!isSubmitted ? { scale: 1.01 } : {}}
                      whileTap={!isSubmitted ? { scale: 0.99 } : {}}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? "border-[#005DDC] bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                      onClick={() => handleAnswerSelect(option.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
                            isSelected ? "bg-[#005DDC]" : "bg-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <CheckCircle className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="text-[#222] font-medium">
                            {String.fromCharCode(65 + index)}. {option.text}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        {!isSubmitted && (
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSubmit}
              disabled={!isAnswered || isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-[#005DDC] text-white rounded-md font-medium hover:bg-[#004EB7] disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Answer
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Results Message */}
        {showResults && isSubmitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center gap-2 text-[#005DDC] font-medium">
              <CheckCircle className="h-5 w-5" />
              Answer submitted successfully!
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default QuestionCard;
