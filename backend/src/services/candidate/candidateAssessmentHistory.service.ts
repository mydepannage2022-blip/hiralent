import prisma from "../../lib/prisma";

export class CandidateAssessmentHistoryService {
  static async listCompleted(candidateId: string) {
    // sessions completed = SUBMITTED + (optionnel) EXPIRED/ABANDONED si tu veux les afficher
    const sessions = await prisma.candidateAssessmentSession.findMany({
      where: {
        candidate_id: candidateId,
        status: { in: ["SUBMITTED", "EXPIRED"] }, // tu peux garder juste SUBMITTED si tu veux
      },
      orderBy: { submitted_at: "desc" },
      select: {
        session_id: true,
        assessment_id: true,
        status: true,
        started_at: true,
        submitted_at: true,
        current_index: true,
        created_at: true,
        updated_at: true,

        // si tu as ces champs dans ton schema, garde-les, sinon supprime-les:
        // expires_at: true,
        // duration_sec: true,

        assessment: {
          select: {
            assessment_id: true,
            title: true,
            time_limit: true,
            total_questions: true,
            skill_category: true,
            difficulty: true,
          },
        },
      },
    });

    // Mapper pour renvoyer { session, assessment, job }
    return sessions.map((s) => ({
      session: {
        session_id: s.session_id,
        status: s.status,
        started_at: s.started_at,
        submitted_at: s.submitted_at,
        current_index: s.current_index,
        created_at: s.created_at,
        updated_at: s.updated_at,
      },
      assessment: s.assessment,
      job: (s as any).job ?? null,
    }));
  }
}
