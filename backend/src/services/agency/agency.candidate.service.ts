import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const searchCandidates = async (searchTerm: string) => {
  return prisma.user.findMany({
    where: {
      role: "candidate",
      OR: [
        {
          full_name: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      user_id: true,
      full_name: true,
      email: true,
      phone_number: true,
    },
    take: 10,
    orderBy: {
      full_name: "asc",
    },
  });
};
