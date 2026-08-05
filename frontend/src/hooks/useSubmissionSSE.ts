"use client";
import { useEffect, useRef } from 'react';
import { api } from '../lib/auth/auth.api';
import { fetchStreamTicket } from '../lib/streamTicket';
import { API_V1_BASE } from '../lib/config/api';

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
      base = (api && (api.defaults && (api.defaults.baseURL as string))) || API_V1_BASE;
    } catch {}

    const baseNoSlash = base.replace(/\/$/, '');
    // Normalize to a base that ends at the API prefix, used for both the ticket mint and the stream.
    const streamBase = baseNoSlash
      ? (baseNoSlash.includes('/api/') ? baseNoSlash : `${baseNoSlash}/api/v1`)
      : '/api/v1';
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    // EventSource can't send an Authorization header. Instead of the real access token in
    // the URL, mint a short-lived, submission-bound ticket (behind checkAuth + ownership)
    // and pass it as ?ticket=. Effect can't be async directly, so run in an IIFE with a
    // cancellation guard so a fast unmount/re-run doesn't leak a connection.
    let cancelled = false;
    let es: EventSource | null = null;

    (async () => {
      const ticket = await fetchStreamTicket(streamBase, submissionId, token);
      if (cancelled) return;
      const qs = ticket ? `?ticket=${encodeURIComponent(ticket)}` : '';
      const url = `${streamBase}/submissions/stream/${encodeURIComponent(submissionId)}${qs}`;

      try { console.debug('[useSubmissionSSE] connecting to', url); } catch {}

      // EventSource supports an init dict in some browsers; prefer withCredentials when allowed
      // and fall back to a non-credentialed EventSource if that construction is rejected.
      try {
        if (typeof EventSource !== 'undefined' && (EventSource as any).prototype) {
          try {
            es = new (EventSource as any)(url, { withCredentials: true } as EventSourceInit);
          } catch (e) {
            try { console.debug('[useSubmissionSSE] EventSource withCredentials failed, falling back to no-credentials', e); } catch {}
            es = new EventSource(url);
          }
        } else {
          es = new EventSource(url);
        }
      } catch (e) {
        try { console.error('[useSubmissionSSE] failed to construct EventSource for', url, e); } catch {}
        onMessage({ type: 'error', payload: e });
        return;
      }

      if (cancelled || !es) { try { es?.close(); } catch {} return; }
      const conn = es; // non-null local so the handler closures below narrow cleanly
      esRef.current = conn;

      conn.onopen = () => {
        try { console.debug('[useSubmissionSSE] EventSource open', url, conn.readyState); } catch {}
      };

      conn.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          onMessage({ type: data.type || 'message', payload: data.payload ?? data });
        } catch (err) {
          onMessage({ type: 'message', payload: ev.data });
        }
      };

      conn.onerror = (err) => {
        onMessage({ type: 'error', payload: err });
      };
    })();

    return () => {
      cancelled = true;
      try { es?.close(); } catch {}
      esRef.current = null;
    };
  }, [submissionId, onMessage]);
}

export default useSubmissionSSE;
