import prisma from "../lib/prisma";

export const createApplication = async (data: {
  candidate_id: string;
  job_id: string;
  cover_letter?: string;
}) => {
  return prisma.jobApplication.create({
    data: {
      ...data,
      status: "applied", 
    },
  });
};

export const updateApplicationStatus = async (
  application_id: string,
  status: string
) => {
  return prisma.jobApplication.update({
    where: { application_id }, 
    data: { status },
  });
};
