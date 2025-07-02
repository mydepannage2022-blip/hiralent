import { Request, Response, NextFunction } from "express";

const validTransitions = {
  applied: ["shortlisted", "rejected"],
  shortlisted: ["interviewing", "rejected"],
  interviewing: ["hired", "rejected"],
};

export const statusTransitionValidator = async (req: Request, res: Response, next: NextFunction) => {
  const { previousStatus, newStatus } = req.body;

  const allowedNextStatuses = (validTransitions as Record<string, string[]>)[previousStatus];

  if (!allowedNextStatuses?.includes(newStatus)) {
    return res
      .status(400)
      .json({ message: `Invalid status transition: ${previousStatus} → ${newStatus}` });
  }

  next();
};
