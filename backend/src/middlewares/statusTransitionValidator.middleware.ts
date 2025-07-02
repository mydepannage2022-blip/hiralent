import { Request, Response, NextFunction } from "express";

const validTransitions = {
  applied: ["shortlisted", "rejected"],
  shortlisted: ["interviewing", "rejected"],
  interviewing: ["hired", "rejected"],
};

export const statusTransitionValidator = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { previousStatus, newStatus } = req.body;

  const allowedNextStatuses =
    (validTransitions as Record<string, string[]>)[previousStatus];

  if (!allowedNextStatuses?.includes(newStatus)) {
    res
      .status(400)
      .json({
        message: `Invalid status transition: ${previousStatus} → ${newStatus}`,
      });
    return; // ✅ return void
  }

  next();
};
