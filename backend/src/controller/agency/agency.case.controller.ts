import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { sendEmail } from "../../utils/email.util";
import {
  isActiveVisaCase,
  isActiveRelocationCase,
  isCompletedVisaCase,
  isCompletedRelocationCase,
  isCompletedIntegrationCase,
  isActiveIntegrationCase,
} from "../../constants/caseStatuses";

const prisma = new PrismaClient();

// Helper function to generate case number
const generateCaseNumber = async (agencyId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const agencyPrefix = agencyId.substring(0, 4).toUpperCase();

  // Get the highest case number for this agency this year
  const latestCase = await prisma.relocationCase.findFirst({
    where: {
      agency_id: agencyId,
      case_number: {
        startsWith: `${agencyPrefix}-${year}-`,
      },
    },
    orderBy: {
      case_number: "desc",
    },
    select: {
      case_number: true,
    },
  });

  let nextNumber = 1;

  if (latestCase) {
    // Extract the number from the last case (e.g., "ABC1-2024-0005" -> 5)
    const lastNumberStr = latestCase.case_number.split("-").pop();
    const lastNumber = parseInt(lastNumberStr || "0", 10);
    nextNumber = lastNumber + 1;
  }

  const caseNumber = `${agencyPrefix}-${year}-${String(nextNumber).padStart(
    4,
    "0"
  )}`;

  console.log(`📦 Generated case number: ${caseNumber}`);

  return caseNumber;
};

/**
 * POST /api/v1/agency/cases
 * Create a new case for an EXISTING candidate
 * Body: { candidate_id, serviceType, originCountry, destinationCountry, ... }
 */
export const createCase = async (req: Request, res: Response) => {
  try {
    const agencyId = req.user?.agency_id;
    const agencyUserId = req.user?.user_id;

    if (!agencyId || !agencyUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      candidate_id, // ✅ NEW: Use candidate_id instead of individual fields
      serviceType,
      originCountry,
      destinationCountry,
      destinationCity,
      priorityLevel,
      estimatedCompletion,
      estimatedCost,
      notes,
    } = req.body;

    // ✅ VALIDATE: Candidate ID is required
    if (!candidate_id) {
      return res.status(400).json({
        success: false,
        message:
          "Candidate ID is required. Please select an existing candidate.",
      });
    }

    // ✅ VALIDATE: Candidate exists and is a CANDIDATE role
    const candidate = await prisma.user.findFirst({
      where: {
        user_id: candidate_id,
        role: "candidate",
      },
      select: {
        user_id: true,
        full_name: true,
        email: true,
        phone_number: true,
      },
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found or invalid candidate ID",
      });
    }

    // Validate required fields
    if (!serviceType || !destinationCountry || !priorityLevel) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: serviceType, destinationCountry, priorityLevel",
      });
    }

    // Generate unique case number
    const caseNumber = `CASE-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 6)
      .toUpperCase()}`;

    // Create the case
    const newCase = await prisma.relocationCase.create({
      data: {
        case_number: caseNumber,
        candidate_id: candidate.user_id, // ✅ Use validated candidate ID
        agency_id: agencyId,
        service_type: serviceType,
        origin_country: originCountry || "Not specified",
        destination_country: destinationCountry,
        destination_city: destinationCity || null,
        priority_level: priorityLevel,
        status: "documents_pending",
        estimated_completion: estimatedCompletion
          ? new Date(estimatedCompletion)
          : null,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
        notes: notes || null,
      },
      include: {
        candidate: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            phone_number: true,
          },
        },
        agency: {
          select: {
            agency_id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // ✅ Send email to candidate
    try {
      const candidateEmailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
      .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
      .button { display: inline-block; padding: 14px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>New Case Created for You! 🎉</h1>
      </div>
      <div class="content">
        <p>Hi <strong>${candidate.full_name}</strong>,</p>
        <p>Great news! A new relocation case has been created for you by <strong>${
          newCase.agency.name
        }</strong>.</p>
        
        <div class="info-box">
          <h3 style="margin-top: 0; color: #1e40af;">Case Details</h3>
          <p><strong>Case Number:</strong> ${newCase.case_number}</p>
          <p><strong>Service Type:</strong> ${serviceType.replace("_", " ")}</p>
          <p><strong>Destination:</strong> ${destinationCountry}${
        destinationCity ? ` (${destinationCity})` : ""
      }</p>
          <p><strong>Priority:</strong> ${priorityLevel}</p>
        </div>

        <h3>Next Steps:</h3>
        <ol>
          <li>Log in to your dashboard to view case details</li>
          <li>Upload required documents for visa processing</li>
          <li>Our team will review and guide you through the process</li>
        </ol>

        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/candidate/dashboard/cases/${
        newCase.case_id
      }" class="button">
            View Your Case
          </a>
        </div>
      </div>
    </div>
  </body>
</html>
      `;

      await sendEmail({
        to: candidate.email,
        subject: `New Case Created - ${newCase.case_number}`,
        html: candidateEmailHtml,
      });
    } catch (emailError) {
      console.error("Failed to send candidate email:", emailError);
      // Don't fail the request if email fails
    }

    console.log(`✅ Case created successfully: ${newCase.case_number}`);

    return res.status(201).json({
      success: true,
      message: "Case created successfully",
      data: newCase,
    });
  } catch (error) {
    console.error("❌ Create case error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create case",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// GET /api/v1/agency/cases - List all cases
export const listCases = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        agency_id: true,
        agency: {
          select: {
            type: true,
          },
        },
      },
    });

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    const { status, search } = req.query;

    let cases;

    // VISA agencies: Show cases they created
    if (user.agency?.type === "VISA") {
      const where: any = {
        agency_id: user.agency_id,
      };

      if (status && status !== "all") {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { case_number: { contains: search as string, mode: "insensitive" } },
          {
            candidate: {
              full_name: { contains: search as string, mode: "insensitive" },
            },
          },
          {
            candidate: {
              email: { contains: search as string, mode: "insensitive" },
            },
          },
        ];
      }

      cases = await prisma.relocationCase.findMany({
        where,
        include: {
          candidate: {
            select: {
              user_id: true,
              email: true,
              full_name: true,
              phone_number: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      });
    }
    // RELOCATION agencies: Show cases assigned via housing_agency_id
    else if (user.agency?.type === "RELOCATION") {
      const where: any = {
        housing_agency_id: user.agency_id, // Direct query
      };

      if (status && status !== "all") {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { case_number: { contains: search as string, mode: "insensitive" } },
          {
            candidate: {
              full_name: { contains: search as string, mode: "insensitive" },
            },
          },
          {
            candidate: {
              email: { contains: search as string, mode: "insensitive" },
            },
          },
        ];
      }

      cases = await prisma.relocationCase.findMany({
        where,
        include: {
          candidate: {
            select: {
              user_id: true,
              email: true,
              full_name: true,
              phone_number: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      });
    }
    // INTEGRATION agencies: Show cases assigned via integration_agency_id
    else if (user.agency?.type === "INTEGRATION") {
      const where: any = {
        integration_agency_id: user.agency_id, // Direct query
      };

      if (status && status !== "all") {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { case_number: { contains: search as string, mode: "insensitive" } },
          {
            candidate: {
              full_name: { contains: search as string, mode: "insensitive" },
            },
          },
          {
            candidate: {
              email: { contains: search as string, mode: "insensitive" },
            },
          },
        ];
      }

      cases = await prisma.relocationCase.findMany({
        where,
        include: {
          candidate: {
            select: {
              user_id: true,
              email: true,
              full_name: true,
              phone_number: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      });
    }
    // Fallback: No agency type set
    else {
      cases = [];
    }

    return res.status(200).json({
      success: true,
      data: cases,
    });
  } catch (error) {
    console.error("List cases error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cases",
    });
  }
};

// GET /api/v1/agency/cases/:id - Get single case
export const getCaseById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { agency_id: true, agency: { select: { type: true } } },
    });

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    let whereClause: any = { case_id: id };

    // VISA agencies: Check direct agency_id
    if (user.agency?.type === "VISA") {
      whereClause.agency_id = user.agency_id;
    }
    // RELOCATION agency: Check housing_agency_id
    else if (user.agency?.type === "RELOCATION") {
      whereClause.housing_agency_id = user.agency_id;
    }
    // INTEGRATION agency: Check integration_agency_id
    else if (user.agency?.type === "INTEGRATION") {
      whereClause.integration_agency_id = user.agency_id;
    }

    const caseData = await prisma.relocationCase.findFirst({
      where: whereClause,
      include: {
        candidate: {
          select: {
            user_id: true,
            email: true,
            full_name: true,
            phone_number: true,
          },
        },
        updates: {
          orderBy: {
            created_at: "desc",
          },
          take: 10,
        },
        documents: {
          orderBy: {
            created_at: "desc",
          },
        },
        embassy_submission: true,
        agency: {
          select: {
            agency_id: true,
            name: true,
            type: true,
          },
        },
        housing_details: true,
      },
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    const viewingAgencyType = user.agency?.type || null;

    // FLATTEN THE RESPONSE:
    return res.status(200).json({
      success: true,
      data: {
        ...caseData,
        // Merge housing fields to top level
        housing_type: caseData.housing_details?.housing_type,
        housing_address: caseData.housing_details?.housing_address,
        monthly_rent_mad: caseData.housing_details?.monthly_rent_mad,
        agency_fee_amount: caseData.housing_details?.agency_fee_amount,
        lease_start_date: caseData.housing_details?.lease_start_date,
        lease_end_date: caseData.housing_details?.lease_end_date,
        housing_contract_url: caseData.housing_details?.housing_contract_url,
        utility_water: caseData.housing_details?.utility_water,
        utility_electricity: caseData.housing_details?.utility_electricity,
        utility_internet: caseData.housing_details?.utility_internet,
        arrival_date: caseData.housing_details?.arrival_date,
        flight_number: caseData.housing_details?.flight_number,
        airport_pickup_required:
          caseData.housing_details?.airport_pickup_required,
        arrival_notes: caseData.housing_details?.arrival_notes,
        // Remove nested object
        housing_details: undefined,
        viewing_agency_type: viewingAgencyType,
      },
    });
  } catch (error) {
    console.error("Get case error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch case",
    });
  }
};

// GET /api/v1/agency/clients - Get all clients for agency
export const getClients = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        agency_id: true,
        agency: {
          select: {
            type: true,
          },
        },
      },
    });

    if (!user?.agency_id || !user.agency) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    const agencyType = user.agency.type;
    let cases: any[] = [];

    // ============================================
    // VISA AGENCY - Get cases they created
    // ============================================
    if (agencyType === "VISA") {
      cases = await prisma.relocationCase.findMany({
        where: {
          agency_id: user.agency_id,
        },
        include: {
          candidate: {
            select: {
              user_id: true,
              email: true,
              full_name: true,
              phone_number: true,
              created_at: true,
            },
          },
          embassy_submission: {
            select: {
              status: true,
            },
          },
        },
      });
    }
    // ============================================
    // RELOCATION AGENCY - Get cases via housing_agency_id
    // ============================================
    else if (agencyType === "RELOCATION") {
      cases = await prisma.relocationCase.findMany({
        where: {
          housing_agency_id: user.agency_id, // Direct query
        },
        include: {
          candidate: {
            select: {
              user_id: true,
              email: true,
              full_name: true,
              phone_number: true,
              created_at: true,
            },
          },
        },
      });
    }
    // ============================================
    // INTEGRATION AGENCY - Get cases via integration_agency_id
    // ============================================
    else if (agencyType === "INTEGRATION") {
      cases = await prisma.relocationCase.findMany({
        where: {
          integration_agency_id: user.agency_id, // Direct query
        },
        include: {
          candidate: {
            select: {
              user_id: true,
              email: true,
              full_name: true,
              phone_number: true,
              created_at: true,
            },
          },
          integrationServices: true, // Include services for completion check
        },
      });
    }

    // ============================================
    // Group cases by candidate
    // ============================================
    const clientsMap = new Map();

    cases.forEach((c) => {
      const clientId = c.candidate.user_id;

      if (!clientsMap.has(clientId)) {
        clientsMap.set(clientId, {
          id: c.candidate.user_id,
          name: c.candidate.full_name,
          email: c.candidate.email,
          phone: c.candidate.phone_number,
          joinedAt: c.candidate.created_at,
          cases: [],
          totalCases: 0,
          activeCases: 0,
          completedCases: 0,
        });
      }

      const client = clientsMap.get(clientId);
      client.cases.push({
        case_id: c.case_id,
        case_number: c.case_number,
        status: c.status,
        service_type: c.service_type,
        created_at: c.created_at,
      });
      client.totalCases += 1;

      // Using helper functions instead of hardcoded status checks
      if (agencyType === "VISA") {
        const embassyStatus = c.embassy_submission?.status;
        const housingAssigned = c.housing_agency_id !== null; // Add this

        if (isCompletedVisaCase(c.status, embassyStatus, housingAssigned)) {
          // Add 3rd param
          client.completedCases += 1;
        } else if (isActiveVisaCase(c.status, embassyStatus, housingAssigned)) {
          // Add 3rd param
          client.activeCases += 1;
        }
      } else if (agencyType === "RELOCATION") {
        if (isCompletedRelocationCase(c.status)) {
          client.completedCases += 1;
        } else if (isActiveRelocationCase(c.status)) {
          client.activeCases += 1;
        }
      } else if (agencyType === "INTEGRATION") {
        // Add this
        const services = c.integrationServices || [];

        if (isCompletedIntegrationCase(services)) {
          client.completedCases += 1;
        } else if (isActiveIntegrationCase(services)) {
          client.activeCases += 1;
        }
      }
    });

    // Converting map to array and calculating status
    const clients = Array.from(clientsMap.values()).map((client) => ({
      ...client,
      status: client.activeCases > 0 ? "Active" : "Completed",
    }));

    // Sorting by most recent case
    clients.sort((a, b) => {
      const aLastCase = Math.max(
        ...a.cases.map((c: any) => new Date(c.created_at).getTime())
      );
      const bLastCase = Math.max(
        ...b.cases.map((c: any) => new Date(c.created_at).getTime())
      );
      return bLastCase - aLastCase;
    });

    return res.status(200).json({
      success: true,
      data: clients,
    });
  } catch (error) {
    console.error("Get clients error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch clients",
    });
  }
};

// PUT /api/v1/agency/cases/:id - Update case
export const updateCase = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { id } = req.params;

    console.log("=== UPDATE CASE DEBUG ===");
    console.log("User ID:", userId);
    console.log("Case ID:", id);
    console.log("Request body:", req.body);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { agency_id: true },
    });

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    // Verify case belongs to agency
    const existingCase = await prisma.relocationCase.findFirst({
      where: {
        case_id: id,
        agency_id: user.agency_id,
      },
    });

    if (!existingCase) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    const {
      status,
      priority_level,
      estimated_completion,
      estimated_cost,
      actual_cost,
      payment_status,
      notes,
      destination_city,
    } = req.body;

    console.log("Extracted fields:", {
      status,
      priority_level,
      estimated_completion,
      estimated_cost,
      destination_city,
      notes,
    });

    // Build update data object
    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (priority_level !== undefined)
      updateData.priority_level = priority_level;
    if (destination_city !== undefined)
      updateData.destination_city = destination_city;
    if (estimated_completion !== undefined) {
      updateData.estimated_completion = estimated_completion
        ? new Date(estimated_completion)
        : null;
    }
    if (estimated_cost !== undefined)
      updateData.estimated_cost = estimated_cost;
    if (actual_cost !== undefined) updateData.actual_cost = actual_cost;
    if (payment_status !== undefined)
      updateData.payment_status = payment_status;
    if (notes !== undefined) updateData.notes = notes;

    console.log("Update data object:", updateData);

    const updatedCase = await prisma.relocationCase.update({
      where: { case_id: id },
      data: updateData,
      include: {
        candidate: {
          select: {
            user_id: true,
            email: true,
            full_name: true,
            phone_number: true,
          },
        },
      },
    });

    console.log("Updated case:", updatedCase);

    return res.status(200).json({
      success: true,
      message: "Case updated successfully",
      data: updatedCase,
    });
  } catch (error) {
    console.error("Update case error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update case",
    });
  }
};
