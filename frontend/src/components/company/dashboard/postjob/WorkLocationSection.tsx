"use client";

import LabeledInput from "./LabeledInput";
import Tag from "./Tag";

interface Props {
    isEditing: boolean;
    tags: string[];
    removeTag: (tag: string) => void;
}

const WorkLocationSection = ({ isEditing, tags, removeTag }: Props) => {
    return isEditing ? (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LabeledInput label="Country" required value="Iran" />
                <LabeledInput label="City" required value="Tehran" />
            </div>
            <div className="mt-5 flex flex-wrap">
                {tags.map((tag) => (
                    <Tag key={tag} label={tag} onRemove={() => removeTag(tag)} />
                ))}
            </div>
        </>
    ) : (
        <div className="flex flex-wrap gap-2">
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

export default WorkLocationSection;