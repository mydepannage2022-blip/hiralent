"use client";
import { useState } from "react";
import StyledCheckbox from "./StyledCheckbox";
import Tag from "./Tag";

interface Props {
    isEditing: boolean;
}

const benefitsList = [
    "Promotion Opportunity",
    "Transportation Service",
    "Flexible Working Hour",
    "Insurance",
];

const PreferredJobBenefitsSection = ({ isEditing }: Props) => {
    const [selected, setSelected] = useState<string[]>([
        "Promotion Opportunity",
        "Insurance",
    ]);

    const toggle = (val: string) => {
        setSelected((prev) =>
            prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
        );
    };

    const removeTag = (val: string) => {
        setSelected((prev) => prev.filter((x) => x !== val));
    };

    return isEditing ? (
        <div>
            {/* Styled checkboxes */}
            <div className="flex flex-col gap-4 font-medium">
                {benefitsList.map((b) => (
                    <StyledCheckbox
                        key={b}
                        label={b}
                        checked={selected.includes(b)}
                        onChange={() => toggle(b)}
                    />
                ))}
            </div>

            {/* Selected tags */}
            <div className="flex flex-wrap mt-8">
                {selected.map((b) => (
                    <Tag key={b} label={b} onRemove={() => removeTag(b)} />
                ))}
            </div>
        </div>
    ) : (
        // ✅ unchanged read-only state
        <div className="flex flex-wrap gap-4">
            {selected.map((b) => (
                <span
                    key={b}
                    className="inline-flex items-center gap-2 bg-[#EDEDED] text-[#353535] px-3 py-1 rounded-md mb-2"
                >
                    {b}
                </span>
            ))}
        </div>
    );
};

export default PreferredJobBenefitsSection;