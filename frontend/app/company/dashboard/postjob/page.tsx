"use client";

import { useState } from "react";
import SectionCard from "@/src/components/company/dashboard/postjob/SectionCard";
import JobIntroSection from "@/src/components/company/dashboard/postjob/JobIntroSection";
import EmploymentTypeSection from "@/src/components/company/dashboard/postjob/EmploymentTypeSection";
import WorkLocationSection from "@/src/components/company/dashboard/postjob/WorkLocationSection";
import SalarySection from "@/src/components/company/dashboard/postjob/SalarySection";
import PreferredJobBenefitsSection from "@/src/components/company/dashboard/postjob/PreferredJobBenefitsSection";
import JobExecutionConditionsSection from "@/src/components/company/dashboard/postjob/JobExecutionConditionsSection";
import WorkExperienceSection from "@/src/components/company/dashboard/postjob/WorkExperienceSection";
import CompletionRequirementsSection from "@/src/components/company/dashboard/postjob/CompletionRequirementsSection";
import SkillsSection from "@/src/components/company/dashboard/postjob/SkillsSection";
import JobDescriptionSection from "@/src/components/company/dashboard/postjob/JobDescriptionSection";

// icons
import {
  MapPin,
  BriefcaseBusiness,
  SquareUserRound,
  HandCoins,
  FileText,
  Star,
  Users,
  Building,
  IdCard,
  Medal,
} from "lucide-react";

const Page = () => {
  const [employmentTypes, setEmploymentTypes] = useState<string[]>(["Full-time", "Remote"]);
  const [tags, setTags] = useState<string[]>(["Tehran/Iran"]);
  const [editSection, setEditSection] = useState<string | null>(null);

  // track if page needs saving
  const [dirty, setDirty] = useState(false);

  const toggleEmploymentType = (type: string) => {
    setEmploymentTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setDirty(true);
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
    setDirty(true);
  };

  const handleSaveAll = () => {
    console.log("All section changes saved ✅");
    setEditSection(null);
    setDirty(false); // mark everything saved
  };

  const handlePostJob = () => {
    console.log("Job posted 🚀");
  };

  // ---- UI logic ----
  const showSave = dirty || editSection !== null;

  return (
    <div className="max-w-3xl 2xl:max-w-6xl p-2 sm:p-4 bg-white rounded-xl space-y-6">
      {/* Job Intro */}
      <SectionCard
        title="Job Introduction"
        icon={<BriefcaseBusiness className="w-6 h-6" />}
        isEditing={editSection === "job"}
        onToggle={() => {
          setEditSection(editSection === "job" ? null : "job");
          setDirty(true);
        }}
      >
        <JobIntroSection isEditing={editSection === "job"} />
      </SectionCard>

      {/* Employment */}
      <SectionCard
        title="Employment Type"
        icon={<SquareUserRound className="w-6 h-6" />}
        isEditing={editSection === "employment"}
        onToggle={() => {
          setEditSection(editSection === "employment" ? null : "employment");
          setDirty(true);
        }}
      >
        <EmploymentTypeSection
          isEditing={editSection === "employment"}
          employmentTypes={employmentTypes}
          toggleEmploymentType={toggleEmploymentType}
        />
      </SectionCard>

      {/* Work Location */}
      <SectionCard
        title="Work Location"
        icon={<MapPin className="w-6 h-6" />}
        isEditing={editSection === "location"}
        onToggle={() => {
          setEditSection(editSection === "location" ? null : "location");
          setDirty(true);
        }}
      >
        <WorkLocationSection
          isEditing={editSection === "location"}
          tags={tags}
          removeTag={removeTag}
        />
      </SectionCard>

      {/* Salary */}
      <SectionCard
        title="Salary & Benefits"
        icon={<HandCoins className="w-6 h-6" />}
        isEditing={editSection === "salary"}
        onToggle={() => {
          setEditSection(editSection === "salary" ? null : "salary");
          setDirty(true);
        }}
      >
        <SalarySection isEditing={editSection === "salary"} />
      </SectionCard>

      {/* Preferred Benefits */}
      <SectionCard
        title="Preferred Job Benefits"
        icon={<Star className="w-6 h-6" />}
        isEditing={editSection === "benefits"}
        onToggle={() => {
          setEditSection(editSection === "benefits" ? null : "benefits");
          setDirty(true);
        }}
      >
        <PreferredJobBenefitsSection isEditing={editSection === "benefits"} />
      </SectionCard>

      {/* Job Execution Conditions */}
      <SectionCard
        title="Job Execution Conditions"
        icon={<Users className="w-6 h-6" />}
        isEditing={editSection === "execution"}
        onToggle={() => {
          setEditSection(editSection === "execution" ? null : "execution");
          setDirty(true);
        }}
      >
        <JobExecutionConditionsSection isEditing={editSection === "execution"} />
      </SectionCard>

      {/* Work Experience */}
      <SectionCard
        title="Work Experience"
        icon={<Building className="w-6 h-6" />}
        isEditing={editSection === "experience"}
        onToggle={() => {
          setEditSection(editSection === "experience" ? null : "experience");
          setDirty(true);
        }}
      >
        <WorkExperienceSection isEditing={editSection === "experience"} />
      </SectionCard>

      {/* Completion Requirements */}
      <SectionCard
        title="Completion Requirements"
        icon={<IdCard className="w-6 h-6" />}
        isEditing={editSection === "completion"}
        onToggle={() => {
          setEditSection(editSection === "completion" ? null : "completion");
          setDirty(true);
        }}
      >
        <CompletionRequirementsSection isEditing={editSection === "completion"} />
      </SectionCard>

      {/* Skills */}
      <SectionCard
        title="Skills"
        icon={<Medal className="w-6 h-6" />}
        isEditing={editSection === "skills"}
        onToggle={() => {
          setEditSection(editSection === "skills" ? null : "skills");
          setDirty(true);
        }}
      >
        <SkillsSection isEditing={editSection === "skills"} />
      </SectionCard>

      {/* Job Description */}
      <SectionCard
        title="Job Description"
        icon={<FileText className="w-6 h-6" />}
        isEditing={editSection === "description"}
        onToggle={() => {
          setEditSection(editSection === "description" ? null : "description");
          setDirty(true);
        }}
      >
        <JobDescriptionSection isEditing={editSection === "description"} />
      </SectionCard>

      {/* Footer button */}
      <div className="mt-8">
        {showSave ? (
          <button
            onClick={handleSaveAll}
            className="bg-[#282828] text-white px-18 py-2 rounded-md font-medium hover:opacity-90 transition-colors w-auto max-w-lg"
          >
            Save
          </button>
        ) : (
          <button
            onClick={handlePostJob}
            className="bg-[#282828] text-white px-18 py-2 rounded-md font-medium hover:opacity-90 transition-colors w-auto max-w-max"
          >
            Post Job
          </button>
        )}
      </div>
    </div>
  );
};

export default Page;