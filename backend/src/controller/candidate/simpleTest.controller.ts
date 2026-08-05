
import prisma from '../../lib/prisma';
import { z } from "zod";
import { SimpleTestService } from "../../services/candidate/simpleTest.service";

const service = new SimpleTestService(prisma);

const getCandidateId = (req: any) => req.user?.user_id || req.user?.id || req.userId;

/** Body schema for RUN */
const runSchema = z.object({
  questionId: z.string().min(1),
  language: z.string().min(1).max(32),
  code: z.string().min(1).max(200_000),
});

export class CandidateSimpleTestController {
  // POST /candidate/simple-tests/start
  static async start(req: any, res: any) {
    const candidateId = getCandidateId(req);
    if (!candidateId) return res.status(401).json({ message: "Unauthorized" });

    const { inviteId } = req.body ?? {};
    if (!inviteId) return res.status(400).json({ message: "inviteId is required" });

    try {
      const out = await service.startAttempt(candidateId, String(inviteId));
      return res.json(out);
    } catch (e: any) {
      if (e?.message === "INVITE_EXPIRED") return res.status(410).json({ message: "Invite expired" });
      if (e?.message === "FORBIDDEN") return res.status(403).json({ message: "Forbidden" });
      return res.status(500).json({ message: "Failed", error: e?.message });
    }
  }

  // GET /candidate/simple-tests/:attemptId
  static async get(req: any, res: any) {
    const candidateId = getCandidateId(req);
    if (!candidateId) return res.status(401).json({ message: "Unauthorized" });

    const { attemptId } = req.params;
    try {
      const out = await service.getTest(candidateId, String(attemptId));
      return res.json(out);
    } catch (e: any) {
      if (e?.message === "ATTEMPT_NOT_FOUND") return res.status(404).json({ message: "Attempt not found" });
      if (e?.message === "FORBIDDEN") return res.status(403).json({ message: "Forbidden" });
      return res.status(500).json({ message: "Failed", error: e?.message });
    }
  }

  // POST /candidate/simple-tests/:attemptId/run
  static async run(req: any, res: any) {
    const candidateId = getCandidateId(req);
    if (!candidateId) return res.status(401).json({ message: "Unauthorized" });

    const { attemptId } = req.params;

    try {
      const body = runSchema.parse(req.body);

      const out = await service.runCoding(candidateId, {
        attemptId: String(attemptId),
        questionId: String(body.questionId),
        language: body.language,
        code: body.code,
      });

      return res.status(200).json(out);
    } catch (e: any) {
      const msg = e?.message;

      if (msg === "ATTEMPT_NOT_FOUND") return res.status(404).json({ message: "Attempt not found" });
      if (msg === "QUESTION_NOT_IN_TEST") return res.status(400).json({ message: "Question not in this test" });
      if (msg === "QUESTION_NOT_CODING") return res.status(400).json({ message: "Question is not coding" });

      if (msg === "ATTEMPT_EXPIRED") return res.status(410).json({ message: "Attempt expired" });
      if (msg === "ATTEMPT_LOCKED") return res.status(423).json({ message: "Attempt locked" });

      if (msg === "FORBIDDEN") return res.status(403).json({ message: "Forbidden" });

      // zod or other
      return res.status(500).json({ message: "Failed", error: msg });
    }
  }

  // GET /candidate/simple-tests/submissions/:submissionId
  static async getSubmission(req: any, res: any) {
    const candidateId = getCandidateId(req);
    if (!candidateId) return res.status(401).json({ message: "Unauthorized" });

    const { submissionId } = req.params;

    try {
      const out = await service.getSubmission(candidateId, String(submissionId));
      return res.status(200).json(out);
    } catch (e: any) {
      const msg = e?.message;

      if (msg === "SUBMISSION_NOT_FOUND") return res.status(404).json({ message: "Submission not found" });
      if (msg === "SUBMISSION_FORBIDDEN_KIND") return res.status(403).json({ message: "Forbidden" });
      if (msg === "FORBIDDEN") return res.status(403).json({ message: "Forbidden" });

      return res.status(500).json({ message: "Failed", error: msg });
    }
  }

  // POST /candidate/simple-tests/:attemptId/submit
  static async submit(req: any, res: any) {
    const candidateId = getCandidateId(req);
    if (!candidateId) return res.status(401).json({ message: "Unauthorized" });

    const { attemptId } = req.params;
    const { answers } = req.body ?? {};
    if (!answers || typeof answers !== "object") return res.status(400).json({ message: "answers is required" });

    try {
      const out = await service.submit(candidateId, String(attemptId), answers);
      return res.json(out);
    } catch (e: any) {
      if (e?.message === "ATTEMPT_EXPIRED") return res.status(410).json({ message: "Attempt expired" });
      if (e?.message === "FORBIDDEN") return res.status(403).json({ message: "Forbidden" });
      return res.status(500).json({ message: "Failed", error: e?.message });
    }
  }
}
