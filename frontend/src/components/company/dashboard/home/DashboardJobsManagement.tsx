"use client";

import React, { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

/** ====== Types locaux (pas d'import externe) ====== */
type JobStatus = "ACTIVE" | "DRAFT" | "PAUSED" | "CLOSED" | "CANCELLED" | "ARCHIVED";

type CompanyJob = {
  job_id: string;
  title: string;
  location: string;
  description: string;
  salary_range: string | null;
  required_skills: string[];
  status: JobStatus;
  job_type: "full_time" | "part_time" | "contract" | "internship" | null;
  department: string | null;
};

/** ====== Données mockées (front-only) ====== */
const MOCK_JOBS: CompanyJob[] = [
  {
    job_id: "j1",
    title: "Senior Frontend Developer",
    location: "Casablanca · Hybrid",
    description: "Build and ship delightful UI with React + TypeScript.",
    salary_range: "$80k – $110k",
    required_skills: ["React", "TypeScript", "UI/UX"],
    status: "ACTIVE",
    job_type: "full_time",
    department: "Engineering",
  },
  {
    job_id: "j2",
    title: "Backend Engineer (Node.js)",
    location: "Remote",
    description: "Design scalable APIs and services.",
    salary_range: "$75k – $105k",
    required_skills: ["Node.js", "PostgreSQL", "Prisma"],
    status: "PAUSED",
    job_type: "full_time",
    department: "Platform",
  },
  {
    job_id: "j3",
    title: "Data Analyst Intern",
    location: "Rabat · On site",
    description: "Help the BI team with dashboards and insights.",
    salary_range: "—",
    required_skills: ["SQL", "Power BI"],
    status: "DRAFT",
    job_type: "internship",
    department: "Data",
  },
];

/** ====== Composant UI ====== */
type StatusFilter = "ALL" | JobStatus;

const JobsManagement: React.FC = () => {
  // état local (au lieu d'un fetch/api)
  const [jobs, setJobs] = useState<CompanyJob[]>(MOCK_JOBS);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const filteredJobs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return jobs.filter((j) => {
      const matchesSearch =
        !term ||
        j.title.toLowerCase().includes(term) ||
        (j.location?.toLowerCase() ?? "").includes(term) ||
        (j.department?.toLowerCase() ?? "").includes(term);
      const matchesStatus = statusFilter === "ALL" || j.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchTerm, statusFilter]);

  // handlers fake (front only)
  const handleCreateJob = () => {
    // exemple d’ajout local
    const id = `j${jobs.length + 1}`;
    setJobs([
      ...jobs,
      {
        job_id: id,
        title: `New Job #${jobs.length + 1}`,
        location: "—",
        description: "Draft job created locally.",
        salary_range: null,
        required_skills: [],
        status: "DRAFT",
        job_type: null,
        department: null,
      },
    ]);
  };
  const handleEdit = (job: CompanyJob) => alert(`Edit (front only): ${job.title}`);
  const handleDelete = (job: CompanyJob) =>
    setJobs((prev) => prev.filter((j) => j.job_id !== job.job_id));
  const handleCreateAssessment = (job: CompanyJob) =>
    alert(`Create Assessment (front only): ${job.title}`);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Management</h1>
          <p className="text-gray-600">Manage your job postings (front-only demo)</p>
        </div>
        <button
          onClick={handleCreateJob}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} />
          Post New Job
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-gray-600 text-sm">Total Jobs</p>
          <p className="text-2xl font-bold">{jobs.length}</p>
          <p className="text-green-600 text-sm">▲ sample</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-gray-600 text-sm">Active Jobs</p>
          <p className="text-2xl font-bold">{jobs.filter((j) => j.status === "ACTIVE").length}</p>
          <p className="text-green-600 text-sm">▲ sample</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-gray-600 text-sm">Total Applications</p>
          <p className="text-2xl font-bold">—</p>
          <p className="text-green-600 text-sm">▲ sample</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <p className="text-gray-600 text-sm">Assessments Created</p>
          <p className="text-2xl font-bold">—</p>
          <p className="text-blue-600 text-sm">Create more</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search jobs..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="PAUSED">Paused</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredJobs.map((job) => (
                <tr key={job.job_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{job.title}</p>
                      <p className="text-sm text-gray-500">
                        {job.job_type ?? "—"} • {job.department ?? "—"}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        job.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : job.status === "PAUSED"
                          ? "bg-yellow-100 text-yellow-800"
                          : job.status === "CLOSED"
                          ? "bg-gray-200 text-gray-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{job.location}</td>
                  <td className="px-6 py-4">{job.salary_range ?? "—"}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCreateAssessment(job)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        Create Assessment
                      </button>
                      <button className="px-3 py-1 rounded border" onClick={() => handleEdit(job)}>
                        Edit
                      </button>
                      <button
                        className="px-3 py-1 rounded border text-red-600"
                        onClick={() => handleDelete(job)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredJobs.length === 0 && (
                <tr>
                  <td className="px-6 py-10 text-center text-gray-500" colSpan={5}>
                    No jobs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default JobsManagement;
