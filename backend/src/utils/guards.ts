import { HttpError } from "./errors";

export function ensureCanEditVerification(actor: { user_id: string; role: string }, ownerId: string) {
  // Adjust to your rules (admin or the same company/agency owner).
  if (actor.role === "admin") return;
  if (actor.user_id === ownerId) return;
  throw new HttpError(403, "Not allowed to edit this verification");
}
