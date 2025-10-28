import React from "react";

interface TagProps {
    label: string;
    onRemove: () => void;
}

const Tag = ({ label, onRemove }: TagProps) => (
    <span className="inline-flex items-center gap-2 bg-[#EDEDED] text-[#353535] px-3 py-1 rounded-md mr-4 mb-2">
        {label}
        <button
            type="button"
            onClick={onRemove}
            className="text-sm text-[#353535] hover:text-gray-700"
        >
            ✕
        </button>
    </span>
);

export default Tag;