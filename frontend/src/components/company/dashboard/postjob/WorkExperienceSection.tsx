"use client";
import { useState } from "react";
import StyledCheckbox from "./StyledCheckbox";
import Tag from "./Tag";

interface Props {
    isEditing: boolean;
}

const WorkExperienceSection = ({ isEditing }: Props) => {
    const expOptions = ["No experience", "Less than 1 year", "1-3 year", "+3 year"];
    const prefOptions = [
        "Experience in sales, shopping centers, or stores is preferred",
        "Accepting interns and beginners",
    ];

    const [experience, setExperience] = useState<string[]>(["Less than 1 year"]);
    const [preferences, setPreferences] = useState<string[]>([
        "Experience in sales, shopping centers, or stores is preferred",
    ]);

    const toggle = (list: string[], setList: (x: string[]) => void, val: string) => {
        setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
    };

    return (
        <div>
            {isEditing ? (
                <>
                    {/* Experience options */}
                    <div className="flex flex-wrap gap-4 mb-6 font-medium">
                        {expOptions.map((o) => (
                            <StyledCheckbox
                                key={o}
                                label={o}
                                checked={experience.includes(o)}
                                onChange={() => toggle(experience, setExperience, o)}
                            />
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-8">
                        {experience.map((e) => (
                            <Tag key={e} label={e} onRemove={() => toggle(experience, setExperience, e)} />
                        ))}
                    </div>

                    {/* Preferences */}
                    <div className="flex flex-col gap-6 mb-6">
                        {prefOptions.map((p) => (
                            <StyledCheckbox
                                key={p}
                                label={p}
                                checked={preferences.includes(p)}
                                onChange={() => toggle(preferences, setPreferences, p)}
                            />
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {preferences.map((p) => (
                            <Tag key={p} label={p} onRemove={() => toggle(preferences, setPreferences, p)} />
                        ))}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-start gap-6">
                    {[...experience, ...preferences].map((val) => (
                        <span
                            key={val}
                            className="inline-flex items-center gap-2 bg-[#EDEDED] text-[#353535] px-3 py-1 rounded-md mb-2"
                        >
                            {val}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WorkExperienceSection;