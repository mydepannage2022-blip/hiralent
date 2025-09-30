import React from "react";

interface CheckboxButtonProps {
    label: string;
    checked: boolean;
    onChange: () => void;
}

const CheckboxButton = ({ label, checked, onChange }: CheckboxButtonProps) => (
    <button
        type="button"
        onClick={onChange}
        className={`px-4 py-2 border rounded-md text-sm mr-2 mb-2 ${checked
                ? "bg-indigo-50 border-indigo-500 text-indigo-600"
                : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
    >
        {label}
    </button>
);

export default CheckboxButton;