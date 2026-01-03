import { Request, Response } from "express";
import {
  createSourcingRunService,
  addRunItemService,
  completeSourcingRunService,
} from "../../../services/company/internal/sourcingRuns.service";

export async function createSourcingRun(req: Request, res: Response) {
  try {
    const result = await createSourcingRunService(req.body);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({
      message: "Create sourcing run failed",
      error: err?.message ?? String(err),
    });
  }
}

export async function addSourcingRunItem(req: Request, res: Response) {
  try {
    const run_id = String(req.params.run_id);
    const result = await addRunItemService(run_id, req.body);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({
      message: "Add run item failed",
      error: err?.message ?? String(err),
    });
  }
}

export async function completeSourcingRun(req: Request, res: Response) {
  try {
    const run_id = String(req.params.run_id);
    const result = await completeSourcingRunService(run_id, req.body);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({
      message: "Complete sourcing run failed",
      error: err?.message ?? String(err),
    });
  }
}
