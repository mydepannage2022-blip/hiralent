type Job = { runId: string; subject: "COMPANY" | "AGENCY"; subjectId: string };

const q: Job[] = [];

export function enqueueVerification(job: Job) {
  q.push(job);
}

export function nextJob(): Job | undefined {
  return q.shift();
}
