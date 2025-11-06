"use client";

import StyledCheckbox from "./StyledCheckbox";
import Tag from "./Tag";

interface Props {
    isEditing: boolean;
    employmentTypes: string[];
    toggleEmploymentType: (type: string) => void;
}

const EmploymentTypeSection = ({ isEditing, employmentTypes, toggleEmploymentType }: Props) => {
    return isEditing ? (
        <>
            <div className="flex flex-wrap gap-4">
                {["Full-time", "Part-time", "Remote", "Internship"].map((type) => (
                    <StyledCheckbox
                        key={type}
                        label={type}
                        checked={employmentTypes.includes(type)}
                        onChange={() => toggleEmploymentType(type)}
                    />
                ))}
            </div>
            <div className="mt-5 flex flex-wrap">
                {employmentTypes.map((type) => (
                    <Tag key={type} label={type} onRemove={() => toggleEmploymentType(type)} />
                ))}
            </div>
        </>
    ) : (
        <div className="flex gap-4 flex-wrap">
            {employmentTypes.map((type) => (
                <span
                    key={type}
                    className="inline-flex items-center gap-2 bg-[#EDEDED] text-[#353535] px-3 py-1 rounded-md mb-2"
                >
                    {type}
                </span>
            ))}
        </div>
    );
};

export default EmploymentTypeSection;