"use client";

import { useState } from "react";
import LabeledInput from "./LabeledInput";
import StyledCheckbox from "./StyledCheckbox";
import Tag from "./Tag";

interface Props {
    isEditing: boolean;
}

const JobExecutionConditionsSection = ({ isEditing }: Props) => {
    const [minAge, setMinAge] = useState("21");
    const [maxAge, setMaxAge] = useState("");
    const [gender, setGender] = useState("Female");

    const removeTag = (val: string) => {
        if (val === gender) setGender("");
        if (val === `${minAge} years old`) setMinAge("");
        if (val === `${maxAge} years old`) setMaxAge("");
    };

    return isEditing ? (
        <div className="space-y-6">
            {/* Age inputs */}
            <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <LabeledInput
                        label="Minimum Age"
                        type="number"
                        value={minAge}
                        required
                        placeholder="Enter min age"
                    />
                    <LabeledInput
                        label="Maximum Age"
                        type="number"
                        value={maxAge}
                        required
                        placeholder="Enter max age"
                    />
                </div>

                {/* Age tags */}
                <div className="flex flex-wrap gap-2 mt-4">
                    {minAge && (
                        <Tag
                            label={`${minAge} years old`}
                            onRemove={() => removeTag(`${minAge} years old`)}
                        />
                    )}
                    {maxAge && (
                        <Tag
                            label={`${maxAge} years old`}
                            onRemove={() => removeTag(`${maxAge} years old`)}
                        />
                    )}
                </div>
            </div>

            {/* Gender options */}
            <div>
                <h3 className="font-medium text-black mb-8 text-lg">Gender</h3>
                <div className="flex gap-4 flex-wrap">
                    {["Female", "Male", "Other"].map((g) => (
                        <StyledCheckbox
                            key={g}
                            label={g}
                            checked={gender === g}
                            onChange={() => setGender(g)}
                        />
                    ))}
                </div>

                {/* Gender tag */}
                <div className="flex flex-wrap gap-2 mt-6">
                    {gender && (
                        <Tag label={gender} onRemove={() => removeTag(gender)} />
                    )}
                </div>
            </div>
        </div>
    ) : (
        <div className="space-y-4">
            {/* Age row */}
            <div className="flex flex-wrap gap-2">
                {minAge && (
                    <span className="inline-flex items-center gap-2 bg-[#EDEDED] text-[#353535] px-3 py-1 rounded-md mb-2">
                        {minAge} years old
                    </span>
                )}
                {maxAge && (
                    <span className="inline-flex items-center gap-2 bg-[#EDEDED] text-[#353535] px-3 py-1 rounded-md mb-2">
                        {maxAge} years old
                    </span>
                )}
            </div>

            {/* Gender row */}
            <div>
                <h3 className="font-medium text-black mb-4 text-lg">Gender</h3>
                {gender && (
                    <span className="inline-flex items-center gap-2 bg-[#EDEDED] text-[#353535] px-3 py-1 rounded-md mb-2">
                        {gender}
                    </span>
                )}
            </div>
        </div>
    );
};

export default JobExecutionConditionsSection;