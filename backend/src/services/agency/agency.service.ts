import { AgencyType, AgencyStatus } from "@prisma/client";
import prisma from '../../lib/prisma';


interface ApplyAgencyData {
  name: string;
  email: string;
  phone: string;
  type: AgencyType;
  description?: string;
  website?: string;
  operatingCountries?: string[];
  serviceCategories?: string[];
}

export const findAgencyByEmail = async (email: string) => {
  return prisma.agency.findUnique({ where: { email } });
};

export const createAgencyApplication = async (data: ApplyAgencyData) => {
  return prisma.agency.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      type: data.type,
      service_description: data.description || null,
      website: data.website || null,
      operating_countries: data.operatingCountries || [],
      service_categories: data.serviceCategories || [],
      status: AgencyStatus.PENDING,
    },
  });
};

export const getApplicationById = async (id: string) => {
  return prisma.agency.findUnique({
    where: { agency_id: id },
    select: {
      agency_id: true,
      name: true,
      email: true,
      status: true,
      created_at: true,
      rejection_reason: true,
    },
  });
};
