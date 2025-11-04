"use client";

import LabeledInput from "./LabeledInput";

interface Props {
    isEditing: boolean;
}

const JobIntroSection = ({ isEditing }: Props) => {
    return isEditing ? (
        <div className="grid grid-cols-1 gap-8 mt-6">
            <LabeledInput label="Job title" required value="User Interface Designer (UI Designer)" />
            <LabeledInput label="Job category" required placeholder="Please type your job category" />
            <LabeledInput label="Organization industry" required placeholder="Please type your organization industry" />
            <LabeledInput label="Organizational level" required placeholder="Please type your Organizational level" />
        </div>
    ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 text-sm text-gray-700">
            <div>
                <p className="text-[#A5A5A5]">Job Title</p>
                <p className="font-medium text-lg">UI Designer</p>
            </div>
            <div>
                <p className="text-[#A5A5A5]">Location</p>
                <p className="font-medium  text-lg">European union</p>
            </div>
            <div>
                <p className="text-[#A5A5A5]">Employment Type</p>
                <p className="font-medium text-lg">Part Time</p>
            </div>
            <div>
                <p className="text-[#A5A5A5]">Job Category</p>
                <p className="font-medium text-lg">UX Designer</p>
            </div>
            <div>
                <p className="text-[#A5A5A5]">Organization Level</p>
                <p className="font-medium text-lg">Specialist</p>
            </div>
        </div>
    );
};

export default JobIntroSection;