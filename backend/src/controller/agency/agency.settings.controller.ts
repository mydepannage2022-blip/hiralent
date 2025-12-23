import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// PUT /api/v1/agency/settings/password - Change password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, password_hash: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { user_id: userId },
      data: { 
        password_hash: newPasswordHash,
        updated_at: new Date()
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

// PUT /api/v1/agency/settings/2fa - Toggle 2FA
export const toggle2FA = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const { enabled } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Update mfa_enabled in User model
    const updatedUser = await prisma.user.update({
      where: { user_id: userId },
      data: { 
        mfa_enabled: enabled,
        updated_at: new Date()
      },
      select: {
        user_id: true,
        mfa_enabled: true,
      }
    });

    return res.status(200).json({
      success: true,
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        mfa_enabled: updatedUser.mfa_enabled
      }
    });
  } catch (error) {
    console.error("Toggle 2FA error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update 2FA settings",
    });
  }
};

// GET /api/v1/agency/settings/notifications - Get notification preferences
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Get notifications for this user
    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

// PUT /api/v1/agency/settings/notifications - Update notification preferences
export const updateNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    const {
      emailNotifications,
      caseUpdates,
      newClients,
      systemAlerts,
      weeklyReports,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // For now, just return success
    // TODO: Create a UserNotificationPreferences table to store these settings

    return res.status(200).json({
      success: true,
      message: "Notification preferences updated successfully",
      data: {
        emailNotifications,
        caseUpdates,
        newClients,
        systemAlerts,
        weeklyReports,
      },
    });
  } catch (error) {
    console.error("Update notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification preferences",
    });
  }
};

// GET /api/v1/agency/settings/export-data - Export user data
export const exportData = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Get user data with agency and cases
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        role: true,
        phone_number: true,
        created_at: true,
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
            success_rate: true,
            total_cases_handled: true,
            created_at: true,
            cases: {
              select: {
                case_id: true,
                case_number: true,
                service_type: true,
                priority_level: true,
                status: true,
                origin_country: true,
                destination_country: true,
                destination_city: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const exportData = {
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone_number: user.phone_number,
        created_at: user.created_at,
      },
      agency: user.agency,
      exported_at: new Date().toISOString(),
    };

    // Set headers for file download
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=agency-data-${new Date().toISOString().split("T")[0]}.json`
    );

    return res.status(200).json(exportData);
  } catch (error) {
    console.error("Export data error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export data",
    });
  }
};

// GET /api/v1/agency/settings - Get all settings
export const getSettings = async (req: Request, res: Response) => {
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
        mfa_enabled: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        mfa_enabled: user.mfa_enabled,
        // Add other settings here as needed
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch settings",
    });
  }
};