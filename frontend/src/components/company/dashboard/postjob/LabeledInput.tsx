import React from "react";

interface LabeledInputProps {
    label: string;
    required?: boolean;
    placeholder?: string;
    type?: string;
}

const LabeledInput = ({ label, required, placeholder, type = "text" }: LabeledInputProps) => (
    <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            placeholder={placeholder}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
    </div>
);

export default LabeledInput;