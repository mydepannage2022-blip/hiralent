// backend/src/bootstrap/devStubs.ts
export function loadDevStubs() {
  // ---- Wafaa Stub ----
  (globalThis as any).question_client = {
    GetQuestion: (qid: string) => ({
      test_cases: [
        { input: "2 3\n", expected: "5\n" },
        { input: "10 15\n", expected: "25\n" },
      ],
      id: qid
    })
  };

  // ---- Ihssane Stub ----
  (globalThis as any).assessment_ai_client = {
    UpdateSkillRadar: (payload: any) => {
      console.log('[IHSSANE] UpdateSkillRadar', JSON.stringify(payload));
      return { ok: true };
    }
  };

  // ---- Vector DB Stub ----
  (globalThis as any).vector_db = {
    search: async (_: any) => []
  };
}
