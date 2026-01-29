import { Request, Response } from "express";
import { APIResponse } from "../../../types/candidate.types";
import * as certService from "../../../services/candidate/profile/certification.service";

export const listCertificationsController = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);

    const rows = await certService.listCandidateCertifications(req.user.user_id);
    return res.status(200).json({ success: true, data: rows, message: "Certifications fetched" } as APIResponse);
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e.message || "Failed to fetch certifications", error: e.message } as APIResponse);
  }
};

export const addCertificationController = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);

    const created = await certService.addCandidateCertification(req.user.user_id, req.body);
    return res.status(201).json({ success: true, data: created, message: "Certification added" } as APIResponse);
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e.message || "Failed to add certification", error: e.message } as APIResponse);
  }
};

export const deleteCertificationController = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);

    const { certificationId } = req.params;
    if (!certificationId) return res.status(400).json({ success: false, message: "certificationId is required" } as APIResponse);

    const result = await certService.deleteCandidateCertification(req.user.user_id, certificationId);
    return res.status(200).json({ success: true, data: result, message: "Certification deleted" } as APIResponse);
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e.message || "Failed to delete certification", error: e.message } as APIResponse);
  }
};

// ✅ THIS IS THE IMPORTANT ONE FOR YOUR CURRENT UI
export const bulkUpsertCertificationsController = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);

    const rows = await certService.upsertCandidateCertificationsBulk(req.user.user_id, req.body.certifications || []);
    return res.status(200).json({ success: true, data: rows, message: "Certifications updated" } as APIResponse);
  } catch (e: any) {
    return res.status(400).json({ success: false, message: e.message || "Failed to update certifications", error: e.message } as APIResponse);
  }
};
