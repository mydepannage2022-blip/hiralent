"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, FolderGit2, X, Check, Plus, Trash2, ExternalLink } from "lucide-react";
import { useUpdateProjects } from "@/src/lib/profile/profile.queries";
import { useProfile } from "@/src/context/ProfileContext";

interface Project {
  id?: string;
  name: string;
  description: string;
  technologies: string[];
  project_url?: string;
  github_url?: string;
  start_date?: string;
  end_date?: string;
  is_ongoing?: boolean;
  status?: string;
}

function parseProjects(value: any): Project[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as Project[];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as Project[]) : [];
    } catch (e) {
      console.error("Failed to parse projects JSON:", e);
      return [];
    }
  }
  return [];
}

const ProjectsSection = () => {
  const { profileData, refetch } = useProfile();
  const [isEditing, setIsEditing] = useState(false);

  // ✅ Always normalize to array (because DB stores JSON string sometimes)
  const parsedProjects = useMemo(() => {
    return parseProjects((profileData as any)?.projects);
  }, [profileData]);

  const [projects, setProjects] = useState<Project[]>(parsedProjects);

  // ✅ Sync when profileData changes (autofill/apply/refetch)
  useEffect(() => {
    if (!isEditing) setProjects(parsedProjects);
  }, [parsedProjects, isEditing]);

  const { mutate: updateProjects, isPending } = useUpdateProjects();

  const handleEdit = () => {
    setIsEditing(true);
    setProjects(parsedProjects);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setProjects(parsedProjects);
  };

  const handleSave = () => {
    updateProjects(
      { projects }, // send array, backend can stringify
      {
        onSuccess: () => {
          setIsEditing(false);
          refetch?.();
        },
      }
    );
  };

  const handleAddProject = () => {
    setProjects((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        technologies: [],
        project_url: "",
        github_url: "",
        start_date: "",
        end_date: "",
        is_ongoing: false,
      },
    ]);
  };

  const handleRemoveProject = (index: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProjectChange = (index: number, field: keyof Project, value: any) => {
    setProjects((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleTechnologiesChange = (index: number, value: string) => {
    const technologies = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    handleProjectChange(index, "technologies", technologies);
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
          <h3 className="text-xs lg:text-lg font-semibold text-gray-900">Projects</h3>
        </div>

        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-3 py-1.5 text-xs lg:text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-3 h-3 lg:w-4 lg:h-4" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3 lg:w-4 lg:h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs lg:text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
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
              {projects.map((project, index) => (
                <motion.div
                  key={index}
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

                  {Array.isArray(project.technologies) && project.technologies.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {project.technologies.map((tech, techIndex) => (
                        <span
                          key={techIndex}
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
                onClick={handleEdit}
                className="mt-3 text-blue-600 text-xs lg:text-sm font-medium hover:text-blue-700"
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
                key={index}
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
                    onClick={() => handleRemoveProject(index)}
                    className="text-red-600 hover:text-red-700 p-1"
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
                      onChange={(e) => handleProjectChange(index, "name", e.target.value)}
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
                        handleProjectChange(index, "description", e.target.value)
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
                      value={Array.isArray(project.technologies) ? project.technologies.join(", ") : ""}
                      onChange={(e) => handleTechnologiesChange(index, e.target.value)}
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
                          handleProjectChange(index, "project_url", e.target.value)
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
                          handleProjectChange(index, "github_url", e.target.value)
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
                        value={project.start_date || ""}
                        onChange={(e) =>
                          handleProjectChange(index, "start_date", e.target.value)
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
                        value={project.end_date || ""}
                        onChange={(e) =>
                          handleProjectChange(index, "end_date", e.target.value)
                        }
                        disabled={project.is_ongoing}
                        className="w-full px-3 py-2 text-xs lg:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100"
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={project.is_ongoing || false}
                          onChange={(e) => {
                            handleProjectChange(index, "is_ongoing", e.target.checked);
                            if (e.target.checked) handleProjectChange(index, "end_date", "");
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