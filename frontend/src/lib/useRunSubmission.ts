import { useEffect, useRef, useState } from 'react';

type Status = 'idle' | 'pending' | 'running' | 'done' | 'error';

export function useRunSubmission() {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<any>(null);
  const eventRef = useRef<EventSource | null>(null);

  async function run(payload: {
    assessmentId: string;
    questionId: string;
    language: string;
    code: string;
    userId?: string; // candidate_id (optional for dev, we'll default below)
  }) {
    try {
      setStatus('pending');

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      // In local dev, allow missing userId by defaulting to 'dev-user' to match backend dev seed.
      if (!payload.userId && (process.env.NODE_ENV !== 'production')) {
        payload.userId = process.env.NEXT_PUBLIC_DEV_USER || 'dev-user';
      }
      const res = await fetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      if (!res?.submissionId) {
        setStatus('error');
        return;
      }

      setStatus('running');
      const streamBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      // Server exposes stream at /submissions/stream/:id
      eventRef.current = new EventSource(`${streamBase}/submissions/stream/${res.submissionId}`);

      eventRef.current.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'final') {
          setResult(msg);
          setStatus('done');
          eventRef.current?.close();
        }
        // optionally handle incremental logs here
      };

      eventRef.current.onerror = () => {
        setStatus('error');
        eventRef.current?.close();
      };
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  }

  useEffect(() => () => eventRef.current?.close(), []);
  return { status, result, run };
}
