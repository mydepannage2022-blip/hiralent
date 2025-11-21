import { Request, Response } from "express";
import { PrismaClient, AgencyType, AgencyStatus } from "@prisma/client";

const prisma = new PrismaClient();

// POST /api/v1/agency/apply
export const applyAsAgency = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      type,
      description,
      website,
      operatingCountries,
      serviceCategories,
    } = req.body;

    // Validation
    if (!name || !email || !phone || !type) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, email, phone, type",
      });
    }

    // Check if email already exists
    const existingAgency = await prisma.agency.findUnique({
      where: { email },
    });

    if (existingAgency) {
      return res.status(409).json({
        success: false,
        message: "An agency with this email already exists",
      });
    }

    // Validate agency type
    if (!["VISA", "RELOCATION", "INTEGRATION"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid agency type",
      });
    }

    // Create agency with PENDING status
    const agency = await prisma.agency.create({
      data: {
        name,
        email,
        phone,
        type: type as AgencyType,
        service_description: description || null,
        website: website || null,
        operating_countries: operatingCountries || [],
        service_categories: serviceCategories || [],
        status: AgencyStatus.PENDING,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: {
        agency_id: agency.agency_id,
        name: agency.name,
        email: agency.email,
        status: agency.status,
      },
    });
  } catch (error) {
    console.error("Agency application error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit application",
    });
  }
};

// GET /api/v1/agency/application/:id - Check application status
export const getApplicationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agency = await prisma.agency.findUnique({
      where: { agency_id: id },
      select: {
        agency_id: true,
        name: true,
        email: true,
        status: true,
        created_at: true,
        rejection_reason: true,
      },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: agency,
    });
  } catch (error) {
    console.error("Get application status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch application status",
    });
  }
};