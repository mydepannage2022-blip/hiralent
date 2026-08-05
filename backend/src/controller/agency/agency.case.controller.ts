import { Request, Response } from "express";
import {
  findCandidateById,
  createCaseInDb,
  sendCaseCreationEmail,
  getUserWithAgency,
  listCasesForAgency,
  getCaseByIdForAgency,
  flattenCaseData,
  getClientsForAgency,
  getUserAgencyId,
  verifyCaseBelongsToAgency,
  updateCaseInDb,
} from "../../services/agency/agency.case.service";
import { parsePagination, setPaginationHeaders } from "../../utils/pagination.util";

// POST /api/v1/agency/cases
export const createCase = async (req: Request, res: Response) => {
  try {
    const agencyId = req.user?.agency_id;
    const agencyUserId = req.user?.user_id;

    if (!agencyId || !agencyUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      candidate_id, serviceType, originCountry, destinationCountry,
      destinationCity, priorityLevel, estimatedCompletion, estimatedCost, notes,
    } = req.body;

    if (!candidate_id) {
      return res.status(400).json({
        success: false,
        message: "Candidate ID is required. Please select an existing candidate.",
      });
    }

    const candidate = await findCandidateById(candidate_id);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found or invalid candidate ID",
      });
    }

    if (!serviceType || !destinationCountry || !priorityLevel) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: serviceType, destinationCountry, priorityLevel",
      });
    }

    const newCase = await createCaseInDb({
      candidateId: candidate.user_id,
      agencyId,
      serviceType,
      originCountry,
      destinationCountry,
      destinationCity,
      priorityLevel,
      estimatedCompletion,
      estimatedCost,
      notes,
    });

    try {
      await sendCaseCreationEmail({
        candidateFullName: candidate.full_name || "Candidate",
        candidateEmail: candidate.email,
        agencyName: newCase.agency.name,
        caseNumber: newCase.case_number,
        caseId: newCase.case_id,
        serviceType,
        destinationCountry,
        destinationCity,
        priorityLevel,
      });
    } catch (emailError) {
      console.error("Failed to send candidate email:", emailError);
    }

    return res.status(201).json({
      success: true,
      message: "Case created successfully",
      data: newCase,
    });
  } catch (error) {
    console.error("Create case error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create case",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// GET /api/v1/agency/cases
export const listCases = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await getUserWithAgency(userId);

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    const { status, search } = req.query;
    // Show-all case list: default page size == cap so no-param callers still get all up to the cap.
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 200, max: 200 });

    const { items, total } = await listCasesForAgency({
      agencyId: user.agency_id,
      agencyType: user.agency?.type || "",
      status: status as string | undefined,
      search: search as string | undefined,
      pagination: { skip, take: limit },
    });

    setPaginationHeaders(res, { total, page, limit });
    return res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error("List cases error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch cases" });
  }
};

// GET /api/v1/agency/cases/:id
export const getCaseById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const id = req.params.id as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await getUserWithAgency(userId);

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    const caseData = await getCaseByIdForAgency({
      caseId: id,
      agencyId: user.agency_id,
      agencyType: user.agency?.type,
    });

    if (!caseData) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    const viewingAgencyType = user.agency?.type || null;

    return res.status(200).json({
      success: true,
      data: flattenCaseData(caseData, viewingAgencyType),
    });
  } catch (error) {
    console.error("Get case error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch case" });
  }
};

// GET /api/v1/agency/clients
export const getClients = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await getUserWithAgency(userId);

    if (!user?.agency_id || !user.agency) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, max: 100 });
    const { items, total } = await getClientsForAgency({
      agencyId: user.agency_id,
      agencyType: user.agency.type,
      pagination: { skip, take: limit },
    });

    // Body shape unchanged (data = array) for existing consumers; page metadata is additive
    // via headers (X-Total-Count etc.), matching the rest of the paginated endpoints.
    setPaginationHeaders(res, { total, page, limit });
    return res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error("Get clients error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch clients" });
  }
};

// PUT /api/v1/agency/cases/:id
export const updateCase = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const id = req.params.id as string;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await getUserAgencyId(userId);

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    const existingCase = await verifyCaseBelongsToAgency(id, user.agency_id);
    if (!existingCase) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    const {
      status, priority_level, estimated_completion, estimated_cost,
      actual_cost, payment_status, notes, destination_city,
    } = req.body;

    const updatedCase = await updateCaseInDb(id, {
      status, priority_level, estimated_completion, estimated_cost,
      actual_cost, payment_status, notes, destination_city,
    });

    return res.status(200).json({
      success: true,
      message: "Case updated successfully",
      data: updatedCase,
    });
  } catch (error) {
    console.error("Update case error:", error);
    return res.status(500).json({ success: false, message: "Failed to update case" });
  }
};