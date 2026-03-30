import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AGENCY_PROFILE_SELECT = {
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
  total_cases_handled: true,
  success_rate: true,
  created_at: true,
} as const;

export const getAgencyByUserId = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    include: {
      agency: {
        select: AGENCY_PROFILE_SELECT,
      },
    },
  });
  return user?.agency || null;
};

export const getAgencyIdForUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { agency_id: true },
  });
  return user?.agency_id || null;
};

interface UpdateProfileData {
  name?: string;
  phone?: string;
  website?: string;
  service_description?: string;
  operating_countries?: string[];
  languages_supported?: string[];
}

export const updateAgencyProfile = async (
  agencyId: string,
  data: UpdateProfileData
) => {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.website !== undefined) updateData.website = data.website;
  if (data.service_description !== undefined)
    updateData.service_description = data.service_description;
  if (data.operating_countries !== undefined)
    updateData.operating_countries = data.operating_countries;
  if (data.languages_supported !== undefined)
    updateData.languages_supported = data.languages_supported;

  return prisma.agency.update({
    where: { agency_id: agencyId },
    data: updateData,
    select: AGENCY_PROFILE_SELECT,
  });
};
