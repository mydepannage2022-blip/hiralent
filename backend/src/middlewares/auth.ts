import type { FastifyRequest, FastifyReply } from "fastify";

export async function authHook(req: FastifyRequest, _rep: FastifyReply) {
  // Replace this with your JWT/session logic and RBAC checks.
  // Attach user to `req.user`.
  (req as any).user = { user_id: "ADMIN_OR_REQUESTER_USER_ID", role: "admin" };
}
