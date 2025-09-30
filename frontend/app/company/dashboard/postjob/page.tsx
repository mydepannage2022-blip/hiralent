"use client";

import { useState } from "react";
import SectionCard from "@/src/components/company/dashboard/postjob/SectionCard";
import LabeledInput from "@/src/components/company/dashboard/postjob/LabeledInput";
import CheckboxButton from "@/src/components/company/dashboard/postjob/CheckboxButton";
import Tag from "@/src/components/company/dashboard/postjob/Tag";

const page = () => {
  const [employmentTypes, setEmploymentTypes] = useState<string[]>(["Full-time", "Remote"]);
  const [tags, setTags] = useState<string[]>(["Tehran/Iran"]);
  const [salaryVisible, setSalaryVisible] = useState(true);

  const toggleEmploymentType = (type: string) => {
    setEmploymentTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  return (
    <div className="max-w-3xl px-4 py-8 bg-white rounded-xl">
      {/* 1. Job Introduction */}
      <SectionCard title="Job Introduction">
        <div className="grid grid-cols-1 gap-4">
          <LabeledInput label="Job title" required placeholder="User Interface Designer (UI Designer)" />
          <LabeledInput label="Job category" required placeholder="Please type your job category" />
          <LabeledInput label="Organization industry" required placeholder="Please type your organization industry" />
          <LabeledInput label="Organizational level" required placeholder="Please type your organizational level" />
        </div>
      </SectionCard>

      {/* 2. Employment Type */}
      <SectionCard title="Employment Type">
        <div className="flex flex-wrap">
          {["Full-time", "Part-time", "Remote", "Internship"].map((type) => (
            <CheckboxButton
              key={type}
              label={type}
              checked={employmentTypes.includes(type)}
              onChange={() => toggleEmploymentType(type)}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap">
          {employmentTypes.map((type) => (
            <Tag key={type} label={type} onRemove={() => toggleEmploymentType(type)} />
          ))}
        </div>
      </SectionCard>

      {/* 3. Work Location */}
      <SectionCard title="Work Location">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabeledInput label="Country" required placeholder="Iran" />
          <LabeledInput label="City" required placeholder="Tehran" />
        </div>
        <div className="mt-3 flex flex-wrap">
          {tags.map((tag) => (
            <Tag key={tag} label={tag} onRemove={() => removeTag(tag)} />
          ))}
        </div>
      </SectionCard>

      {/* 4. Salary & Benefits */}
      <SectionCard title="Salary & Benefits">
        <LabeledInput label="Minimum Salary Amount" required placeholder="5000$" type="number" />

        <div className="mt-3 text-sm text-gray-600">
          <p>💡 What is the fair salary range for this field?</p>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <input
            id="displaySalary"
            type="checkbox"
            checked={salaryVisible}
            onChange={() => setSalaryVisible(!salaryVisible)}
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
          />
          <label htmlFor="displaySalary" className="text-sm text-gray-700">
            Displaying salary in the job post
          </label>
        </div>

        <p className="mt-2 text-sm text-red-500">
          Job postings that transparently display their fair salary receive 45% more resumes on
          average.
        </p>

        {salaryVisible && (
          <div className="mt-3 flex flex-wrap">
            <Tag label="5000$" onRemove={() => { }} />
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default page;