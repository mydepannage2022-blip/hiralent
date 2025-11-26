import { Request, Response } from "express";
import { PrismaClient, AgencyStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// GET /api/v1/admin/agencies/pending
export const getPendingAgencies = async (req: Request, res: Response) => {
  try {
    const agencies = await prisma.agency.findMany({
      where: { status: AgencyStatus.PENDING },
      orderBy: { created_at: "desc" },
      select: {
        agency_id: true,
        name: true,
        email: true,
        phone: true,
        type: true,
        service_description: true,
        website: true,
        operating_countries: true,
        service_categories: true,
        business_license_url: true,
        created_at: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: agencies,
      count: agencies.length,
    });
  } catch (error) {
    console.error("Get pending agencies error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending agencies",
    });
  }
};

// GET /api/v1/admin/agencies/all
export const getAllAgencies = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const whereClause = status ? { status: status as AgencyStatus } : {};

    const agencies = await prisma.agency.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      select: {
        agency_id: true,
        name: true,
        email: true,
        phone: true,
        type: true,
        status: true,
        service_description: true,
        website: true,
        operating_countries: true,
        service_categories: true,
        business_license_url: true,
        rejection_reason: true,
        approved_at: true,
        approved_by: true,
        created_at: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: agencies,
      count: agencies.length,
    });
  } catch (error) {
    console.error("Get all agencies error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch agencies",
    });
  }
};

// GET /api/v1/admin/agencies/:id
export const getAgencyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agency = await prisma.agency.findUnique({
      where: { agency_id: id },
    });

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
    console.error("Get agency by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch agency",
    });
  }
};

// POST /api/v1/admin/agencies/:id/approve
export const approveAgency = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user?.user_id;

    // Find the agency
    const agency = await prisma.agency.findUnique({
      where: { agency_id: id },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    if (agency.status !== AgencyStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Agency is already ${agency.status}`,
      });
    }

    // Generate random password
    const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create User for agency admin
    const newUser = await prisma.user.create({
      data: {
        email: agency.email!,
        password_hash: hashedPassword,
        full_name: agency.name,
        role: "agency_admin",
        is_email_verified: true,
        agency_id: agency.agency_id,
      },
    });

    // Update Agency
    const updatedAgency = await prisma.agency.update({
      where: { agency_id: id },
      data: {
        status: AgencyStatus.APPROVED,
        owner_user_id: newUser.user_id,
        approved_at: new Date(),
        approved_by: adminId || "system",
        billing_contact_email: agency.email,
      },
    });

    // Create AgencyAdminProfile
    await prisma.agencyAdminProfile.create({
      data: {
        admin_id: newUser.user_id,
        phone_number: agency.phone,
      },
    });

    // TODO: Send email with credentials to agency

    return res.status(200).json({
      success: true,
      message: "Agency approved successfully",
      data: {
        agency_id: updatedAgency.agency_id,
        name: updatedAgency.name,
        status: updatedAgency.status,
        user_id: newUser.user_id,
        temp_password: tempPassword, // Remove in production, send via email instead
      },
    });
  } catch (error) {
    console.error("Approve agency error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve agency",
    });
  }
};

// POST /api/v1/admin/agencies/:id/reject
export const rejectAgency = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).user?.user_id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    // Find the agency
    const agency = await prisma.agency.findUnique({
      where: { agency_id: id },
    });

    if (!agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    if (agency.status !== AgencyStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Agency is already ${agency.status}`,
      });
    }

    // Update Agency
    const updatedAgency = await prisma.agency.update({
      where: { agency_id: id },
      data: {
        status: AgencyStatus.REJECTED,
        rejection_reason: reason,
        approved_by: adminId || "system",
        approved_at: new Date(),
      },
    });

    // TODO: Send rejection email to agency

    return res.status(200).json({
      success: true,
      message: "Agency rejected",
      data: {
        agency_id: updatedAgency.agency_id,
        name: updatedAgency.name,
        status: updatedAgency.status,
        rejection_reason: updatedAgency.rejection_reason,
      },
    });
  } catch (error) {
    console.error("Reject agency error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject agency",
    });
  }
};

// GET /api/v1/admin/agencies/stats
export const getAgencyStats = async (req: Request, res: Response) => {
  try {
    // Get counts by status
    const [pending, approved, rejected, all] = await Promise.all([
      prisma.agency.count({ where: { status: AgencyStatus.PENDING } }),
      prisma.agency.count({ where: { status: AgencyStatus.APPROVED } }),
      prisma.agency.count({ where: { status: AgencyStatus.REJECTED } }),
      prisma.agency.findMany({
        where: { status: AgencyStatus.PENDING },
        select: { created_at: true },
      }),
    ]);

    // Calculate "This Week" (applications from last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const thisWeek = await prisma.agency.count({
      where: {
        status: AgencyStatus.PENDING,
        created_at: { gte: oneWeekAgo },
      },
    });

    // Calculate "Urgent" (pending > 7 days)
    const urgent = await prisma.agency.count({
      where: {
        status: AgencyStatus.PENDING,
        created_at: { lt: oneWeekAgo },
      },
    });

    // Calculate average processing time (for approved/rejected agencies)
    const processedAgencies = await prisma.agency.findMany({
      where: {
        status: { in: [AgencyStatus.APPROVED, AgencyStatus.REJECTED] },
        approved_at: { not: null },
      },
      select: {
        created_at: true,
        approved_at: true,
      },
    });

    let avgProcessingDays = 0;
    if (processedAgencies.length > 0) {
      const totalDays = processedAgencies.reduce((sum, agency) => {
        const created = new Date(agency.created_at).getTime();
        const processed = new Date(agency.approved_at!).getTime();
        const days = (processed - created) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      avgProcessingDays = Math.round((totalDays / processedAgencies.length) * 10) / 10;
    }

    return res.status(200).json({
      success: true,
      data: {
        totalPending: pending,
        totalApproved: approved,
        totalRejected: rejected,
        thisWeek,
        urgent,
        avgProcessingDays,
      },
    });
  } catch (error) {
    console.error("Get agency stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch agency stats",
    });
  }
};