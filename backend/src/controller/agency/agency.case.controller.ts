import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Helper function to generate case number
const generateCaseNumber = async (agencyId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const agencyPrefix = agencyId.substring(0, 4).toUpperCase();
  
  const count = await prisma.relocationCase.count({
    where: {
      agency_id: agencyId,
      created_at: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31 23:59:59`),
      },
    },
  });

  const caseNumber = `${agencyPrefix}-${year}-${String(count + 1).padStart(4, '0')}`;
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
      select: { agency_id: true },
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
    if (!candidateEmail || !serviceType || !originCountry || !destinationCountry) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: candidateEmail, serviceType, originCountry, destinationCountry",
      });
    }

    // Find or create candidate
    let candidate = await prisma.user.findUnique({
      where: { email: candidateEmail },
    });

    if (!candidate) {
      const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
      const password_hash = await bcrypt.hash(tempPassword, 10);

      candidate = await prisma.user.create({
        data: {
          email: candidateEmail,
          password_hash,
          full_name: candidateName || candidateEmail.split('@')[0],
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

      console.log(`[CREATE CASE] Created new candidate: ${candidate.email}, temp password: ${tempPassword}`);
    }

    const caseNumber = await generateCaseNumber(user.agency_id);

    const newCase = await prisma.relocationCase.create({
      data: {
        case_number: caseNumber,
        candidate_id: candidate.user_id,
        agency_id: user.agency_id,
        service_type: serviceType,
        priority_level: priorityLevel || 'medium',
        status: 'initiated',
        origin_country: originCountry,
        destination_country: destinationCountry,
        destination_city: destinationCity || null,
        estimated_completion: estimatedCompletion ? new Date(estimatedCompletion) : null,
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

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { case_number: { contains: search as string, mode: 'insensitive' } },
        { candidate: { full_name: { contains: search as string, mode: 'insensitive' } } },
        { candidate: { email: { contains: search as string, mode: 'insensitive' } } },
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
        created_at: 'desc',
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
            created_at: 'desc',
          },
          take: 10,
        },
        documents: {
          orderBy: {
            created_at: 'desc',
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
      
      if (c.status === 'completed') {
        client.completedCases += 1;
      } else if (['initiated', 'in_progress', 'pending_documents'].includes(c.status)) {
        client.activeCases += 1;
      }
    });

    // Convert map to array and calculate status
    const clients = Array.from(clientsMap.values()).map(client => ({
      ...client,
      status: client.activeCases > 0 ? 'Active' : 'Completed',
    }));

    // Sort by most recent case
    clients.sort((a, b) => {
      const aLastCase = Math.max(...a.cases.map((c: any) => new Date(c.created_at).getTime()));
      const bLastCase = Math.max(...b.cases.map((c: any) => new Date(c.created_at).getTime()));
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
    if (priority_level !== undefined) updateData.priority_level = priority_level;
    if (destination_city !== undefined) updateData.destination_city = destination_city; // ✅ Add this
    if (estimated_completion !== undefined) {
      updateData.estimated_completion = estimated_completion 
        ? new Date(estimated_completion) 
        : null;
    }
    if (estimated_cost !== undefined) updateData.estimated_cost = estimated_cost;
    if (actual_cost !== undefined) updateData.actual_cost = actual_cost;
    if (payment_status !== undefined) updateData.payment_status = payment_status;
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