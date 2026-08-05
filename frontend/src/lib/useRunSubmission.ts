import { useEffect, useRef, useState } from 'react';
import { fetchStreamTicket } from './streamTicket';
import { API_V1_BASE } from '@/src/lib/config/api';

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

      const API_BASE = API_V1_BASE;
      // The submission owner is derived server-side from the access token — no userId is sent.
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const res = await fetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      if (!res?.submissionId) {
        setStatus('error');
        return;
      }

      setStatus('running');
      const streamBase = API_V1_BASE;
      // EventSource can't send an Authorization header. Rather than putting the real access
      // token in the URL, mint a short-lived, submission-bound stream ticket (behind
      // checkAuth + ownership) and pass that as ?ticket=.
      const ticket = await fetchStreamTicket(streamBase, res.submissionId, token);
      const qs = ticket ? `?ticket=${encodeURIComponent(ticket)}` : '';
      eventRef.current = new EventSource(`${streamBase}/submissions/stream/${res.submissionId}${qs}`);

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
