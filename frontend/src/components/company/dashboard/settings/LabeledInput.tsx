"use client";

import React from "react";

interface LabeledInputProps {
    label: string;
    placeholder?: string;
    value?: string;
    type?: string;
    required?: boolean;
    textarea?: boolean;
    readOnly?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const LabeledInput: React.FC<LabeledInputProps> = ({
    label,
    placeholder,
    value,
    type = "text",
    required = false,
    textarea = false,
    readOnly = false,
    onChange,
}) => {
    return (
        <div className="relative w-full">
            <label className="text-sm sm:text-base absolute -top-3 left-3 bg-white px-2 font-medium text-black">
                {label}
                {required && <span className="text-[#DC0000] ml-0.5">*</span>}
            </label>

            {textarea ? (
                <textarea
                    placeholder={placeholder}
                    value={value}
                    readOnly={readOnly}
                    onChange={onChange}
                    rows={4}
                    className={`w-full rounded-md border border-[#A5A5A5] px-4 py-4 focus:ring-2 focus:ring-black focus:outline-none resize-none ${readOnly ? "text-gray-500 cursor-not-allowed" : ""
                        }`}
                />
            ) : (
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    readOnly={readOnly}
                    onChange={onChange}
                    className={`w-full rounded-md border border-[#A5A5A5] px-4 py-3 focus:ring-2 focus:ring-black focus:outline-none ${readOnly ? "text-gray-500 cursor-not-allowed" : ""
                        }`}
                />
            )}
        </div>
    );
};

export default LabeledInput;
