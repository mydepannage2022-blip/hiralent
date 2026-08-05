import { Request, Response } from "express";
import prisma from '../../lib/prisma';
import { sendEmail } from "../../utils/email.util";
import { parsePagination, setPaginationHeaders } from "../../utils/pagination.util";
import {
  renderEmailCallout,
  renderEmailKeyValueTable,
  renderTransactionalEmail,
} from "../../services/emailTemplates.service";
import { getFrontendUrl } from "../../config/appUrls";


const coerceSingleString = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
};

/**
 * GET /api/v1/candidate/agencies/browse
 * Browse available approved agencies
 * Query params: type (RELOCATION), country (optional)
 */
export const browseAgenciesController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { type, country } = req.query;

    // Validate type parameter
    if (!type || !["RELOCATION", "INTEGRATION"].includes(type as string)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or missing agency type. Must be RELOCATION or INTEGRATION",
      });
    }

    // Build query filters
    const whereClause: any = {
      type: type as string,
      status: "APPROVED", // Only show approved agencies
    };

    // Optional: Filter by country if provided
    if (country) {
      whereClause.operating_countries = {
        has: country as string,
      };
    }

    // Fetch agencies from database (bounded: default page size == cap for this browse list)
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 100, max: 100 });
    const [agencies, total] = await Promise.all([
      prisma.agency.findMany({
        where: whereClause,
        select: {
          agency_id: true,
          name: true,
          type: true,
          email: true,
          phone: true,
          website: true,
          operating_countries: true,
          created_at: true,
          // Optional fields (add if they exist in your schema)
          // rating: true,
          // total_cases: true,
          // success_rate: true,
          // logo_url: true,
          // services: true,
        },
        orderBy: {
          created_at: "desc", // Most recent first (change to rating when available)
        },
        skip,
        take: limit,
      }),
      prisma.agency.count({ where: whereClause }),
    ]);

    setPaginationHeaders(res, { total, page, limit });
    // Return agencies
    return res.status(200).json({
      success: true,
      message: `Found ${agencies.length} ${type} agencies`,
      data: agencies,
    });
  } catch (error) {
    console.error("Browse agencies error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch agencies",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * POST /api/v1/candidate/cases/:caseId/assign-agency
 * Candidate selects and assigns an agency to their case
 * Body: { agencyId: string }
 */
export const assignAgencyToCase = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const caseId = coerceSingleString((req.params as any).caseId);
    const { agencyId } = req.body;

    if (!caseId) {
      return res.status(400).json({
        success: false,
        message: "Case ID is required",
      });
    }

    // Validate request body
    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: "Agency ID is required",
      });
    }

    // 1. Verify case exists and belongs to logged-in candidate
    const caseData = await prisma.relocationCase.findUnique({
      where: { case_id: caseId },
      include: {
        embassy_submission: true,
        candidate: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
          },
        },
      },
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    if (caseData.candidate_id !== userId) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to modify this case",
      });
    }

    // 2. Verify visa is approved before allowing housing assignment
    if (
      !caseData.embassy_submission ||
      caseData.embassy_submission.status !== "approved"
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot assign housing agency. Visa must be approved first.",
      });
    }

    // 3. Check if housing agency already assigned in case record
    if (caseData.housing_agency_id) {
      const existingAgency = await prisma.agency.findUnique({
        where: { agency_id: caseData.housing_agency_id },
        select: { name: true },
      });
      
      return res.status(400).json({
        success: false,
        message: `Housing agency already assigned: ${existingAgency?.name || 'Unknown'}`,
      });
    }

    // 4. Verify agency exists and is approved RELOCATION agency
    const agency = await prisma.agency.findUnique({
      where: { agency_id: agencyId },
      select: {
        agency_id: true,
        name: true,
        email: true,
        type: true,
        status: true,
        operating_countries: true,
      },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    if (agency.type !== "RELOCATION") {
      return res.status(400).json({
        success: false,
        message: "Selected agency is not a relocation/housing agency",
      });
    }

    if (agency.status !== "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Selected agency is not approved",
      });
    }

    // 5. Optional: Verify agency operates in destination country
    if (agency.operating_countries && agency.operating_countries.length > 0) {
      if (!agency.operating_countries.includes(caseData.destination_country)) {
        return res.status(400).json({
          success: false,
          message: `Selected agency does not operate in ${caseData.destination_country}`,
          suggestion:
            "Please choose an agency that operates in your destination country",
        });
      }
    }

    // 6. Update case with housing_agency_id
    const updatedCase = await prisma.relocationCase.update({
      where: { case_id: caseId },
      data: {
        housing_agency_id: agencyId,  // Set housing agency!
        status: "housing_assigned",
        updated_at: new Date(),
      },
      include: {
        housingAgency: {
          select: {
            agency_id: true,
            name: true,
            email: true,
            phone: true,
            website: true,
          },
        },
      },
    });

    // 8. Send notification to agency
    try {
      const frontendUrl = getFrontendUrl();
      const agencyCaseUrl = `${frontendUrl}/agency/dashboard/cases/${caseId}`;

      const caseDetailsHtml = renderEmailKeyValueTable([
        { label: "Case number", value: caseData.case_number },
        { label: "Candidate", value: caseData.candidate.full_name },
        {
          label: "Route",
          value: `${caseData.origin_country} → ${caseData.destination_country}`,
        },
        { label: "City", value: caseData.destination_city || null },
        { label: "Visa status", value: "Approved" },
        { label: "Service type", value: caseData.service_type.replace("_", " ") },
      ]);

      const actionsHtml = `
        <ol style="margin: 0; padding-left: 18px;">
          <li>Open your agency dashboard</li>
          <li>Review the case details</li>
          <li>Contact the candidate to discuss housing needs</li>
        </ol>`;

      const agencyEmailHtml = renderTransactionalEmail({
        title: "New case assigned",
        previewText: `A new case (${caseData.case_number}) was assigned to your agency.`,
        greetingName: `${agency.name} team`,
        introHtml:
          "A candidate has selected your agency after visa approval. Please review the case and reach out promptly.",
        sections: [
          { title: "Case details", html: caseDetailsHtml },
          { title: "What to do next", html: actionsHtml },
        ],
        cta: { label: "View case in dashboard", href: agencyCaseUrl },
        tone: "info",
      });

      await sendEmail({
        to: agency.email || "",
        subject: `New Case Assigned - ${caseData.case_number}`,
        html: agencyEmailHtml,
      });
    } catch (emailError) {
      console.error("Failed to send agency notification email:", emailError);
      // Don't fail the whole request if email fails
    }

    // 9. Send confirmation email to candidate
    try {
      const frontendUrl = getFrontendUrl();
      const candidateCaseUrl = `${frontendUrl}/candidate/dashboard/cases/${caseId}`;

      const selectedAgencyHtml = renderEmailKeyValueTable([
        { label: "Agency", value: agency.name },
        { label: "Email", value: agency.email || null },
        { label: "Case number", value: caseData.case_number },
        { label: "Destination", value: caseData.destination_country },
      ]);

      const timelineCallout = renderEmailCallout({
        tone: "warning",
        html: "Expect initial contact within 2–3 business days. The housing search typically takes 1–2 weeks.",
      });

      const nextHtml = `
        <ol style="margin: 0; padding-left: 18px;">
          <li>The agency reviews your case</li>
          <li>They contact you to discuss preferences and budget</li>
          <li>They share options for your review</li>
        </ol>
        <div style="margin-top: 12px;">${timelineCallout}</div>`;

      const candidateEmailHtml = renderTransactionalEmail({
        title: "Housing agency confirmed",
        previewText: `You selected ${agency.name} for case ${caseData.case_number}.`,
        greetingName: caseData.candidate.full_name,
        introHtml: "Your housing agency selection is confirmed. The agency has been notified.",
        sections: [
          { title: "Selected agency", html: selectedAgencyHtml },
          { title: "What happens next", html: nextHtml },
        ],
        cta: { label: "View case details", href: candidateCaseUrl },
        tone: "success",
      });

      await sendEmail({
        to: caseData.candidate.email,
        subject: `Housing Agency Confirmed - ${agency.name}`,
        html: candidateEmailHtml,
      });
    } catch (emailError) {
      console.error("Failed to send candidate confirmation email:", emailError);
      // Don't fail the whole request if email fails
    }

    // Success response
    return res.status(201).json({
      success: true,
      message: `Housing agency assigned successfully: ${agency.name}`,
      data: {
        case_id: updatedCase.case_id,
        housing_agency_id: updatedCase.housing_agency_id,
        agency: updatedCase.housingAgency,
        status: updatedCase.status,
        updated_at: updatedCase.updated_at,
      },
    });
  } catch (error) {
    console.error("Assign agency error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign agency",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// ==========================================
// INTEGRATION AGENCY ENDPOINTS (NEW)
// ==========================================

/**
 * Browse integration agencies by country
 * GET /api/candidates/agencies/browse?type=INTEGRATION&country=Morocco
 */
export const browseIntegrationAgenciesController = async (
  req: Request,
  res: Response
) => {
  try {
    const { country, type } = req.query;

    // Validate agency type
    if (type !== "INTEGRATION") {
      return res.status(400).json({
        success: false,
        message: "Invalid agency type. Must be INTEGRATION.",
      });
    }

    if (!country) {
      return res.status(400).json({
        success: false,
        message: "Country parameter is required",
      });
    }

    const agencies = await prisma.agency.findMany({
      where: {
        type: "INTEGRATION",
        status: "APPROVED",
        operating_countries: {
          has: country as string,
        },
      },
      select: {
        agency_id: true,
        name: true,
        email: true,
        phone: true,
        website: true,
        operating_countries: true,
        rating: true,
        service_description: true,
        languages_supported: true,
        accreditations: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: agencies,
      count: agencies.length,
    });
  } catch (error) {
    console.error("❌ Browse integration agencies error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch integration agencies",
    });
  }
};

/**
 * Assign integration agency to case
 * POST /api/candidates/cases/:caseId/assign-integration-agency
 * Body: { agencyId: string }
 */
export const assignIntegrationAgencyToCase = async (
  req: Request,
  res: Response
) => {
  try {
    const caseId = coerceSingleString((req.params as any).caseId);
    const { agencyId } = req.body;
    const candidateId = req.user?.user_id;

    if (!caseId) {
      return res.status(400).json({
        success: false,
        message: "Case ID is required",
      });
    }

    if (!candidateId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!agencyId) {
      return res.status(400).json({
        success: false,
        message: "Agency ID is required",
      });
    }

    // 1. Verify case belongs to candidate and is ready for integration
    const existingCase = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        candidate_id: candidateId,
        status: "ready_for_arrival", // Only allow if housing is complete
      },
    });

    if (!existingCase) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not ready for integration assignment",
      });
    }

    // 2. Check if integration agency already assigned
    if (existingCase.integration_agency_id) {
      return res.status(400).json({
        success: false,
        message: "Integration agency already assigned to this case",
      });
    }

    // 3. Verify agency exists and is INTEGRATION type
    const agency = await prisma.agency.findFirst({
      where: {
        agency_id: agencyId,
        type: "INTEGRATION",
        status: "APPROVED",
      },
    });

    if (!agency) {
      return res.status(400).json({
        success: false,
        message: "Invalid integration agency or agency not approved",
      });
    }

    // 4. Update case with integration agency
    const updatedCase = await prisma.relocationCase.update({
      where: { case_id: caseId },
      data: {
        integration_agency_id: agencyId,
        status: "integration_assigned",
      },
    });

    // 5. Auto-create 6 integration services
    const serviceTypes = [
      "healthcare",
      "banking",
      "tax_id",
      "telecom",
      "transport",
      "integration_program",
    ];

    await prisma.$transaction(
      serviceTypes.map((serviceType) =>
        prisma.integrationService.create({
          data: {
            case_id: caseId,
            service_type: serviceType,
            status: "pending",
          },
        })
      )
    );

    console.log(`✅ Integration agency assigned to case ${caseId}`);

    return res.status(200).json({
      success: true,
      message: "Integration agency assigned successfully",
      data: {
        case_id: updatedCase.case_id,
        integration_agency_id: updatedCase.integration_agency_id,
        status: updatedCase.status,
      },
    });
  } catch (error) {
    console.error("❌ Assign integration agency error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign integration agency",
    });
  }
};

/**
 * Get integration services for a case
 * GET /api/candidates/cases/:caseId/integration-services
 */
export const getIntegrationServicesController = async (
  req: Request,
  res: Response
) => {
  try {
    const caseId = coerceSingleString((req.params as any).caseId);
    const candidateId = req.user?.user_id;

    if (!caseId) {
      return res.status(400).json({
        success: false,
        message: "Case ID is required",
      });
    }

    if (!candidateId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Verify case belongs to candidate
    const caseExists = await prisma.relocationCase.findFirst({
      where: {
        case_id: caseId,
        candidate_id: candidateId,
      },
    });

    if (!caseExists) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // Get all integration services for the case
    const services = await prisma.integrationService.findMany({
      where: { case_id: caseId },
      orderBy: { created_at: "asc" },
    });

    return res.status(200).json({
      success: true,
      data: services,
      count: services.length,
    });
  } catch (error) {
    console.error("❌ Get integration services error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch integration services",
    });
  }
};
