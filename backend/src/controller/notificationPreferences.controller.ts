import { Request, Response } from "express";
import {
  getNotificationPreferences,
  upsertNotificationPreferences,
} from "../services/notificationPreferences.service";

// GET /api/v1/notification-preferences - current user's notification toggles
export const getPreferencesController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const preferences = await getNotificationPreferences(userId);
    return res.status(200).json({ success: true, data: preferences });
  } catch (error) {
    console.error("Get notification preferences error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification preferences",
    });
  }
};

// PUT /api/v1/notification-preferences - persist current user's toggles
export const updatePreferencesController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const preferences = await upsertNotificationPreferences(userId, req.body);
    return res.status(200).json({
      success: true,
      message: "Notification preferences updated successfully",
      data: preferences,
    });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification preferences",
    });
  }
};
