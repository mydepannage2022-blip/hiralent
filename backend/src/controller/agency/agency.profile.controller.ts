import { Request, Response } from "express";
import {
  getAgencyByUserId,
  getAgencyIdForUser,
  updateAgencyProfile,
} from "../../services/agency/agency.profile.service";

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

    const agency = await getAgencyByUserId(userId);

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: agency,
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
      languages_supported,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const agencyId = await getAgencyIdForUser(userId);

    if (!agencyId) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    const updatedAgency = await updateAgencyProfile(agencyId, {
      name,
      phone,
      website,
      service_description,
      operating_countries,
      languages_supported,
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