"use client";
import { useEffect, useRef } from 'react';
import { api } from '../lib/auth/auth.api';

type SSEMessage = {
  type?: string;
  payload?: any;
};

export function useSubmissionSSE(submissionId: string | null, onMessage: (msg: SSEMessage) => void) {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // close if no id provided
    if (!submissionId) {
      if (esRef.current) {
        try { esRef.current.close(); } catch {}
        esRef.current = null;
      }
      return;
    }

    // Close any existing connection
    if (esRef.current) {
      try { esRef.current.close(); } catch {}
      esRef.current = null;
    }

    // Build absolute SSE url using axios baseURL when available
    let base = '';
    try {
      base = (api && (api.defaults && (api.defaults.baseURL as string))) || (process.env.NEXT_PUBLIC_BASE_URL || '');
    } catch {}

    const baseNoSlash = base.replace(/\/$/, '');
    const url = baseNoSlash
      ? (baseNoSlash.includes('/api/') ? `${baseNoSlash}/submissions/stream/${encodeURIComponent(submissionId)}` : `${baseNoSlash}/api/v1/submissions/stream/${encodeURIComponent(submissionId)}`)
      : `/api/v1/submissions/stream/${encodeURIComponent(submissionId)}`;

    // Debug: notify caller of constructed URL (optional)
    try { console.debug('[useSubmissionSSE] connecting to', url); } catch {}

    // EventSource supports an init dict in some browsers; prefer withCredentials to send cookies when allowed.
    // For debugging, try withCredentials first and fall back to a non-credentialed EventSource if that fails.
    let es: EventSource;
    try {
      if (typeof EventSource !== 'undefined' && (EventSource as any).prototype) {
        try {
          es = new (EventSource as any)(url, { withCredentials: true } as EventSourceInit);
        } catch (e) {
          // Some environments/browsers don't accept the init argument — fall back
          try { console.debug('[useSubmissionSSE] EventSource withCredentials failed, falling back to no-credentials', e); } catch {}
          es = new EventSource(url);
        }
      } else {
        es = new EventSource(url);
      }
    } catch (e) {
      // If even construction throws, propagate error via onMessage and bail
      try { console.error('[useSubmissionSSE] failed to construct EventSource for', url, e); } catch {}
      onMessage({ type: 'error', payload: e });
      return;
    }
    esRef.current = es;

    es.onopen = () => {
      try { console.debug('[useSubmissionSSE] EventSource open', url, es.readyState); } catch {}
    };

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        onMessage({ type: data.type || 'message', payload: data.payload ?? data });
      } catch (err) {
        onMessage({ type: 'message', payload: ev.data });
      }
    };

    es.onerror = (err) => {
      // Inform caller of error state
      onMessage({ type: 'error', payload: err });
    };

    return () => {
      try { es.close(); } catch {}
      esRef.current = null;
    };
  }, [submissionId, onMessage]);
}

export default useSubmissionSSE;
