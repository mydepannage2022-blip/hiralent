import React from 'react';

// Define MCQOptions interface locally since we don't have shared types
export interface MCQOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

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
  // Initialize default options if not provided
  const defaultOptions: MCQOptions = {
    A: '',
    B: '',
    C: '',
    D: ''
  };

  const currentOptions = options || defaultOptions;

  const handleOptionChange = (key: keyof MCQOptions, value: string) => {
    onChange({
      options: { ...currentOptions, [key]: value },
      correctAnswer,
      explanation
    });
  };

  const handleCorrectAnswerChange = (answer: string) => {
    onChange({ 
      options: currentOptions, 
      correctAnswer: answer.toUpperCase().replace(/[^A-D,]/g, ''), // Only allow A-D and commas
      explanation 
    });
  };

  const handleExplanationChange = (exp: string) => {
    onChange({ 
      options: currentOptions, 
      correctAnswer, 
      explanation: exp 
    });
  };

  const handleAddOption = (key: keyof MCQOptions, value: string) => {
    handleOptionChange(key, value);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Multiple Choice Options</h3>
        <p className="text-sm text-blue-600">
          Define the answer choices and mark the correct one(s)
        </p>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 gap-4">
        {(['A', 'B', 'C', 'D'] as const).map((key) => (
          <div key={key} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg bg-white">
            <div className="flex items-center gap-3 flex-1">
              <label className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-800 font-bold rounded-full">
                {key}
              </label>
              <input
                type="text"
                value={currentOptions[key]}
                onChange={(e) => handleOptionChange(key, e.target.value)}
                placeholder={`Enter option ${key} text...`}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            
            {/* Quick select as correct answer */}
            <button
              type="button"
              onClick={() => {
                const currentAnswers = correctAnswer.split(',').filter(Boolean);
                if (currentAnswers.includes(key)) {
                  // Remove from correct answers
                  handleCorrectAnswerChange(currentAnswers.filter(a => a !== key).join(','));
                } else {
                  // Add to correct answers
                  handleCorrectAnswerChange([...currentAnswers, key].join(','));
                }
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                correctAnswer.includes(key)
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {correctAnswer.includes(key) ? 'Correct ✓' : 'Mark Correct'}
            </button>
          </div>
        ))}
      </div>

      {/* Correct Answer Input */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Correct Answer(s) *
        </label>
        <input
          type="text"
          value={correctAnswer}
          onChange={(e) => handleCorrectAnswerChange(e.target.value)}
          placeholder="A or A,B for multiple correct answers"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Single: A
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Multiple: A,B
          </span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Allowed: A, B, C, D
          </span>
        </div>
        
        {/* Current selection preview */}
        {correctAnswer && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800">
              Selected as correct: {correctAnswer.split(',').map(ans => (
                <span key={ans} className="inline-block bg-green-200 text-green-800 px-2 py-1 rounded mx-1">
                  {ans}
                </span>
              ))}
            </p>
          </div>
        )}
      </div>

      {/* Explanation */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Explanation
        </label>
        <textarea
          value={explanation}
          onChange={(e) => handleExplanationChange(e.target.value)}
          placeholder="Explain why the correct answer is right. This helps learners understand the concept..."
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        />
        <p className="text-xs text-gray-500 mt-2">
          Optional but recommended for better learning experience
        </p>
      </div>

      {/* Validation Warnings */}
      {(!correctAnswer || correctAnswer.trim() === '') && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 font-medium">
            ⚠️ Please specify the correct answer(s) before saving.
          </p>
        </div>
      )}

      {Object.values(currentOptions).some(opt => !opt.trim()) && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800">
            ℹ️ Some options are empty. All options should be filled for a complete question.
          </p>
        </div>
      )}
    </div>
  );
};

export default MCQEditor;