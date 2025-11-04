"use client";

import { Check } from "lucide-react";

interface StyledCheckboxProps {
    label: string;
    checked: boolean;
    onChange: () => void;
}

const StyledCheckbox = ({ label, checked, onChange }: StyledCheckboxProps) => {
    return (
        <label className="flex items-center gap-3 cursor-pointer select-none text-[#353535]">
            {/* Hidden default checkbox */}
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="hidden"
            />

            {/* Custom styled box */}
            <span
                className={`flex h-5 w-5 items-center justify-center rounded border-2 transition 
          ${checked
                        ? "border-[#005DDC]"
                        : "border-[#CBCBCB]"
                    }`}
            >
                {checked && <Check className="h-4 w-4 text-[#005DDC]" strokeWidth={3} />}
            </span>

            {label}
        </label>
    );
};

export default StyledCheckbox;