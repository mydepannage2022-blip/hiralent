import prisma from "../lib/prisma";

export const createJob = async (recruiter_id: string, data: any) => {
  return prisma.recruiterJob.create({
    data: {
      ...data,
      recruiter_id,
    },
  });
};

export const updateJob = async (job_id: string, data: any) => {
  return prisma.recruiterJob.update({
    where: { job_id },
    data,
  });
};
