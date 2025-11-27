
import React from 'react';

interface MCQEditorProps {
  options: MCQOptions;
  correctAnswer: string;
  explanation: string;
  onChange: (data: { options: MCQOptions; correctAnswer: string; explanation: string }) => void;
}

export const MCQEditor: React.FC<MCQEditorProps> = ({
  options,
  correctAnswer,
  explanation,
  onChange
}) => {
  const handleOptionChange = (key: keyof MCQOptions, value: string) => {
    onChange({
      options: { ...options, [key]: value },
      correctAnswer,
      explanation
    });
  };

  const handleCorrectAnswerChange = (answer: string) => {
    onChange({ options, correctAnswer: answer, explanation });
  };

  const handleExplanationChange = (exp: string) => {
    onChange({ options, correctAnswer, explanation: exp });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {(['A', 'B', 'C', 'D'] as const).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <label className="w-8 font-bold text-gray-700">{key}</label>
            <input
              type="text"
              value={options[key]}
              onChange={(e) => handleOptionChange(key, e.target.value)}
              placeholder={`Option ${key}`}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Correct Answer(s)
        </label>
        <input
          type="text"
          value={correctAnswer}
          onChange={(e) => handleCorrectAnswerChange(e.target.value)}
          placeholder="e.g., A or A,B for multiple correct"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Use comma for multiple correct answers: A,B,C
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Explanation
        </label>
        <textarea
          value={explanation}
          onChange={(e) => handleExplanationChange(e.target.value)}
          placeholder="Explain why the correct answer is right..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};