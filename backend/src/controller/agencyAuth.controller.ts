import { Request, Response, NextFunction } from 'express';
import {
  createAgency,
  approveAgency,
  inviteRecruiter,
  createAdminProfile,
  getAuthContext
} from '../services/agencyAuth.service';

import {
  CreateAgencyInput,
  InviteRecruiterInput,
  AgencyAdminProfileInput,
  ApproveAgencyInput
} from '../types/agencyAuth.types';

export const createAgencyController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user_id = req.user?.user_id;
    const input: CreateAgencyInput = req.body;

    if (!user_id) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const result = await createAgency(user_id, input);
    res.status(201).json({ success: true, data: result, message: 'Agency created successfully' });
  } catch (error: any) {
    console.error('Error in createAgency controller:', error);

    if (error.message === 'User already has an agency') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }

    next(error);
  }
};

export const approveAgencyController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agency_id = req.params.agencyId;
    const admin_id = req.user?.user_id;
    const input: ApproveAgencyInput = req.body;

    if (!admin_id) {
      res.status(401).json({ success: false, message: 'Admin not authenticated' });
      return;
    }

    const result = await approveAgency(agency_id, admin_id, input);
    res.status(200).json({ success: true, data: result, message: 'Agency approved successfully' });
  } catch (error: any) {
    console.error('Error in approveAgency controller:', error);

    if (error.message === 'Agency not found' || error.message === 'Agency is not in pending status') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }

    next(error);
  }
};

export const inviteRecruiterController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user_id = req.user?.user_id;
    const agency_id = req.user?.agency_id;
    const input: InviteRecruiterInput = req.body;

    if (!user_id || !agency_id) {
      res.status(401).json({ success: false, message: 'User not authenticated or not associated with agency' });
      return;
    }

    const result = await inviteRecruiter(agency_id, user_id, input);
    res.status(201).json({ success: true, data: result, message: 'Recruiter invited successfully' });
  } catch (error: any) {
    console.error('Error in inviteRecruiter controller:', error);

    if (
      error.message === 'Agency not found or not active' ||
      error.message === 'User with this email already exists'
    ) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }

    next(error);
  }
};

export const createAdminProfileController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user_id = req.user?.user_id;
    const input: AgencyAdminProfileInput = req.body;

    if (!user_id) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const result = await createAdminProfile(user_id, input);
    res.status(200).json({ success: true, data: result, message: 'Admin profile updated successfully' });
  } catch (error: any) {
    console.error('Error in createAdminProfile controller:', error);
    next(error);
  }
};

export const agencyAuthMeController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user_id = req.user?.user_id;

    if (!user_id) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    const result = await getAuthContext(user_id);
    res.status(200).json({ success: true, data: result, message: 'Auth context retrieved successfully' });
  } catch (error: any) {
    console.error('Error in agencyAuthMe controller:', error);

    if (error.message === 'User not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }

    next(error);
  }
};
