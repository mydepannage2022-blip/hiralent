"use client";
import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { api } from '../../lib/auth/auth.api';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type RunResult = {
  score?: number;
  runner?: any;
  plagiarism?: { score: number; evidences: any[] };
  results?: any[];
};

function normalizeBase(base: string) {
  if (!base) return '';
  // if base ends with /api/v1, strip to get backend root
  return base.replace(/\/api\/v1\/?$/, '');
}

export default function CodeRunner() {
  const [code, setCode] = useState<string>('def solve():\n    pass');
  const [language, setLanguage] = useState<string>('python');
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const evRef = useRef<EventSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (evRef.current) {
        evRef.current.close();
      }
    };
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    setStatus('creating');
    setError(null);
    try {
      const body = {
        assessmentId: 'local-test',
        questionId: 'local-q',
        language,
        code,
        userId: 'local-user',
      };
      const res = await api.post('/submissions', body);
      const data = res?.data || {};
      const id = data.submissionId || data.submission_id || data.id || null;
      setSubmissionId(id);
      setStatus('pending');

      // open SSE to stream updates (execution.routes registers under /api/v1)
  // Build SSE url relative to the configured axios baseURL (which includes /api/v1)
  const baseUrl = (api.defaults && (api.defaults.baseURL as string)) || process.env.NEXT_PUBLIC_BASE_URL || '';
  const baseNoSlash = baseUrl.replace(/\/$/, '');
  const streamUrl = `${baseNoSlash}/submissions/stream/${id}`;
  const ev = new EventSource(streamUrl);
      evRef.current = ev;
      ev.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'initial') {
            setStatus(payload.submission.status || 'pending');
          } else if (payload.status) {
            setStatus(payload.status);
            if (payload.status === 'COMPLETED' && payload.payload) {
              setResult(payload.payload as RunResult);
            }
            if (payload.status === 'FAILED' && payload.payload) {
              setResult({ runner: { error: payload.payload } });
            }
          }
        } catch (err) {
          // ignore parse
        }
      };
      ev.onerror = () => {
        // SSE error handling — show a subtle error and keep the connection alive in client
        setError('Stream connection encountered an error. Updates may be delayed.');
      };
    } catch (e) {
      console.error(e);
      setError(String(e));
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: '100%' }}>
      <h2 style={{ marginBottom: 8 }}>Code Runner</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>Language:
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
          </select>
        </label>

        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '10px 18px',
              background: '#6b46ff',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 6px 14px rgba(107,70,255,0.15)',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Running…' : 'Run'}
          </button>
        </div>
      </div>

      <div style={{ height: 520, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden', background: '#0f1720' }}>
        <MonacoEditor
          key={language} // remount editor when language changes so Monaco's language mode updates
          height="100%"
          defaultLanguage={language}
          value={code}
          onChange={(v) => setCode(v || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            fontLigatures: true,
          }}
          theme="vs-dark"
        />
      </div>

  <div style={{ marginTop: 12, padding: 10, border: '1px solid #eee', borderRadius: 6, background: '#fff' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div>Status: <strong>{status ?? '—'}</strong></div>
          <div>Submission: <strong>{submissionId ?? '—'}</strong></div>
          {error && <div style={{ color: 'crimson', marginLeft: 8 }}>Error: {error}</div>}
        </div>

        {result ? (
          <div style={{ marginTop: 8 }}>
            <h4>Result</h4>
            <div style={{ display: 'flex', gap: 12 }}>
              <div>
                <strong>Score:</strong> {result.score ?? '—'}
              </div>
              <div>
                <strong>Runtime:</strong> {result.runner?.runtimeMs ?? '—'} ms
              </div>
              <div>
                <strong>Plagiarism:</strong> {result.plagiarism ? (((result.plagiarism as any).finalScore != null) ? Math.round((result.plagiarism as any).finalScore * 100) + '%' : ((result.plagiarism as any).score != null ? Math.round((result.plagiarism as any).score * 100) + '%' : '—')) : '—'}
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <h5>Tests</h5>
              <div>
                {(result.runner?.results || result.results || []).map((t: any, i: number) => (
                  <div key={i} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                    <div><strong>#{i + 1}</strong> — {t.passed ? <span style={{ color: 'green' }}>PASSED</span> : <span style={{ color: 'crimson' }}>FAILED</span>}</div>
                    <div><strong>Expected:</strong> <code>{String(t.expected)}</code></div>
                    <div><strong>Output:</strong> <pre style={{ whiteSpace: 'pre-wrap' }}>{String(t.output)}</pre></div>
                    {t.stderr ? <div><strong>Stderr:</strong> <pre style={{ whiteSpace: 'pre-wrap' }}>{String(t.stderr)}</pre></div> : null}
                    <div><small>Duration: {t.durationMs ?? t.timeMs ?? 0} ms</small></div>
                  </div>
                ))}
              </div>
            </div>

            {result.plagiarism && (
              <div style={{ marginTop: 8 }}>
                <h5>Plagiarism Evidence</h5>
                <div>Final score: {(result.plagiarism as any).finalScore ?? (result.plagiarism as any).score ?? '—'}</div>
                <ul>
                  {(((result.plagiarism as any).evidence || (result.plagiarism as any).evidences) || []).map((e: any, idx: number) => (
                    <li key={idx}><strong>{e.source}</strong> — similarity {Math.round((e.similarity ?? e.score ?? 0) * 100)}%<div><code>{e.snippet}</code></div></li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(result, null, 2))}>Copy JSON</button>
              <button style={{ marginLeft: 8 }} onClick={() => {
                const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `submission-${submissionId || 'result'}.json`; a.click();
                URL.revokeObjectURL(url);
              }}>Download</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>No result yet</div>
        )}
      </div>
    </div>
  );
}
