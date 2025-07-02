import { Request, Response } from "express";
import * as UserService from "../services/user.service";

export const createProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const data = req.validatedBody;

    const profile = await UserService.createUserProfile(user, data);

    res.status(201).json({ message: "Profile created", profile });
  } catch (error) {
    res.status(500).json({ message: "Failed to create profile", error });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    const profile = await UserService.getProfileByUserId(userId);

    res.json({ profile });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile", error });
  }
};
