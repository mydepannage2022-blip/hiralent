"use client";

import React, { useState } from "react";
import { Building2 } from "lucide-react";
import SectionCard1 from "./SectionCard1";
import LabeledInput from "./LabeledInput";

const CompanyInfoSection: React.FC = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [company, setCompany] = useState({
        name: "Hiralent",
        industry: "Recruitment",
        website: "https://hiralent.com",
    });

    const [form, setForm] = useState(company);

    const handleEditClick = () => {
        setForm(company);
        setIsEditing(true);
    };

    const handleSave = () => {
        setCompany(form);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setForm(company);
        setIsEditing(false);
    };

    return (
        <SectionCard1
            title="Company Info"
            icon={<Building2 className="w-5 h-5" />}
            isEditing={isEditing}
            onEditClick={handleEditClick}
        >
            {isEditing ? (
                <form className="" onSubmit={(e) => e.preventDefault()}>
                    <div className="space-y-3 sm:space-y-6 grid sm:grid-cols-2 gap-4">
                        <LabeledInput
                            label="Company Name"
                            value={form.name}
                            required
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        />
                        <LabeledInput
                            label="Industry"
                            value={form.industry}
                            required
                            onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}
                        />
                    </div>
                    <div className="mt-7 sm:mt-0">
                        <LabeledInput
                            label="Website"
                            value={form.website}
                            onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                        />
                    </div>

                    <div className="flex gap-2 mt-5">
                        <button
                            type="button"
                            onClick={handleSave}
                            className="bg-[#005DDC] text-white px-6 py-1.5 rounded-md text-sm font-medium"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="text-[#515151] text-sm px-6 py-1.5 rounded-md hover:border hover:border-[#515151] font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <p className="font-medium">Company Name</p>
                        <p className="text-[#757575]">{company.name}</p>
                    </div>
                    <div>
                        <p className="font-medium">Industry</p>
                        <p className="text-[#757575]">{company.industry}</p>
                    </div>
                    <div>
                        <p className="font-medium">Website</p>
                        <p className="text-[#757575]">{company.website}</p>
                    </div>
                </div>
            )}
        </SectionCard1>
    );
};

export default CompanyInfoSection;