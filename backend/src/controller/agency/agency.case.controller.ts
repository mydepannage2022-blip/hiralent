import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { sendEmail } from "../../utils/email.util";

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

// POST /api/v1/agency/cases - Create new case
export const createCase = async (req: Request, res: Response) => {
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
            name: true,
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

    const {
      candidateEmail,
      candidateName,
      candidatePhone,
      serviceType,
      originCountry,
      destinationCountry,
      destinationCity,
      priorityLevel,
      estimatedCompletion,
      estimatedCost,
      notes,
    } = req.body;

    // Validate required fields
    if (
      !candidateEmail ||
      !serviceType ||
      !originCountry ||
      !destinationCountry
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: candidateEmail, serviceType, originCountry, destinationCountry",
      });
    }

    // Find or create candidate
    let candidate = await prisma.user.findUnique({
      where: { email: candidateEmail },
    });

    let isNewCandidate = false;
    let tempPassword = "";

    if (!candidate) {
      isNewCandidate = true;
      tempPassword = Math.random().toString(36).slice(-10) + "A1!";
      const password_hash = await bcrypt.hash(tempPassword, 10);

      candidate = await prisma.user.create({
        data: {
          email: candidateEmail,
          password_hash,
          full_name: candidateName || candidateEmail.split("@")[0],
          role: "candidate",
          phone_number: candidatePhone || null,
          is_email_verified: false,
        },
      });

      await prisma.candidateProfile.create({
        data: {
          candidate_id: candidate.user_id,
        },
      });

      console.log(`[CREATE CASE] Created new candidate: ${candidate.email}`);
    }

    const caseNumber = await generateCaseNumber(user.agency_id);

    const newCase = await prisma.relocationCase.create({
      data: {
        case_number: caseNumber,
        candidate_id: candidate.user_id,
        agency_id: user.agency_id,
        service_type: serviceType,
        priority_level: priorityLevel || "medium",
        status: "initiated",
        origin_country: originCountry,
        destination_country: destinationCountry,
        destination_city: destinationCity || null,
        estimated_completion: estimatedCompletion
          ? new Date(estimatedCompletion)
          : null,
        estimated_cost: estimatedCost || null,
        notes: notes || null,
        case_manager_id: userId,
      },
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

    console.log(`✅ Case created: ${caseNumber}`);

    // ============================
    // 📧 EMAIL NOTIFICATIONS
    // ============================

    const agencyName = user.agency?.name || "Hiralent Agency";
    const candidateName_display =
      candidate.full_name || candidateEmail.split("@")[0];
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    console.log("📧 Queuing emails for:", candidateEmail);

    if (isNewCandidate) {
      const welcomeEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Hiralent! 🎉</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${candidateName_display}</strong>,</p>
              
              <p>Welcome to Hiralent! Your account has been created by <strong>${agencyName}</strong> to manage your relocation process.</p>
              
              <div class="credentials">
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${candidateEmail}</p>
                <p><strong>Temporary Password:</strong> <code style="background: #fee; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
              </div>
              
              <p><strong>⚠️ Important:</strong> Please change your password after your first login for security.</p>
              
              <a href="${frontendUrl}/candidate/cases" class="button">Access Your Dashboard</a>
              
              <p>You can now log in to view your relocation case and upload required documents.</p>
              
              <div class="footer">
                <p>This is an automated message from Hiralent.</p>
                <p>If you did not expect this email, please contact support.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Fire-and-forget (non-blocking)
      sendEmail({
        to: candidateEmail,
        subject: "Welcome to Hiralent - Your Account is Ready! 🎉",
        html: welcomeEmailHtml,
      })
        .then(() => console.log(`✅ Welcome email sent to: ${candidateEmail}`))
        .catch((err) => console.error("❌ Welcome email error:", err.message));
    }

    // Case notification email
    const caseEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .case-info { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .info-label { font-weight: bold; width: 150px; color: #6b7280; }
          .info-value { flex: 1; }
          .docs-section { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Relocation Case Created 📋</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${candidateName_display}</strong>,</p>
            
            <p>A new relocation case has been created for you by <strong>${agencyName}</strong>.</p>
            
            <div class="case-info">
              <h3>Case Details:</h3>
              <div class="info-row">
                <span class="info-label">Case Number:</span>
                <span class="info-value"><strong>${caseNumber}</strong></span>
              </div>
              <div class="info-row">
                <span class="info-label">Service Type:</span>
                <span class="info-value">${serviceType}</span>
              </div>
              <div class="info-row">
                <span class="info-label">From:</span>
                <span class="info-value">${originCountry}</span>
              </div>
              <div class="info-row">
                <span class="info-label">To:</span>
                <span class="info-value">${destinationCountry}${
      destinationCity ? `, ${destinationCity}` : ""
    }</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value" style="color: #10b981; font-weight: bold;">Initiated</span>
              </div>
            </div>
            
            <div class="docs-section">
              <h3>📄 Action Required: Upload Documents</h3>
              <p>To proceed with your visa application, please upload the following documents:</p>
              <ul>
                <li>Passport copy (all pages)</li>
                <li>Visa application form</li>
                <li>Recent bank statements (last 3 months)</li>
                <li>Employment letter</li>
                <li>Proof of accommodation</li>
              </ul>
            </div>
            
            <a href="${frontendUrl}/candidate/cases/${
      newCase.case_id
    }" class="button">Upload Documents Now</a>
            
            <p>If you have any questions, please contact your case manager at ${agencyName}.</p>
            
            <div class="footer">
              <p>This is an automated notification from Hiralent.</p>
              <p>Case created on ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Fire-and-forget (non-blocking)
    setTimeout(() => {
      sendEmail({
        to: candidateEmail,
        subject: `New Relocation Case Created - ${caseNumber}`,
        html: caseEmailHtml,
      })
        .then(() =>
          console.log(`✅ Case notification sent to: ${candidateEmail}`)
        )
        .catch((err) => console.error("❌ Case email error:", err.message));
    }, 2000);

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
      select: { agency_id: true },
    });

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    const { status, search } = req.query;

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

    const cases = await prisma.relocationCase.findMany({
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
      select: { agency_id: true },
    });

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    const caseData = await prisma.relocationCase.findFirst({
      where: {
        case_id: id,
        agency_id: user.agency_id,
      },
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
      },
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: caseData,
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
      select: { agency_id: true },
    });

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    // Get all unique clients (candidates) who have cases with this agency
    const cases = await prisma.relocationCase.findMany({
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
      },
    });

    // Group cases by candidate to get unique clients with their case counts
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

      if (c.status === "completed") {
        client.completedCases += 1;
      } else if (
        ["initiated", "in_progress", "pending_documents"].includes(c.status)
      ) {
        client.activeCases += 1;
      }
    });

    // Convert map to array and calculate status
    const clients = Array.from(clientsMap.values()).map((client) => ({
      ...client,
      status: client.activeCases > 0 ? "Active" : "Completed",
    }));

    // Sort by most recent case
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
