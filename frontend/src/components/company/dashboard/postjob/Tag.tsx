import React from "react";

interface TagProps {
    label: string;
    onRemove: () => void;
}

const Tag = ({ label, onRemove }: TagProps) => (
    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-md mr-2 mb-2">
        {label}
        <button
            type="button"
            onClick={onRemove}
            className="text-gray-500 hover:text-gray-700"
        >
            ✕
        </button>
    </span>
);

export default Tag;