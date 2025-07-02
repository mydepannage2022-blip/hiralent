import { Request, Response } from "express";
import * as JobService from "../services/job.service";

export const createJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const recruiter_id = req.user!.user_id;
    const data = req.validatedBody;

    const job = await JobService.createJob(recruiter_id, data);

    res.status(201).json({ message: "Job created", job });
  } catch (error) {
    res.status(500).json({ message: "Failed to create job", error });
  }
};

export const updateJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const job = await JobService.updateJob(req.params.id, req.validatedBody);

    res.json({ message: "Job updated", job });
  } catch (error) {
    res.status(500).json({ message: "Failed to update job", error });
  }
};
