import { Request, Response } from "express";
import {
  getUserAgencyInfo,
  verifyCaseForHousingAgency,
  verifyCaseForHousingAgencyWithDetails,
  upsertHousingDetails,
  progressCaseStatusIfNeeded,
  getCaseWithHousingDetails,
  upsertUtilityStatus,
  upsertArrivalDetails,
  checkHousingCompleteness,
  markCaseReadyForArrival,
  sendReadyForArrivalEmail,
} from "../../services/agency/agency.housing.service";

/**
 * PUT /api/v1/agency/cases/:caseId/housing
 * Update housing details for a relocation case
 */
export const updateHousingDetails = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.caseId as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await getUserAgencyInfo(userId);

    if (!user?.agency_id) {
      return res.status(403).json({
        success: false,
        message: "User is not associated with an agency",
      });
    }

    if (user.agency.type !== "RELOCATION") {
      return res.status(403).json({
        success: false,
        message: "Only relocation agencies can update housing details",
      });
    }

    const caseData = await verifyCaseForHousingAgency(caseId, user.agency_id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not assigned to your agency",
      });
    }

    const {
      housing_type,
      housing_address,
      monthly_rent_mad,
      agency_fee_amount,
      lease_start_date,
      lease_end_date,
      housing_contract_url,
    } = req.body;

    const housingData = {
      housing_type: housing_type || undefined,
      housing_address: housing_address || undefined,
      monthly_rent_mad: monthly_rent_mad
        ? parseFloat(monthly_rent_mad)
        : undefined,
      agency_fee_amount: agency_fee_amount
        ? parseFloat(agency_fee_amount)
        : undefined,
      lease_start_date: lease_start_date
        ? new Date(lease_start_date)
        : undefined,
      lease_end_date: lease_end_date ? new Date(lease_end_date) : undefined,
      housing_contract_url: housing_contract_url || undefined,
    };

    await upsertHousingDetails(caseId, housingData);
    await progressCaseStatusIfNeeded(caseId, caseData.status);

    const updatedCase = await getCaseWithHousingDetails(caseId);

    return res.status(200).json({
      success: true,
      message: "Housing details updated successfully",
      data: updatedCase,
    });
  } catch (error) {
    console.error("Update housing error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update housing details",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * PUT /api/v1/agency/cases/:caseId/utilities
 * Update utility setup status
 */
export const updateUtilityStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.caseId as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await getUserAgencyInfo(userId);

    if (!user?.agency_id || user.agency.type !== "RELOCATION") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update utilities",
      });
    }

    const caseData = await verifyCaseForHousingAgency(caseId, user.agency_id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not assigned to your agency",
      });
    }

    const { utility_water, utility_electricity, utility_internet } = req.body;

    const updatedHousing = await upsertUtilityStatus(caseId, {
      utility_water,
      utility_electricity,
      utility_internet,
    });

    return res.status(200).json({
      success: true,
      message: "Utility status updated successfully",
      data: updatedHousing,
    });
  } catch (error) {
    console.error("Update utility error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update utility status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * PUT /api/v1/agency/cases/:caseId/arrival
 * Update travel and arrival details
 */
export const updateArrivalDetails = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.caseId as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await getUserAgencyInfo(userId);

    if (!user?.agency_id || user.agency.type !== "RELOCATION") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update arrival details",
      });
    }

    const caseData = await verifyCaseForHousingAgency(caseId, user.agency_id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not assigned to your agency",
      });
    }

    const { arrival_date, flight_number, airport_pickup_required, arrival_notes } = req.body;

    const updatedHousing = await upsertArrivalDetails(caseId, {
      arrival_date,
      flight_number,
      airport_pickup_required,
      arrival_notes,
    });

    return res.status(200).json({
      success: true,
      message: "Arrival details updated successfully",
      data: updatedHousing,
    });
  } catch (error) {
    console.error("Update arrival error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update arrival details",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * PUT /api/v1/agency/cases/:caseId/ready-for-arrival
 * Mark case as ready for candidate arrival
 */
export const markReadyForArrival = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const caseId = req.params.caseId as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await getUserAgencyInfo(userId);

    if (!user?.agency_id || user.agency.type !== "RELOCATION") {
      return res.status(403).json({
        success: false,
        message: "Only relocation agencies can mark cases as ready",
      });
    }

    const caseData = await verifyCaseForHousingAgencyWithDetails(caseId, user.agency_id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found or not assigned to your agency",
      });
    }

    const housing = caseData.housing_details;
    const { isComplete, missing } = checkHousingCompleteness(housing);

    if (!isComplete) {
      return res.status(400).json({
        success: false,
        message: "Cannot mark as ready - incomplete information",
        missing,
      });
    }

    const updatedCase = await markCaseReadyForArrival(caseId);

    try {
      await sendReadyForArrivalEmail({
        candidateEmail: caseData.candidate.email,
        candidateName: caseData.candidate.full_name || "Candidate",
        agencyName: user.agency.name || "Your Agency",
        caseNumber: caseData.case_number,
        caseId,
        destinationCountry: caseData.destination_country,
        housing: {
          housing_type: housing!.housing_type,
          housing_address: housing!.housing_address,
          monthly_rent_mad: housing!.monthly_rent_mad,
          agency_fee_amount: housing!.agency_fee_amount,
          lease_start_date: housing!.lease_start_date,
          arrival_date: housing!.arrival_date,
          flight_number: housing!.flight_number,
          airport_pickup_required: housing!.airport_pickup_required,
        },
      });
    } catch (emailError) {
      console.error("Email error:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: "Case marked as ready for arrival",
      data: updatedCase,
    });
  } catch (error) {
    console.error("Mark ready error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark case as ready",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
