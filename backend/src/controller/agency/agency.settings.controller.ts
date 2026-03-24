import { Request, Response } from "express";
import {
  getUserWithPassword,
  verifyPassword,
  updatePassword,
  updateMfaEnabled,
  getNotificationsForUser,
  getUserExportData,
  getUserSettings,
} from "../../services/agency/agency.settings.service";

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

    const user = await getUserWithPassword(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await verifyPassword(
      currentPassword,
      user.password_hash
    );

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    await updatePassword(userId, newPassword);

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

    const updatedUser = await updateMfaEnabled(userId, enabled);

    return res.status(200).json({
      success: true,
      message: `Two-factor authentication ${enabled ? "enabled" : "disabled"} successfully`,
      data: {
        mfa_enabled: updatedUser.mfa_enabled,
      },
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

    const notifications = await getNotificationsForUser(userId);

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

    const user = await getUserExportData(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const data = {
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

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=agency-data-${new Date().toISOString().split("T")[0]}.json`
    );

    return res.status(200).json(data);
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

    const user = await getUserSettings(userId);

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