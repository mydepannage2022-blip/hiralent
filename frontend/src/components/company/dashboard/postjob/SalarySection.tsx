"use client";

import { useState } from "react";
import LabeledInput from "./LabeledInput";
import Tag from "./Tag";
import StyledCheckbox from "./StyledCheckbox";
import { CircleAlert, CircleQuestionMark } from "lucide-react";

interface Props {
    isEditing: boolean;
}

const SalarySection = ({ isEditing }: Props) => {
    const [salaryVisible, setSalaryVisible] = useState(true);

    // ✅ Keep tags in state so they can be removed
    const [tags, setTags] = useState<string[]>([
        "Displaying salary in the job post",
        "5000$",
    ]);

    const removeTag = (tag: string) => {
        setTags((prev) => prev.filter((t) => t !== tag));
    };

    return isEditing ? (
        <>
            {/* Salary input */}
            <LabeledInput
                label="Minimum Salary Amount"
                required
                placeholder="input"
                type="number"
            />

            {/* Info note */}
            <div className="flex items-center gap-1 mt-3 ml-6 text-[#A5A5A5] text-sm">
                <CircleAlert className="h-5 w-5" />
                <p>Amount is by dollar / Monthly</p>
            </div>

            {/* Helper question */}
            <div className="flex items-center gap-1 mt-8 font-semibold text-black">
                <CircleQuestionMark className="h-6 w-6" />
                <p>What is the fair salary range for this field?</p>
            </div>

            {/* Styled Checkbox */}
            <div className="mt-6 flex gap-3 font-medium">
                <StyledCheckbox
                    label=""
                    checked={salaryVisible}
                    onChange={() => setSalaryVisible(!salaryVisible)}
                />
                <p>Display salary in the job post</p>
            </div>

            {/* Highlighted note */}
            <p className="text-xs sm:text-base mt-6 font-medium text-[#DC0000]">
                Job postings that transparently display their fair salary receive 45%
                more resumes on average.
            </p>

            {/* Tags when salary visible */}
            {salaryVisible && (
                <div className="mt-8 flex flex-col gap-1">
                    {tags.map((tag) => (
                        <span key={tag} className="w-auto">
                            <Tag label={tag} onRemove={() => removeTag(tag)} />
                        </span>
                    ))}
                </div>
            )}
        </>
    ) : (
        <div className="flex flex-col items-start gap-2">
            {tags.map((tag) => (
                <span
                    key={tag}
                    className="inline-flex items-center gap-2 bg-[#EDEDED] text-[#353535] px-3 py-1 rounded-md mb-2"
                >
                    {tag}
                </span>
            ))}
        </div>
    );
};

export default SalarySection;