import prisma from '../../lib/prisma';
import bcrypt from "bcryptjs";


export const getUserWithPassword = async (userId: string) => {
  return prisma.user.findUnique({
    where: { user_id: userId },
    select: { user_id: true, password_hash: true },
  });
};

export const verifyPassword = async (
  plainPassword: string,
  hashedPassword: string
) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

export const updatePassword = async (userId: string, newPassword: string) => {
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  return prisma.user.update({
    where: { user_id: userId },
    data: {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    },
  });
};

export const updateMfaEnabled = async (userId: string, enabled: boolean) => {
  return prisma.user.update({
    where: { user_id: userId },
    data: {
      mfa_enabled: enabled,
      updated_at: new Date(),
    },
    select: {
      user_id: true,
      mfa_enabled: true,
    },
  });
};

export const getNotificationsForUser = async (userId: string) => {
  return prisma.notification.findMany({
    where: { recipient_id: userId },
    orderBy: { created_at: "desc" },
    take: 50,
  });
};

export const getUserExportData = async (userId: string) => {
  return prisma.user.findUnique({
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
};

export const getUserSettings = async (userId: string) => {
  return prisma.user.findUnique({
    where: { user_id: userId },
    select: {
      mfa_enabled: true,
    },
  });
};
