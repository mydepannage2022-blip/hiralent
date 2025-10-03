"use client";
import { useState } from "react";
import LabeledInput from "./LabeledInput";
import StyledCheckbox from "./StyledCheckbox";
import Tag from "./Tag";

interface Props {
    isEditing: boolean;
}

const SkillsSection = ({ isEditing }: Props) => {
    const [languages, setLanguages] = useState<string[]>(["English / Advance"]);
    const [software, setSoftware] = useState<string[]>(["Graphic Software / Junior"]);
    const [communication, setCommunication] = useState<string[]>(["Collaboration Skill", "Time management"]);

    const toggleComm = (val: string) => {
        setCommunication((prev) =>
            prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
        );
    };

    const commOptions = [
        "Conflict Resolution Skill",
        "Collaboration Skill",
        "Time management",
        "Interpersonal skill",
        "Adaptability",
    ];

    return (
        <div>
            {isEditing ? (
                <>
                    {/* Languages */}
                    <div className="mb-6">
                        <p className="text-xl font-medium mb-8">Languages</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <LabeledInput label="Languages" value="English" required />
                            <LabeledInput label="Proficiency Level" value="Advance" required />
                        </div>
                        <div className="flex flex-wrap">
                            {languages.map((l) => (
                                <Tag
                                    key={l}
                                    label={l}
                                    onRemove={() => setLanguages((prev) => prev.filter((x) => x !== l))}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Software */}
                    <div className="mb-6">
                        <p className="text-xl font-medium mb-8">Software</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <LabeledInput label="Field" value="Graphic Software" required />
                            <LabeledInput label="Proficiency Level" value="Junior" required />
                        </div>
                        <div className="flex flex-wrap">
                            {software.map((s) => (
                                <Tag
                                    key={s}
                                    label={s}
                                    onRemove={() => setSoftware((prev) => prev.filter((x) => x !== s))}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Communication skills */}
                    <div>
                        <p className="text-xl font-medium mb-8">Communication</p>
                        <div className="flex flex-col gap-4 mb-6 font-medium">
                            {commOptions.map((c) => (
                                <StyledCheckbox
                                    key={c}
                                    label={c}
                                    checked={communication.includes(c)}
                                    onChange={() => toggleComm(c)}
                                />
                            ))}
                        </div>
                        <div className="flex flex-wrap">
                            {communication.map((c) => (
                                <Tag key={c} label={c} onRemove={() => toggleComm(c)} />
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-start gap-4">
                    {/* Row 1 - Languages */}
                    <div className="flex flex-wrap gap-2">
                        {languages.map((l) => (
                            <span
                                key={l}
                                className="inline-flex items-center gap-2 bg-[#EDEDED] text-[#353535] px-3 py-1 rounded-md mb-2"
                            >
                                {l}
                            </span>
                        ))}
                    </div>

                    {/* Row 2 - Software */}
                    <div className="flex flex-wrap gap-2">
                        {software.map((s) => (
                            <span
                                key={s}
                                className="inline-flex items-center gap-2 bg-[#EDEDED] text-[#353535] px-3 py-1 rounded-md mb-2"
                            >
                                {s}
                            </span>
                        ))}
                    </div>

                    {/* Row 3 - Communication */}
                    <div className="flex flex-wrap gap-4">
                        {communication.map((c) => (
                            <span
                                key={c}
                                className="inline-flex items-center gap-2 bg-[#EDEDED] text-[#353535] px-3 py-1 rounded-md mb-2"
                            >
                                {c}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SkillsSection;