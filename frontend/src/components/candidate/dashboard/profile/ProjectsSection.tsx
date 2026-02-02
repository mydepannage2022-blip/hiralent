"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit2,
  FolderGit2,
  X,
  Check,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useUpdateProjects } from "@/src/lib/profile/profile.queries";
import { useProfile } from "@/src/context/ProfileContext";

interface Project {
  id?: string;
  name: string;
  description: string;
  technologies: string[];
  project_url?: string;
  github_url?: string;
  start_date?: string | null;
  end_date?: string | null;
  is_ongoing?: boolean;
  status?: string;
}

type ProjectForm = Project & { _key: string };

function safeJSONParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseProjects(value: any): Project[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as Project[];

  if (typeof value === "string") {
    const parsed = safeJSONParse(value);
    return Array.isArray(parsed) ? (parsed as Project[]) : [];
  }

  return [];
}

function makeKey() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function makeEmptyProject(): ProjectForm {
  return {
    _key: makeKey(),
    name: "",
    description: "",
    technologies: [],
    project_url: "",
    github_url: "",
    start_date: "",
    end_date: "",
    is_ongoing: false,
  };
}

function toFormProjects(input: Project[]): ProjectForm[] {
  return (input ?? []).map((p) => ({
    ...p,
    _key: p.id || makeKey(),
    technologies: Array.isArray(p.technologies) ? p.technologies : [],
    start_date: p.start_date ?? "",
    end_date: p.end_date ?? "",
    project_url: p.project_url ?? "",
    github_url: p.github_url ?? "",
    is_ongoing: !!p.is_ongoing,
  }));
}

function toPayloadProjects(input: ProjectForm[]): Project[] {
  return (input ?? []).map((p) => ({
    id: p.id,
    name: (p.name ?? "").trim(),
    description: (p.description ?? "").trim(),
    technologies: Array.isArray(p.technologies)
      ? p.technologies.map((t) => String(t).trim()).filter(Boolean)
      : [],
    project_url: (p.project_url ?? "").trim(),
    github_url: (p.github_url ?? "").trim(),
    start_date: p.start_date ? String(p.start_date) : "",
    end_date: p.end_date ? String(p.end_date) : "",
    is_ongoing: !!p.is_ongoing,
    status: p.status ? String(p.status) : undefined,
  }));
}

const ProjectsSection = () => {
  const { profileData, refetch } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  const parsedProjects = useMemo(() => {
    return parseProjects((profileData as any)?.projects);
  }, [(profileData as any)?.projects]);

  const [projects, setProjects] = useState<ProjectForm[]>(() =>
    toFormProjects(parsedProjects)
  );

  // Sync when profileData changes (but do NOT overwrite while editing)
  useEffect(() => {
    if (!isEditing) setProjects(toFormProjects(parsedProjects));
  }, [parsedProjects, isEditing]);

  const { mutate: updateProjects, isPending } = useUpdateProjects();

  const handleEdit = () => {
    setIsEditing(true);
    setProjects(toFormProjects(parsedProjects));
  };

  const handleCancel = () => {
    setIsEditing(false);
    setProjects(toFormProjects(parsedProjects));
  };

  const handleSave = () => {
    const payload = toPayloadProjects(projects);

    updateProjects(
      { projects: payload },
      {
        onSuccess: () => {
          setIsEditing(false);
          refetch?.();
        },
      }
    );
  };

  // ✅ This is the FIX: entering edit mode and adding an empty project immediately
  const handleStartAdd = () => {
    setIsEditing(true);
    setProjects((prev) => {
      // if we already have projects in state, keep them
      const base = prev.length ? prev : toFormProjects(parsedProjects);
      // if still empty -> add first blank one
      if (!base.length) return [makeEmptyProject()];
      // otherwise just append a new one
      return [...base, makeEmptyProject()];
    });
  };

  const handleAddProject = () => {
    setProjects((prev) => [...prev, makeEmptyProject()]);
  };

  const handleRemoveProject = (key: string) => {
    setProjects((prev) => prev.filter((p) => p._key !== key));
  };

  const handleProjectChange = (
    key: string,
    field: keyof ProjectForm,
    value: any
  ) => {
    setProjects((prev) =>
      prev.map((p) => (p._key === key ? { ...p, [field]: value } : p))
    );
  };

  const handleTechnologiesChange = (key: string, value: string) => {
    const technologies = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    handleProjectChange(key, "technologies", technologies);
  };

  const hasProjects = Array.isArray(projects) && projects.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <FolderGit2 className="w-3 h-3 lg:w-4 lg:h-4 text-purple-600" />
          </div>
          <h3 className="text-xs lg:text-lg font-semibold text-gray-900">
            Projects
          </h3>
        </div>

        {!isEditing ? (
          <div className="flex items-center gap-2">
            {/* Optional: quick add even when not editing */}
            <button
              onClick={handleStartAdd}
              className="flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              type="button"
            >
              <Plus className="w-3 h-3 lg:w-4 lg:h-4" />
              Add
            </button>

            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              type="button"
            >
              <Edit2 className="w-3 h-3 lg:w-4 lg:h-4" />
              Edit
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              type="button"
            >
              <X className="w-3 h-3 lg:w-4 lg:h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              type="button"
            >
              <Check className="w-3 h-3 lg:w-4 lg:h-4" />
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {!isEditing ? (
        <div>
          {hasProjects ? (
            <div className="space-y-4">
              {projects.map((project) => (
                <motion.div
                  key={project._key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-xs lg:text-sm font-semibold text-gray-900">
                      {project.name || "Untitled project"}
                    </h4>

                    <div className="flex gap-2">
                      {project.github_url ? (
                        <a
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-blue-600"
                          title="GitHub"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : null}

                      {project.project_url ? (
                        <a
                          href={project.project_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-blue-600"
                          title="Live Project"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {project.description ? (
                    <p className="text-xs lg:text-sm text-gray-700 mb-3 leading-relaxed">
                      {project.description}
                    </p>
                  ) : null}

                  {Array.isArray(project.technologies) &&
                  project.technologies.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {project.technologies.map((tech, techIndex) => (
                        <span
                          key={`${project._key}_${tech}_${techIndex}`}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {(project.start_date || project.end_date || project.is_ongoing) ? (
                    <p className="text-xs text-gray-500 mt-2">
                      {project.start_date
                        ? new Date(project.start_date).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })
                        : ""}
                      {" - "}
                      {project.is_ongoing
                        ? "Present"
                        : project.end_date
                        ? new Date(project.end_date).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })
                        : "Present"}
                    </p>
                  ) : null}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-xs lg:text-sm">
                Add your projects to showcase your work
              </p>
              <button
                onClick={handleStartAdd}
                className="mt-3 text-blue-600 text-xs lg:text-sm font-medium hover:text-blue-700"
                type="button"
              >
                Add project
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {projects.map((project, index) => (
              <motion.div
                key={project._key}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <h4 className="text-xs lg:text-sm font-semibold text-gray-700">
                    Project {index + 1}
                  </h4>
                  <button
                    onClick={() => handleRemoveProject(project._key)}
                    className="text-red-600 hover:text-red-700 p-1"
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) =>
                        handleProjectChange(project._key, "name", e.target.value)
                      }
                      className="w-full px-3 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="e.g., E-commerce Platform"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      value={project.description}
                      onChange={(e) =>
                        handleProjectChange(project._key, "description", e.target.value)
                      }
                      rows={3}
                      className="w-full px-3 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                      placeholder="Describe your project..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Technologies (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={
                        Array.isArray(project.technologies)
                          ? project.technologies.join(", ")
                          : ""
                      }
                      onChange={(e) =>
                        handleTechnologiesChange(project._key, e.target.value)
                      }
                      className="w-full px-3 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="e.g., React, Node.js, Docker"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Project URL
                      </label>
                      <input
                        type="url"
                        value={project.project_url || ""}
                        onChange={(e) =>
                          handleProjectChange(project._key, "project_url", e.target.value)
                        }
                        className="w-full px-3 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        GitHub URL
                      </label>
                      <input
                        type="url"
                        value={project.github_url || ""}
                        onChange={(e) =>
                          handleProjectChange(project._key, "github_url", e.target.value)
                        }
                        className="w-full px-3 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="https://github.com/..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={(project.start_date as string) || ""}
                        onChange={(e) =>
                          handleProjectChange(project._key, "start_date", e.target.value)
                        }
                        className="w-full px-3 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={(project.end_date as string) || ""}
                        onChange={(e) =>
                          handleProjectChange(project._key, "end_date", e.target.value)
                        }
                        disabled={!!project.is_ongoing}
                        className="w-full px-3 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100"
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!project.is_ongoing}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            handleProjectChange(project._key, "is_ongoing", checked);
                            if (checked) handleProjectChange(project._key, "end_date", "");
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-700">Ongoing</span>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <button
            onClick={handleAddProject}
            type="button"
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-xs lg:text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Project
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default ProjectsSection;
