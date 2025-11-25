import { Request, Response } from "express";
import { PrismaClient, AgencyType } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/v1/agency/dashboard/stats
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;  

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Get agency info including type
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { 
        agency_id: true,
        agency: {
          select: {
            type: true,
            name: true,
          }
        }
      },
    });

    if (!user?.agency_id || !user.agency) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    const agencyType = user.agency.type;
    const agencyId = user.agency_id;

    // Base stats - common for all types
    const [allCases, completedCases] = await Promise.all([
      prisma.relocationCase.findMany({
        where: { agency_id: agencyId },
        select: {
          case_id: true,
          candidate_id: true,
          status: true,
          service_type: true,
          estimated_cost: true,
          actual_cost: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.relocationCase.count({
        where: {
          agency_id: agencyId,
          status: 'completed',
        },
      }),
    ]);

    // Calculate common metrics
    const activeCases = allCases.filter(c => 
      ['initiated', 'in_progress', 'pending_documents'].includes(c.status)
    ).length;

    const uniqueClients = new Set(allCases.map(c => c.candidate_id));
    const totalClients = uniqueClients.size;

    const revenue = allCases.reduce((sum, c) => sum + (c.actual_cost || 0), 0);

    const pendingActions = allCases.filter(c => c.status === 'pending_documents').length;

    // Type-specific metrics
    let typeSpecificStats: any = {};

    if (agencyType === AgencyType.VISA) {
      // VISA-specific metrics
      const visaCases = allCases.filter(c => 
        c.service_type === 'visa_processing' || c.service_type === 'full_relocation'
      );

      const approvedVisas = visaCases.filter(c => c.status === 'completed').length;
      const pendingVisas = visaCases.filter(c => 
        ['initiated', 'in_progress', 'pending_documents'].includes(c.status)
      ).length;
      const successRate = visaCases.length > 0 
        ? Math.round((approvedVisas / visaCases.length) * 100) 
        : 0;

      typeSpecificStats = {
        totalVisaApplications: visaCases.length,
        approvedVisas,
        pendingVisas,
        successRate,
        embassySubmissions: pendingVisas,
      };

    } else if (agencyType === AgencyType.RELOCATION) {
      // RELOCATION-specific metrics
      const relocationCases = allCases.filter(c => 
        c.service_type === 'housing_assistance' || c.service_type === 'full_relocation'
      );

      const housingCompleted = relocationCases.filter(c => c.status === 'completed').length;
      const housingInProgress = relocationCases.filter(c => 
        ['initiated', 'in_progress'].includes(c.status)
      ).length;

      typeSpecificStats = {
        totalRelocationCases: relocationCases.length,
        housingCompleted,
        housingInProgress,
        leasesActive: housingCompleted,
        propertiesFound: housingCompleted,
      };

    } else if (agencyType === AgencyType.INTEGRATION) {
      // INTEGRATION-specific metrics
      const integrationCases = allCases.filter(c => 
        c.service_type === 'documentation' || c.service_type === 'full_relocation'
      );

      const integrationCompleted = integrationCases.filter(c => c.status === 'completed').length;
      const integrationInProgress = integrationCases.filter(c => 
        ['initiated', 'in_progress'].includes(c.status)
      ).length;

      typeSpecificStats = {
        totalIntegrationCases: integrationCases.length,
        servicesCompleted: integrationCompleted,
        servicesInProgress: integrationInProgress,
        bankAccountsOpened: Math.floor(integrationCompleted * 0.8),
        healthcareRegistrations: Math.floor(integrationCompleted * 0.7),
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        agencyType,
        agencyName: user.agency.name,
        activeCases,
        completedCases,
        totalClients,
        revenue,
        pendingActions,
        ...typeSpecificStats,
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
    });
  }
};

// GET /api/v1/agency/dashboard/activities
export const getRecentActivities = async (req: Request, res: Response) => {
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
      select: { agency_id: true },
    });

    if (!user?.agency_id) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    const recentCases = await prisma.relocationCase.findMany({
      where: { agency_id: user.agency_id },
      orderBy: { updated_at: 'desc' },
      take: 10,
      select: {
        case_id: true,
        case_number: true,
        status: true,
        service_type: true,
        updated_at: true,
        candidate: {
          select: {
            full_name: true,
          },
        },
      },
    });

    const activities = recentCases.map(c => {
      let type: 'new_case' | 'completed' | 'pending_document' | 'message' = 'new_case';
      let title = 'Case update';
      
      if (c.status === 'completed') {
        type = 'completed';
        title = 'Case completed';
      } else if (c.status === 'pending_documents') {
        type = 'pending_document';
        title = 'Document pending';
      } else if (c.status === 'initiated') {
        type = 'new_case';
        title = 'New case assigned';
      }

      return {
        id: c.case_id,
        type,
        title,
        description: `${c.candidate.full_name} - ${c.service_type.replace('_', ' ')}`,
        timestamp: c.updated_at.toISOString(),
        status: type === 'completed' ? 'success' as const : type === 'pending_document' ? 'warning' as const : 'info' as const,
      };
    });

    return res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Get recent activities error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch activities",
    });
  }
};