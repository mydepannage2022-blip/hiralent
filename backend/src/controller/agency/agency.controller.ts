import { Request, Response } from "express";
import { AgencyType } from "@prisma/client";
import {
  findAgencyByEmail,
  createAgencyApplication,
  getApplicationById,
} from "../../services/agency/agency.service";

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

    if (!name || !email || !phone || !type) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, email, phone, type",
      });
    }

    const existingAgency = await findAgencyByEmail(email);
    if (existingAgency) {
      return res.status(409).json({
        success: false,
        message: "An agency with this email already exists",
      });
    }

    if (!["VISA", "RELOCATION", "INTEGRATION"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid agency type",
      });
    }

    const agency = await createAgencyApplication({
      name,
      email,
      phone,
      type: type as AgencyType,
      description,
      website,
      operatingCountries,
      serviceCategories,
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
    const id = req.params.id as string;

    const agency = await getApplicationById(id);

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