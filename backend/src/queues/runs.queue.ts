type RunJob = { submissionId: string; assessmentId: string; questionId: string; language: string };

const q: RunJob[] = [];

export function enqueueRunInMemory(job: RunJob) {
  q.push(job);
}

export function nextRunJob(): RunJob | undefined {
  return q.shift();
}
