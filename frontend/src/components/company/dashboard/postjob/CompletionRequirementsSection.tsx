"use client";
import { useState } from "react";
import StyledCheckbox from "./StyledCheckbox";
import LabeledInput from "./LabeledInput";
import Tag from "./Tag";

interface Props {
    isEditing: boolean;
}

const CompletionRequirementsSection = ({ isEditing }: Props) => {
    const [requirements, setRequirements] = useState<string[]>([
        "Hiring individuals with disabilities is possible",
    ]);
    const [fields, setFields] = useState<string[]>(["UI/UX"]);
    const [education, setEducation] = useState<string[]>(["Information Technology,Bacholar's"]);

    const toggle = (val: string) => {
        setRequirements((prev) =>
            prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
        );
    };

    return (
        <div>
            {isEditing ? (
                <>
                    <div className="space-y-6 mb-6">
                        {/* Checkboxes */}
                        <StyledCheckbox
                            label="Conducting background checks is required"
                            checked={requirements.includes("Conducting background checks is required")}
                            onChange={() => toggle("Conducting background checks is required")}
                        />
                        <StyledCheckbox
                            label="Hiring individuals with disabilities is possible"
                            checked={requirements.includes("Hiring individuals with disabilities is possible")}
                            onChange={() => toggle("Hiring individuals with disabilities is possible")}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 mb-6">
                        {requirements.map((r) => (
                            <Tag key={r} label={r} onRemove={() => toggle(r)} />
                        ))}
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <LabeledInput label="Field of Study" value={fields.join(", ")} required />
                        <LabeledInput label="Educational Level" value={education.join(", ")} required />
                    </div>
                    <div className="flex flex-wrap">
                        {fields.map((f) => (
                            <Tag
                                key={f}
                                label={f}
                                onRemove={() => setFields((prev) => prev.filter((x) => x !== f))}
                            />
                        ))}
                        {education.map((e) => (
                            <Tag
                                key={e}
                                label={e}
                                onRemove={() => setEducation((prev) => prev.filter((x) => x !== e))}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-start gap-6">
                    {/* Row 1 - Disability tag */}
                    {requirements.map((r) => (
                        <span
                            key={r}
                            className="inline-flex items-center gap-2 bg-[#EDEDED] text-[#353535] px-3 py-1 rounded-md mb-2"
                        >
                            {r}
                        </span>
                    ))}

                    {/* Row 2 - Fields + Education */}
                    <div className="flex flex-wrap gap-4">
                        {[...fields, ...education].map((val) => (
                            <span
                                key={val}
                                className="inline-flex items-center gap-2 bg-[#EDEDED] text-[#353535] px-3 py-1 rounded-md mb-2"
                            >
                                {val}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompletionRequirementsSection;