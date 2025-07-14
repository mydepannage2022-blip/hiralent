// src/services/agency.service.ts

import prisma from '../lib/prisma';
import { 
  UpdateAgencyInput, 
  AgencyDashboardResponse,
  AgencyTeamResponse,
  AgencySubscriptionResponse
} from '../types/agency.types';

// Get agency dashboard metrics
export const getDashboard = async (agency_id: string): Promise<AgencyDashboardResponse> => {
  try {
    // Get agency basic info
    const agency = await prisma.agency.findUnique({
      where: { agency_id },
      select: {
        agency_id: true,
        name: true,
        status: true,
        created_at: true
      }
    });

    if (!agency) {
      throw new Error('Agency not found');
    }

    // Get metrics in parallel
    const [
      jobsCount,
      activeJobsCount,
      recruitersCount,
      applicationsCount,
      recentApplicationsCount,
      recentActivities
    ] = await Promise.all([
      // Total jobs
      prisma.job.count({
        where: { agency_id }
      }),

      // Active jobs
      prisma.job.count({
        where: { 
          agency_id,
          status: 'active'
        }
      }),

      // Total recruiters
      prisma.user.count({
        where: {
          role: 'recruiter',
          agency_id
        }
      }),

      // Total applications
      prisma.application.count({
        where: {
          job: {
            agency_id
          }
        }
      }),

      // Recent applications (last 7 days)
      prisma.application.count({
        where: {
          job: {
            agency_id
          },
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Recent activities (last 10)
      getRecentActivities(agency_id, 10)
    ]);

    return {
      agency: {
        agency_id: agency.agency_id,
        name: agency.name,
        status: agency.status,
        created_at: agency.created_at
      },
      metrics: {
        total_jobs: jobsCount,
        active_jobs: activeJobsCount,
        total_recruiters: recruitersCount,
        total_applications: applicationsCount,
        recent_applications: recentApplicationsCount
      },
      recent_activities: recentActivities
    };

  } catch (error) {
    console.error('Error getting agency dashboard:', error);
    throw error;
  }
};

// Update agency information
export const updateAgency = async (agency_id: string, input: UpdateAgencyInput, updated_by: string) => {
  try {
    // Check if agency exists
    const existingAgency = await prisma.agency.findUnique({
      where: { agency_id }
    });

    if (!existingAgency) {
      throw new Error('Agency not found');
    }

    // Update agency
    const updatedAgency = await prisma.agency.update({
      where: { agency_id },
      data: {
        ...input,
        updated_at: new Date()
      }
    });

    // Log activity
    await logActivity(agency_id, updated_by, 'agency_updated', 'Agency information updated');

    return {
      agency_id: updatedAgency.agency_id,
      name: updatedAgency.name,
      billing_contact_email: updatedAgency.billing_contact_email,
      logo_url: updatedAgency.logo_url,
      updated_at: updatedAgency.updated_at,
      message: 'Agency updated successfully'
    };

  } catch (error) {
    console.error('Error updating agency:', error);
    throw error;
  }
};

// Get agency team (recruiters)
export const getTeam = async (agency_id: string, page: number = 1, limit: number = 10, status: string = 'all'): Promise<AgencyTeamResponse> => {
  try {
    const offset = (page - 1) * limit;
    
    // Build where clause
    const whereClause: any = {
      agency_id,
      role: 'recruiter'
    };

    if (status !== 'all') {
      whereClause.status = status;
    }

    // Get recruiters with pagination
    const [recruiters, totalCount, pendingInvites] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          user_id: true,
          full_name: true,
          email: true,
          position: true,
          status: true,
          created_at: true,
          last_login: true
        },
        skip: offset,
        take: limit,
        orderBy: {
          created_at: 'desc'
        }
      }),

      prisma.user.count({
        where: whereClause
      }),

      prisma.recruiterInvitation.count({
        where: {
          agency_id,
          status: 'pending'
        }
      })
    ]);

    return {
      recruiters: recruiters.map((recruiter:any) => ({
        user_id: recruiter.user_id,
        full_name: recruiter.full_name || '',
        email: recruiter.email,
        position: recruiter.position,
        status: recruiter.status,
        joined_at: recruiter.created_at,
        last_active: recruiter.last_login
      })),
      total_count: totalCount,
      pending_invites: pendingInvites
    };

  } catch (error) {
    console.error('Error getting agency team:', error);
    throw error;
  }
};

// Get agency subscription info
export const getSubscription = async (agency_id: string): Promise<AgencySubscriptionResponse> => {
  try {
    // Get agency subscription
    const subscription = await prisma.agencySubscription.findUnique({
      where: { agency_id },
      include: {
        plan: true
      }
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Get usage statistics
    const [jobsPosted, recruitersActive] = await Promise.all([
      prisma.job.count({
        where: { 
          agency_id,
          created_at: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) // This month
          }
        }
      }),

      prisma.user.count({
        where: {
          agency_id,
          role: 'recruiter',
          status: 'active'
        }
      })
    ]);

    return {
      plan: {
        plan_name: subscription.plan.name,
        plan_type: subscription.plan.type,
        job_posting_limit: subscription.plan.job_posting_limit,
        recruiter_limit: subscription.plan.recruiter_limit,
        price_per_month: subscription.plan.price_per_month
      },
      usage: {
        jobs_posted: jobsPosted,
        recruiters_active: recruitersActive
      },
      billing: {
        next_billing_date: subscription.next_billing_date,
        payment_status: subscription.payment_status
      }
    };

  } catch (error) {
    console.error('Error getting agency subscription:', error);
    throw error;
  }
};

// Get agency by ID (helper method)
export const getAgencyById = async (agency_id: string) => {
  try {
    const agency = await prisma.agency.findUnique({
      where: { agency_id },
      select: {
        agency_id: true,
        name: true,
        website: true,
        billing_contact_email: true,
        logo_url: true,
        status: true,
        owner_id: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!agency) {
      throw new Error('Agency not found');
    }

    return agency;

  } catch (error) {
    console.error('Error getting agency by ID:', error);
    throw error;
  }
};

// Check if user belongs to agency
export const checkUserAgencyAccess = async (user_id: string, agency_id: string): Promise<boolean> => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id },
      select: {
        role: true,
        agency_id: true,
        owned_agency: {
          select: {
            agency_id: true
          }
        }
      }
    });

    if (!user) {
      return false;
    }

    // Super admin has access to all agencies
    if (user.role === 'super_admin') {
      return true;
    }

    // Check if user owns the agency
    if (user.owned_agency?.agency_id === agency_id) {
      return true;
    }

    // Check if user is a member of the agency
    if (user.agency_id === agency_id) {
      return true;
    }

    return false;

  } catch (error) {
    console.error('Error checking user agency access:', error);
    return false;
  }
};

// Helper function - get recent activities
export const getRecentActivities = async (agency_id: string, limit: number = 10) => {
  try {
    const activities = await prisma.agencyActivity.findMany({
      where: { agency_id },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        activity_type: true,
        description: true,
        created_at: true
      }
    });

    return activities.map((activity:any) => ({
      activity_type: activity.activity_type,
      description: activity.description,
      timestamp: activity.created_at
    }));

  } catch (error) {
    console.error('Error getting recent activities:', error);
    return [];
  }
};

// Helper function - log activity
export const logActivity = async (agency_id: string, user_id: string, activity_type: string, description: string) => {
  try {
    await prisma.agencyActivity.create({
      data: {
        agency_id,
        user_id,
        activity_type,
        description,
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error as this is not critical
  }
};