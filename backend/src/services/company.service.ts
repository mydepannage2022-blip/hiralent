import prisma from '../lib/prisma';
import { CreateCompanyProfileData , UpdateCompanyProfileData} from '../types/company.types';

export const createCompanyProfile = async (userId: string, data: CreateCompanyProfileData) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, role: true, companyProfile: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.companyProfile) {
      throw new Error('Company profile already exists');
    }

    const companyProfile = await prisma.companyProfile.create({
      data: {
        company_id: userId,
        company_name: data.company_name,
        display_name: data.display_name || data.company_name,
        industry: data.industry,
        company_size: data.company_size,
        website: data.website,
        headquarters: data.location,
        description: data.description,
        founded_year: data.founded_year,
        contact_number: data.contact_number,
        linkedin_profile: data.linkedin_profile,
        twitter_handle: data.twitter_handle,
        facebook_page: data.facebook_page,
        business_type: data.business_type,
        employee_count: data.employee_count,
        remote_policy: data.remote_policy,
        registration_number: data.registration_number, 
        full_address: data.full_address,             
        verified: false, 
        rating: null,
        total_jobs_posted: 0,
        active_jobs_count: 0
      }
    });

    return {
      profile: companyProfile,
      user: {
        user_id: user.user_id,
        role: user.role
      }
    };
  } catch (error: any) {
    console.error('Error in createCompanyProfile service:', error);
    throw error;
  }
};

export const getCompanyProfile = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        companyProfile: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const userRoleLower = (user.role || '').toString().toLowerCase();
    if (userRoleLower !== 'company' && userRoleLower !== 'company_admin') {
      throw new Error('User is not a company');
    }

    return {
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_email_verified: user.is_email_verified,
        created_at: user.created_at
      },
      profile: user.companyProfile
    };
  } catch (error: any) {
    console.error('Error in getCompanyProfile service:', error);
    throw error;
  }
};

export const updateCompanyProfile = async (userId: string, data: UpdateCompanyProfileData) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, role: true, companyProfile: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const userRoleLowerUpdate = (user.role || '').toString().toLowerCase();
    if (userRoleLowerUpdate !== 'company' && userRoleLowerUpdate !== 'company_admin') {
      throw new Error('Only company users can update company profiles');
    }

    if (!user.companyProfile) {
      throw new Error('Company profile not found');
    }

    const updatedProfile = await prisma.companyProfile.update({
      where: { company_id: userId },
      data: {
        ...data,
        updated_at: new Date()
      }
    });

    return updatedProfile;
  } catch (error: any) {
    console.error('Error in updateCompanyProfile service:', error);
    throw error;
  }
};

export const getCompanyStats = async (userId: string) => {
  try {
    const companyProfile = await prisma.companyProfile.findUnique({
      where: { company_id: userId },
      select: {
        company_id: true,
        company_name: true,
        total_jobs_posted: true,
        active_jobs_count: true,
        rating: true,
        verified: true,
        created_at: true
      }
    });

    if (!companyProfile) {
      throw new Error('Company profile not found');
    }

    const stats = {
      profile: companyProfile,
      metrics: {
        total_jobs: companyProfile.total_jobs_posted || 0,
        active_jobs: companyProfile.active_jobs_count || 0,
        profile_completion: calculateProfileCompletion(companyProfile),
        member_since: companyProfile.created_at,
        is_verified: companyProfile.verified,
        rating: companyProfile.rating || 0
      }
    };

    return stats;
  } catch (error: any) {
    console.error('Error in getCompanyStats service:', error);
    throw error;
  }
};

const calculateProfileCompletion = (profile: any): number => {
  const requiredFields = [
    'company_name',
    'industry', 
    'company_size',
    'headquarters',
    'description'
  ];
  
  const optionalFields = [
    'website',
    'contact_number',
    'linkedin_profile',
    'founded_year'
  ];

  let completedRequired = 0;
  let completedOptional = 0;

  requiredFields.forEach(field => {
    if (profile[field]) completedRequired++;
  });

  optionalFields.forEach(field => {
    if (profile[field]) completedOptional++;
  });

  const requiredScore = (completedRequired / requiredFields.length) * 70;
  const optionalScore = (completedOptional / optionalFields.length) * 30;

  return Math.round(requiredScore + optionalScore);
};
