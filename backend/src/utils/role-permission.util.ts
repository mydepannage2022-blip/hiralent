import prisma from "../lib/prisma";

export const hasPermission = async (
  role: string,
  module: string,
  requiredLevel: string
): Promise<boolean> => {
  const permission = await prisma.rolePermission.findFirst({
    where: {
      role_name: role,
      module,
    },
  });

  if (!permission) return false;

  const levels = ["read", "write", "admin"];
  const userLevelIndex = levels.indexOf(permission.access_level);
  const requiredLevelIndex = levels.indexOf(requiredLevel);

  return userLevelIndex >= requiredLevelIndex;
};
