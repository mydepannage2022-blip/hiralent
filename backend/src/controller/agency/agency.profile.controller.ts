import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/v1/agency/profile - Get agency profile
export const getProfile = async (req: Request, res: Response) => {
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
      include: {
        agency: {
          select: {
            agency_id: true,
            name: true,
            email: true,
            phone: true,
            type: true,
            status: true,
            website: true,
            service_description: true,
            operating_countries: true,
            languages_supported: true,
            rating: true,
            total_cases_handled: true,
            success_rate: true,
            created_at: true,
          },
        },
      },
    });

    if (!user?.agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: user.agency,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};

// PUT /api/v1/agency/profile - Update agency profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { 
      name, 
      phone, 
      website, 
      service_description,
      operating_countries,
      languages_supported 
    } = req.body;

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
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (service_description !== undefined) updateData.service_description = service_description;
    if (operating_countries !== undefined) updateData.operating_countries = operating_countries;
    if (languages_supported !== undefined) updateData.languages_supported = languages_supported;

    const updatedAgency = await prisma.agency.update({
      where: { agency_id: user.agency_id },
      data: updateData,
      select: {
        agency_id: true,
        name: true,
        email: true,
        phone: true,
        type: true,
        status: true,
        website: true,
        service_description: true,
        operating_countries: true,
        languages_supported: true,
        rating: true,
        total_cases_handled: true,
        success_rate: true,
        created_at: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedAgency,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};