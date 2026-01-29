import type { NotificationDTO } from "@/src/types/notifications.types";

export type CandidateNotificationTag = "Message" | "Apply Result" | "New Job";
export type CompanyNotificationTag = "Message" | "Meeting" | "New Applications";

export function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// ✅ mapping basé sur tes NotificationType Prisma actuels (safe)
export function candidateTagFromType(type: string): CandidateNotificationTag {
  const t = (type || "").toUpperCase();

  // Ex: APPLICATION_CONFIRMED / APPLICATION_STATUS_CHANGED / ASSESSMENT_INVITE / INTERVIEW_INVITE
  if (t.includes("APPLICATION")) return "Apply Result";

  // si plus tard tu ajoutes NEW_JOB_POSTED
  if (t.includes("JOB") && (t.includes("NEW") || t.includes("POSTED"))) return "New Job";

  return "Message";
}

export function companyTagFromType(type: string): CompanyNotificationTag {
  const t = (type || "").toUpperCase();

  // si plus tard tu ajoutes NEW_APPLICATION / APPLICATION_RECEIVED etc
  if (t.includes("APPLICATION")) return "New Applications";
  if (t.includes("MEETING") || t.includes("INTERVIEW")) return "Meeting";

  return "Message";
}

export function buildTitle(n: NotificationDTO) {
  // ✅ ton backend met title + message
  // UI: on garde title si présent, sinon message
  return n.title?.trim() ? n.title : n.message;
}
