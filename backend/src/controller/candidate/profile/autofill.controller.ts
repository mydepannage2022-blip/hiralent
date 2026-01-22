// src/controller/candidate/profile/autofill.controller.ts
import { Request, Response } from "express";
import { autofillService } from "../../../services/candidate/profile/autofill.service";
import { APIResponse } from "../../../types/candidate.types";

export const createAutofillPreviewController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);
      return;
    }

    const { document_id } = req.body;
    if (!document_id) {
      res.status(400).json({ success: false, message: "document_id is required" } as APIResponse);
      return;
    }

    const result = await autofillService.createPreviewSession(req.user.user_id, document_id);

    // ✅ tell frontend this is retryable
    if (!result.success && result.error === "EXTRACTION_NOT_READY") {
      res.status(409).json(result as any);
      return;
    }

    res.status(result.success ? 201 : 400).json(result as any);
  } catch (error: any) {
    console.error("createAutofillPreviewController error:", error);
    res.status(500).json({ success: false, message: "Failed to create autofill preview", error: error.message } as APIResponse);
  }
};

export const confirmAutofillMappingController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);
      return;
    }

    const { session_id, mapping_id, confirmed_value } = req.body;
    if (!session_id || !mapping_id) {
      res.status(400).json({ success: false, message: "session_id and mapping_id are required" } as APIResponse);
      return;
    }

    const result = await autofillService.confirmMapping(req.user.user_id, session_id, mapping_id, confirmed_value);
    res.status(result.success ? 200 : 400).json(result as any);
  } catch (error: any) {
    console.error("confirmAutofillMappingController error:", error);
    res.status(500).json({ success: false, message: "Failed to confirm mapping", error: error.message } as APIResponse);
  }
};

export const applyAutofillController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" } as APIResponse);
      return;
    }

    const { session_id } = req.body;
    if (!session_id) {
      res.status(400).json({ success: false, message: "session_id is required" } as APIResponse);
      return;
    }

    const result = await autofillService.applyConfirmedFields(req.user.user_id, session_id);
    res.status(result.success ? 200 : 400).json(result as any);
  } catch (error: any) {
    console.error("applyAutofillController error:", error);
    res.status(500).json({ success: false, message: "Failed to apply autofill", error: error.message } as APIResponse);
  }
};