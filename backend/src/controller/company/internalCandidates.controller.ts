import { Request, Response } from "express";
import prisma from '../../lib/prisma';
import { InternalCandidatesService } from "../../services/company/internalCandidates.service";

const service = new InternalCandidatesService(prisma);

export async function getInternalCandidateDetailsForCompany(req: Request, res: Response) {
  try {
    const candidateId = String(req.params.candidateId);

    const profile = await service.getFullCandidateProfile(candidateId);

    if (!profile) {
      return res.status(404).json({ message: "Candidate not found." });
    }

    return res.json(profile);
  } catch (err) {
    console.error("getInternalCandidateDetailsForCompany:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
