import prisma from "../lib/prisma";

export const createUserProfile = async (
  user: { user_id: string; role: string },
  data: any
) => {
  if (user.role === "candidate") {
    return prisma.candidateProfile.create({
      data: {
        ...data,
        candidate_id: user.user_id, 
      },
    });
  }

  if (user.role === "recruiter") {
    return prisma.recruiterProfile.create({
      data: {
        ...data,
        recruiter_id: user.user_id, 
      },
    });
  }

  throw new Error("Unsupported role for profile creation");
};

export const getProfileByUserId = async (user_id: string) => {
  return prisma.user.findUnique({
    where: { user_id },
    include: {
      candidateProfile: true,  
      recruiterProfile: true,
    },
  });
};
