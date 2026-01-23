import { Request } from "express";

export const parseApplicationIdParam = (req: Request): string => {
  const id = req.params.id;
  if (!id || typeof id !== "string") {
    throw new Error("Invalid application id");
  }
  return id;
};
