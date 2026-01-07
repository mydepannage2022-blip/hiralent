// src/controller/candidate/jobs.controller.ts
import { Request, Response } from "express";
import { CandidateJobsService } from "../../services/candidate/jobs.service";
import { parseJobIdParam, parseJobListQuery } from "../../validation/candidate.jobs.validation";

const getAuthUserId = (req: Request) => {
  const userId = req.user?.user_id;
  if (!userId) throw new Error("Unauthorized");
  return userId;
};

export class CandidateJobsController {
  constructor(private service: CandidateJobsService) {}

  listJobs = async (req: Request, res: Response) => {
    const candidateId = getAuthUserId(req);
    const query = parseJobListQuery(req);
    const result = await this.service.getJobs(candidateId, query);
    res.json(result);
  };

  listRecommendedJobs = async (req: Request, res: Response) => {
    const candidateId = getAuthUserId(req);
    const query = parseJobListQuery(req);
    const result = await this.service.getRecommendedJobs(candidateId, query);
    res.json(result);
  };

  getEligibility = async (req: Request, res: Response) => {
    const candidateId = getAuthUserId(req);
    const jobId = parseJobIdParam(req);
    const result = await this.service.computeEligibility(candidateId, jobId);
    res.json(result);
  };

  apply = async (req: Request, res: Response) => {
    const candidateId = getAuthUserId(req);
    const jobId = parseJobIdParam(req);
    const result = await this.service.applyToJob(candidateId, jobId, {
      cover_letter: req.body?.cover_letter,
    });
    res.status(201).json(result);
  };
}
