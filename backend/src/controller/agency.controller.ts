import { Request, Response, NextFunction } from 'express';
import {
  checkUserAgencyAccess,
  getDashboard,
  updateAgency,
  getTeam,
  getSubscription,
  getAgencyById
} from '../services/agency.service';
import { UpdateAgencyInput } from '../types/agency.types';

export const getDashboardController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.user_id;
    const agency_id = req.user?.agency_id;

    if (!user_id || !agency_id) {
      return res.status(401).json({ success: false, message: 'User not authenticated or not associated with agency' });
    }

    const hasAccess = await checkUserAgencyAccess(user_id, agency_id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied to this agency' });
    }

    const result = await getDashboard(agency_id);
    res.status(200).json({ success: true, data: result, message: 'Dashboard data retrieved successfully' });

  } catch (error: any) {
    console.error('Error in getDashboard controller:', error);
    if (error.message === 'Agency not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const updateAgencyController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.user_id;
    const agency_id = req.user?.agency_id;
    const input: UpdateAgencyInput = req.body;

    if (!user_id || !agency_id) {
      return res.status(401).json({ success: false, message: 'User not authenticated or not associated with agency' });
    }

    const hasAccess = await checkUserAgencyAccess(user_id, agency_id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied to this agency' });
    }

    const result = await updateAgency(agency_id, input, user_id);
    res.status(200).json({ success: true, data: result, message: 'Agency updated successfully' });

  } catch (error: any) {
    console.error('Error in updateAgency controller:', error);
    if (error.message === 'Agency not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const getTeamController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.user_id;
    const agency_id = req.user?.agency_id;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string || 'all';

    if (!user_id || !agency_id) {
      return res.status(401).json({ success: false, message: 'User not authenticated or not associated with agency' });
    }

    const hasAccess = await checkUserAgencyAccess(user_id, agency_id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied to this agency' });
    }

    const result = await getTeam(agency_id, page, limit, status);
    res.status(200).json({
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        total: result.total_count,
        pages: Math.ceil(result.total_count / limit)
      },
      message: 'Team data retrieved successfully'
    });

  } catch (error: any) {
    console.error('Error in getTeam controller:', error);
    next(error);
  }
};

export const getSubscriptionController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user_id = req.user?.user_id;
    const agency_id = req.user?.agency_id;

    if (!user_id || !agency_id) {
      return res.status(401).json({ success: false, message: 'User not authenticated or not associated with agency' });
    }

    const hasAccess = await checkUserAgencyAccess(user_id, agency_id);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied to this agency' });
    }

    const result = await getSubscription(agency_id);
    res.status(200).json({ success: true, data: result, message: 'Subscription data retrieved successfully' });

  } catch (error: any) {
    console.error('Error in getSubscription controller:', error);
    if (error.message === 'Subscription not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const getAgencyByIdController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agencyId } = req.params;
    const user_id = req.user?.user_id;
    const user_role = req.user?.role;

    if (!user_id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (user_role !== 'super_admin') {
      const hasAccess = await checkUserAgencyAccess(user_id, agencyId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: 'Access denied to this agency' });
      }
    }

    const result = await getAgencyById(agencyId);
    res.status(200).json({ success: true, data: result, message: 'Agency data retrieved successfully' });

  } catch (error: any) {
    console.error('Error in getAgencyById controller:', error);
    if (error.message === 'Agency not found') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};
