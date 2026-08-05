// src/validation/candidate.jobs.validation.ts
import { Request } from "express";
import { JobListQuery } from "../types/candidate.jobs.types";
import { parsePagination } from "../utils/pagination.util";

const toBool = (v: unknown): boolean | undefined => {
  if (v === undefined) return undefined;
  if (v === "true" || v === true) return true;
  if (v === "false" || v === false) return false;
  return undefined;
};

const toStringArray = (v: unknown): string[] | undefined => {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") {
    return v.split(",").map((x) => x.trim()).filter(Boolean);
  }
  return undefined;
};

export const parseJobListQuery = (req: Request): JobListQuery => {
  const skills = toStringArray(req.query.skills);
  const level = typeof req.query.level === "string" ? req.query.level : undefined;
  const eligible = toBool(req.query.eligible);
  const search = typeof req.query.search === "string" ? req.query.search : undefined;

  // Shared clamp (utils/pagination.util) — cap preserved at 50 for this endpoint.
  const { page, limit } = parsePagination(req.query, { defaultLimit: 20, max: 50 });

  return { skills, level, eligible, search, page, limit };
};

export const parseJobIdParam = (req: Request): string => {
  const jobId = req.params.jobId;
  if (!jobId || typeof jobId !== "string") {
    throw new Error("Invalid jobId");
  }
  return jobId;
};
