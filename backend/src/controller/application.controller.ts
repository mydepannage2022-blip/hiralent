import { Request, Response } from "express";
import * as ApplicationService from "../services/application.service";
import { extractFileMetadata } from "../utils/fileMetaExtractor.util";
import { mongo } from "../lib/mongo";

export const submitApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const metadata = extractFileMetadata(req.file!, req.user!.user_id);
    await mongo.collection("cvMetadata").insertOne(metadata);

    const app = await ApplicationService.createApplication({
      candidate_id: req.user!.user_id,
      job_id: req.body.job_id,
      cover_letter: req.body.cover_letter,
    });

    res.status(201).json({ message: "Application submitted", application: app });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit application", error });
  }
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const app = await ApplicationService.updateApplicationStatus(
      req.params.id,
      req.body.newStatus
    );

    res.json({ message: "Status updated", application: app });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status", error });
  }
};
