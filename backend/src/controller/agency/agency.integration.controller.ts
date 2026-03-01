import { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/checkAuth.middleware";
import {
  bootstrapIntegrationServicesForCase,
  getUserAgencyInfoForIntegration,
  listIntegrationServicesForCase,
  updateIntegrationServiceForCase,
  verifyCaseForIntegrationAgency,
} from "../../services/agency/agency.integration.service";

/**
 * GET /api/v1/agency/cases/:caseId/integration-services
 * Integration agency: list integration services for the case.
 */
export const getIntegrationServicesForCase = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.caseId as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await getUserAgencyInfoForIntegration(userId);

    if (!user?.agency_id || user.agency?.type !== "INTEGRATION") {
      return res.status(403).json({
        success: false,
        message: "Only integration agencies can access integration services",
      });
    }

    const caseData = await verifyCaseForIntegrationAgency(caseId, user.agency_id);
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not assigned to your agency",
      });
    }

    const services = await listIntegrationServicesForCase(caseId);
    return res.status(200).json({ success: true, data: services, count: services.length });
  } catch (error) {
    console.error("Get integration services error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch integration services" });
  }
};

/**
 * POST /api/v1/agency/cases/:caseId/integration-services/bootstrap
 * Create the default 6 integration services if they are missing.
 */
export const bootstrapIntegrationServices = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.caseId as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await getUserAgencyInfoForIntegration(userId);
    if (!user?.agency_id || user.agency?.type !== "INTEGRATION") {
      return res.status(403).json({
        success: false,
        message: "Only integration agencies can bootstrap integration services",
      });
    }

    const caseData = await verifyCaseForIntegrationAgency(caseId, user.agency_id);
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not assigned to your agency",
      });
    }

    const result = await bootstrapIntegrationServicesForCase(caseId);
    return res.status(200).json({
      success: true,
      message: result.created > 0 ? "Integration checklist created" : "Integration checklist already exists",
      data: result.services,
      created: result.created,
    });
  } catch (error) {
    console.error("Bootstrap integration services error:", error);
    return res.status(500).json({ success: false, message: "Failed to bootstrap integration services" });
  }
};

/**
 * PUT /api/v1/agency/cases/:caseId/integration-services/:serviceId
 * Update a single integration service.
 */
export const updateIntegrationService = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.caseId as string;
    const serviceId = req.params.serviceId as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await getUserAgencyInfoForIntegration(userId);
    if (!user?.agency_id || user.agency?.type !== "INTEGRATION") {
      return res.status(403).json({
        success: false,
        message: "Only integration agencies can update integration services",
      });
    }

    const caseData = await verifyCaseForIntegrationAgency(caseId, user.agency_id);
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not assigned to your agency",
      });
    }

    const { status, service_date, notes, proof_document } = req.body;

    const updated = await updateIntegrationServiceForCase({
      caseId,
      serviceId,
      status,
      service_date,
      notes,
      proof_document,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Integration service updated",
      data: updated,
    });
  } catch (error) {
    console.error("Update integration service error:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to update integration service",
    });
  }
};
