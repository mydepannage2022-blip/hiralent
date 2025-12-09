"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { Play, Settings, Copy, Download, X, Sun, Moon, Command, Zap, BookOpen, ChevronDown, CheckCircle, AlertCircle, Send } from 'lucide-react';
import { api } from '../../lib/auth/auth.api';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type RunResult = {
  score?: number;
  runner?: any;
  plagiarism?: { score: number; evidences: any[] };
  results?: any[];
};

const HISTORY_KEY = 'codeRunner.history.v1';
const PREF_KEY = 'codeRunner.prefs.v1';
const FILES_KEY = 'codeRunner.files.v1';
const ACTIVE_FILE_KEY = 'codeRunner.active.v1';

function statusColor(s: string | null) {
  if (!s) return 'bg-gray-700 text-gray-200';
  const st = String(s).toLowerCase();
  if (st.includes('pass') || st.includes('completed') || st.includes('passed')) return 'bg-emerald-600 text-white';
  if (st.includes('run') || st.includes('pending') || st.includes('creating') || st.includes('running')) return 'bg-yellow-500 text-black';
  if (st.includes('fail') || st.includes('error') || st.includes('failed')) return 'bg-rose-600 text-white';
  return 'bg-gray-700 text-gray-200';
}

function usePrefs() {
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch { return {}; }
  });
  useEffect(() => { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }, [prefs]);
  return [prefs, setPrefs] as const;
}

export default function CodeRunner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questionId = searchParams?.get('id') || null;
  const questionTitle = searchParams?.get('title') || 'Coding Challenge';
  const questionLanguage = searchParams?.get('language') || 'python';
  
  const [pageOffset, setPageOffset] = useState<number>(48);
  const [showQuestionPanel, setShowQuestionPanel] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const editorRefInstance = useRef<any>(null);
  const [files, setFiles] = useState<{ id: string; name: string; language: string; code: string }[]>(() => {
    try {
      const raw = localStorage.getItem(FILES_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [{ id: 'f1', name: 'main.py', language: 'python', code: 'def solve():\n    print("Hello World")' }];
  });
  const [activeFile, setActiveFile] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(ACTIVE_FILE_KEY);
      if (raw) return raw;
    } catch (e) {}
    return '';
  });
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const evRef = useRef<EventSource | null>(null);
  const [history, setHistory] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } });
  const [showSidebar, setShowSidebar] = useState(true);
  const [dividerX, setDividerX] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [prefs, setPrefs] = usePrefs();
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const runStartRef = useRef<number | null>(null);

  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(null), 3000); return () => clearTimeout(id); } }, [toast]);

  // Restore active file if missing
  useEffect(() => {
    if (!activeFile && files && files.length > 0) {
      const stored = (() => { try { return localStorage.getItem(ACTIVE_FILE_KEY); } catch { return null; } })();
      if (stored && files.find(f => f.id === stored)) setActiveFile(stored);
      else setActiveFile(files[0].id);
    }
  }, [activeFile, files]);

  // Persist files + activeFile to localStorage
  useEffect(() => {
    try { localStorage.setItem(FILES_KEY, JSON.stringify(files)); } catch {}
  }, [files]);
  useEffect(() => {
    try { if (activeFile) localStorage.setItem(ACTIVE_FILE_KEY, activeFile); } catch {}
  }, [activeFile]);

  // Monaco onMount: keep editor ref and focus for accessibility
  const onEditorMount = useCallback((editor: any /* monaco.editor.IStandaloneCodeEditor */, monaco: any) => {
    editorRefInstance.current = editor;
    try { editor.focus(); } catch (e) {}
  }, []);

  // Compute available height below any fixed header so the runner fills the page.
  useEffect(() => {
    function computeOffset() {
      try {
        // Prefer common header selectors first
        let header = document.querySelector('header, nav, [role=banner], .navbar, .site-header') as HTMLElement | null;
        if (!header) {
          // fallback: find a fixed/top element that looks like a header
          const all = Array.from(document.querySelectorAll('body *')) as HTMLElement[];
          header = all.find((el) => {
            const cs = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return (cs.position === 'fixed' || cs.position === 'sticky') && Math.abs(rect.top) < 2 && rect.height > 0;
          }) || null;
        }
        const headerHeight = header ? Math.round(header.getBoundingClientRect().height) : 0;
        // add a small extra gap so the runner isn't flush with header
        setPageOffset(headerHeight + 24);
      } catch (err) {
        setPageOffset(48);
      }
    }
    computeOffset();
    window.addEventListener('resize', computeOffset);
    return () => window.removeEventListener('resize', computeOffset);
  }, [files.length]);

  // Keyboard: Ctrl/Cmd+Tab to cycle tabs
  useEffect(() => {
    function tabHandler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault();
        const idx = files.findIndex(f => f.id === activeFile);
        if (idx === -1) return;
        const nextIdx = e.shiftKey ? (idx - 1 + files.length) % files.length : (idx + 1) % files.length;
        setActiveFile(files[nextIdx].id);
      }
    }
    window.addEventListener('keydown', tabHandler);
    return () => window.removeEventListener('keydown', tabHandler);
  }, [files, activeFile]);

  // Drag divider
  const onMouseDownDivider = useCallback((e: React.MouseEvent) => {
    const startX = e.clientX;
    const container = containerRef.current;
    if (!container) return;
    const startWidth = container.getBoundingClientRect().width;
    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      const percent = Math.max(20, Math.min(80, ((startWidth / 2 + dx) / startWidth) * 100));
      setDividerX(percent);
    }
    function onUp() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }, []);

  // Command palette shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setShowCommandPalette((s) => !s); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleRun(); }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [files, activeFile]);

  function pushHistory(entry: any) { try { const next = [entry].concat(history).slice(0, 50); localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); setHistory(next); } catch {} }

  function updateActiveCode(newCode: string) {
    setFiles((prev) => prev.map(f => f.id === activeFile ? { ...f, code: newCode } : f));
    // autosave handled by effect that persists `files` to localStorage
  }

  function addFile() {
    const id = `f${Date.now()}`;
    const defaultLang = files[0]?.language || 'python';
    const ext = extForLang(defaultLang);
    const name = `file${files.length + 1}.${ext}`;
    const template = templateForLang(defaultLang);
    const file = { id, name, language: defaultLang, code: template };
    setFiles([file, ...files]); setActiveFile(id); setToast('New file created');
  }

  function extForLang(lang: string) {
    switch ((lang || '').toLowerCase()) {
      case 'javascript': return 'js';
      case 'typescript': return 'ts';
      case 'java': return 'java';
      case 'cpp': return 'cpp';
      case 'c++': return 'cpp';
      case 'go': return 'go';
      case 'csharp': return 'cs';
      case 'ruby': return 'rb';
      case 'python':
      default:
        return 'py';
    }
  }

  function templateForLang(lang: string) {
    switch ((lang || '').toLowerCase()) {
      case 'javascript': return 'function main() {\n  console.log("Hello World");\n}\n';
      case 'typescript': return 'function main(): void {\n  console.log("Hello World");\n}\n';
      case 'java': return 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello World");\n  }\n}\n';
      case 'cpp': return '#include <iostream>\nint main(){ std::cout << "Hello World"; return 0; }\n';
      case 'go': return 'package main\nimport "fmt"\nfunc main(){ fmt.Println("Hello World") }\n';
      case 'csharp': return 'using System;\nclass Program { static void Main() { Console.WriteLine("Hello World"); } }\n';
      case 'ruby': return 'puts "Hello World"\n';
      case 'python':
      default:
        return 'def solve():\n    print("Hello World")\n';
    }
  }

  function changeLanguage(fileId: string, newLang: string) {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      const base = f.name.replace(/\.[^.]+$/, '');
      const ext = extForLang(newLang);
      return { ...f, language: newLang, name: `${base}.${ext}` };
    }));
    setToast('Language updated');
  }

  function duplicateFile(id: string) {
    const src = files.find(f => f.id === id);
    if (!src) return setToast('File not found');
    const nid = `f${Date.now()}`;
    const base = src.name.replace(/\.[^.]+$/, '');
    const ext = extForLang(src.language);
    const name = `${base}-copy.${ext}`;
    const copy = { id: nid, name, language: src.language, code: src.code };
    setFiles((prev) => {
      const next = [...prev];
      const idx = next.findIndex(f => f.id === id);
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setActiveFile(nid);
    setToast('File duplicated');
  }

  function deleteFile(id: string) {
    if (files.length === 1) return setToast('Cannot delete last file');
    setFiles((prev) => {
      const next = prev.filter(f => f.id !== id);
      if (activeFile === id) setActiveFile(next[0].id);
      return next;
    });
    setToast('File deleted');
  }

  async function handleRun() {
    const active = files.find(f => f.id === activeFile);
    if (!active) return setToast('No active file');
    setSubmitting(true); setStatus('creating'); setResult(null); setToast('Submission created');
    runStartRef.current = Date.now();
    try {
      const body = { assessmentId: 'local-test', questionId: active.name, language: active.language, code: active.code, userId: (process.env.NEXT_PUBLIC_DEV_USER || 'dev-user') };
      // Compute absolute submit URL so requests always go to the correct backend mount
      const configuredBase = (api.defaults && (api.defaults.baseURL as string)) || process.env.NEXT_PUBLIC_BASE_URL || '';
      let baseNoSlash = configuredBase.replace(/\/$/, '');
      if (!baseNoSlash) {
        const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
        baseNoSlash = origin ? `${origin.replace(/\/$/, '')}/api/v1` : '/api/v1';
      }
      const submitUrl = `${baseNoSlash}/submissions`;
      const res = await api.post(submitUrl, body);
      const data = res?.data || {};
      const id = data.submissionId || data.submission_id || data.id || null;
      setSubmissionId(id);
      if (!id) {
        setStatus('error');
        setToast('No submission id returned by server');
        return;
      }
      setStatus('pending');
      // Open SSE (use absolute stream URL)
      const streamUrl = `${baseNoSlash}/submissions/stream/${id}`;
      if (evRef.current) { evRef.current.close(); }
      const ev = new EventSource(streamUrl); evRef.current = ev;
      ev.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'initial') setStatus(payload.submission?.status || 'pending');
          else if (payload.status) {
            setStatus(payload.status);
            if (String(payload.status).toLowerCase().includes('completed') && payload.payload) {
              setResult(payload.payload as RunResult); pushHistory({ id, name: active.name, language: active.language, code: active.code, status: payload.status, result: payload.payload, createdAt: Date.now() });
              const time = runStartRef.current ? Date.now() - runStartRef.current : 0; setToast(`Completed in ${time}ms`);
            }
            if (String(payload.status).toLowerCase().includes('failed') && payload.payload) { setResult({ runner: { error: payload.payload } }); pushHistory({ id, name: active.name, language: active.language, code: active.code, status: payload.status, error: payload.payload, createdAt: Date.now() }); }
          }
        } catch (err) {}
      };
      ev.onerror = () => { setToast('Stream error — updates may be delayed'); };
    } catch (err: any) { console.error(err); setStatus('error'); setToast(String(err?.message || err)); }
    finally { setSubmitting(false); }
  }

  function copyCode() { const active = files.find(f => f.id === activeFile); if (!active) return setToast('Nothing to copy'); navigator.clipboard?.writeText(active.code); setToast('Code copied'); }

  function downloadResult() { const blob = new Blob([JSON.stringify(result || {}, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `submission-${submissionId || 'result'}.json`; a.click(); URL.revokeObjectURL(url); setToast('Downloaded result'); }

  function handleSubmit() {
    // Show modal with confirmation
    setShowSubmitModal(true);
  }

  function handleConfirmSubmit() {
    setShowSubmitModal(false);
    
    // Prepare submission data
    const active = files.find(f => f.id === activeFile);
    const submissionData = {
      questionId: questionId || 'unknown',
      questionTitle: questionTitle,
      language: questionLanguage,
      code: active?.code || '',
      score: result?.score || 0,
      runtimeMs: result?.runner?.runtimeMs || 0,
      results: result?.results || []
    };

    // Redirect to results page with data in URL
    const encoded = encodeURIComponent(JSON.stringify(submissionData));
    setTimeout(() => {
      router.push(`/candidate/results?data=${encoded}`);
    }, 800);
    setToast('✅ Submission completed! Redirecting...');
  }

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-4 text-slate-800 shadow-2xl flex flex-col"
      style={{ minHeight: `calc(100vh - ${pageOffset}px)` }}
    >
      {/* Top toolbar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-md backdrop-blur shadow-sm border border-slate-200">
          <div className="w-10 h-10 rounded bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">C</div>
          <div>
            <div className="text-sm font-semibold text-slate-800">Code Playground</div>
            <div className="text-xs text-slate-600">Run, test and share code</div>
          </div>
        </div>

          <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-white border border-slate-200 shadow-sm`} role="status" aria-live="polite">
              <span className={`w-2 h-2 rounded-full ${status ? (String(status).toLowerCase().includes('pass') || String(status).toLowerCase().includes('completed') ? 'bg-emerald-500' : String(status).toLowerCase().includes('fail') || String(status).toLowerCase().includes('error') ? 'bg-rose-500' : 'bg-yellow-500') : 'bg-slate-400'}`} />
              <strong className="text-slate-800 text-sm">{status ? String(status) : 'idle'}</strong>
            </span>
            <div className="text-sm text-slate-600" aria-hidden>
              {result && result.runner?.runtimeMs ? <span className="text-xs">{result.runner.runtimeMs} ms</span> : null}
            </div>
          </div>

          <button
            className={`inline-flex items-center gap-3 px-4 py-2 rounded-md text-white shadow-md transition transform ${submitting ? 'opacity-90 scale-95 bg-gradient-to-r from-indigo-600 to-blue-600' : 'hover:-translate-y-0.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 hover:shadow-lg'}`}
            onClick={() => handleRun()}
            disabled={submitting}
            aria-label="Run code (Ctrl+Enter)"
          >
            {submitting ? (
              <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
            ) : (
              <Play className="w-4 h-4 text-white" />
            )}
            <span className="text-white font-medium">{submitting ? 'Running…' : 'Run'}</span>
          </button>

          {result && result.score !== undefined && (
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md transition transform hover:-translate-y-0.5"
              onClick={handleSubmit}
              aria-label="Submit solution"
            >
              <Send className="w-4 h-4" />
              <span className="font-medium">Submit</span>
            </button>
          )}

          <button title="Settings" className="p-2 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm" onClick={() => setShowSettings(true)} aria-label="Open settings"><Settings className="w-4 h-4" /></button>
          <button title="Command Palette (Ctrl+K)" className="p-2 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm" onClick={() => setShowCommandPalette(true)} aria-label="Open command palette"><Command className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-stretch gap-3">
        {/* Left Sidebar - Question Panel */}
        {showQuestionPanel && (
          <div className={`w-80 p-3 transition-all flex flex-col`}> 
            <div className="bg-white rounded-lg p-3 h-full flex flex-col overflow-auto border border-slate-200 shadow-lg">
              {/* Question Section */}
              <>
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-slate-800">Question</h3>
                </div>
                <div className="bg-white rounded-lg p-3 mb-4 border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-600 font-semibold mb-2">Problem</p>
                  <h4 className="text-base font-bold text-slate-900 mb-3 leading-snug">{questionTitle}</h4>
                  <p className="text-sm text-slate-700 leading-relaxed mb-4">
                    {questionId
                      ? 'Write a function that solves this problem. Run your code against the test cases to verify your solution.'
                      : 'No question ID provided. Load a challenge to see its full statement.'}
                  </p>
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
                      {questionLanguage}
                    </span>
                  </div>
                </div>
              </>

              {/* Divider */}
              <div className="border-t border-slate-200 my-4"></div>

              {/* Recent Runs */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Recent Runs</div>
                  <div className="flex gap-1">
                    {history.length > 0 && (
                      <button 
                        className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                        onClick={() => {
                          setHistory([]);
                          localStorage.setItem(HISTORY_KEY, '[]');
                          setToast('History cleared');
                        }}
                        title="Clear history"
                      >
                        Clear
                      </button>
                    )}
                    <button 
                      className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                      onClick={() => setShowQuestionPanel(false)}
                      title="Minimize panel"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  {history.length === 0 && <div className="text-xs text-slate-500">No submissions yet</div>}
                  {history.map((h, i) => (
                    <div key={i} className="p-2 rounded mb-2 bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-slate-800">{h.name}</div>
                        <div className={`text-xs px-2 py-0.5 rounded ${statusColor(h.status)}`}>{String(h.status || '')}</div>
                      </div>
                      <div className="text-xs text-slate-600">{new Date(h.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-200">Tip: Ctrl+Enter to run</div>
            </div>
          </div>
        )}

        {/* Collapsed panel button */}
        {!showQuestionPanel && (
          <button
            onClick={() => setShowQuestionPanel(true)}
            className="p-2 rounded bg-white text-slate-700 hover:bg-slate-50 h-fit border border-slate-200 shadow-sm"
            title="Show question"
          >
            <ChevronDown className="w-4 h-4 rotate-270" />
          </button>
        )}

        {/* Editor + tabs */}
        <div className="flex-1 p-3 flex flex-col">
          <div className="bg-white rounded-lg p-2 mb-2 flex items-center gap-3 border border-slate-200 shadow-sm">
            <div className="flex gap-2 items-center" role="tablist" aria-label="Files">
              {files.map(f => (
                <div key={f.id} className={`flex items-center gap-2 px-3 py-1 rounded-full transition ${activeFile === f.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`} role="tab" aria-selected={activeFile===f.id} tabIndex={0} onClick={() => setActiveFile(f.id)}>
                  <button className="text-xs font-medium truncate max-w-[10rem]" onClick={() => setActiveFile(f.id)}>{f.name}</button>
                  <button title="Duplicate file" onClick={() => duplicateFile(f.id)} className="p-1 rounded hover:bg-current/20" aria-label={`Duplicate ${f.name}`}><Copy className="w-3 h-3"/></button>
                  <button title="Delete file" onClick={() => deleteFile(f.id)} className="p-1 rounded hover:bg-current/20" aria-label={`Delete ${f.name}`}><X className="w-3 h-3"/></button>
                </div>
              ))}
              <button onClick={addFile} className="px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm shadow-sm" title="Create file" aria-label="Create file">+</button>
            </div>
            <div className="ml-auto flex gap-2">
                {/* Language selector for active file */}
                <div className="flex items-center gap-2 bg-white rounded px-2 py-1 border border-slate-200">
                  <label className="text-xs text-slate-600 mr-1">Lang</label>
                  <select value={(files.find(f => f.id === activeFile)?.language) || 'python'} onChange={(e) => changeLanguage(activeFile, e.target.value)} className="bg-transparent text-sm outline-none text-slate-800">
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="go">Go</option>
                    <option value="csharp">C#</option>
                    <option value="ruby">Ruby</option>
                  </select>
                </div>
                <button className="px-2 py-1 rounded bg-white/5" onClick={() => copyCode()} title="Copy code"><Copy className="w-4 h-4"/></button>
                <button className="px-2 py-1 rounded bg-white/5" onClick={() => downloadResult()} title="Download result"><Download className="w-4 h-4"/></button>
            </div>
          </div>

          <div className="flex-1 bg-black/80 rounded-md overflow-hidden min-h-0 ring-1 ring-white/6">
            <MonacoEditor
              key={activeFile}
              height="100%"
              language={files.find(f => f.id === activeFile)?.language || 'python'}
              defaultLanguage={files.find(f => f.id === activeFile)?.language || 'python'}
              value={files.find(f => f.id === activeFile)?.code || ''}
              onChange={(v) => updateActiveCode(v || '')}
              onMount={onEditorMount}
              options={{
                minimap: { enabled: false },
                fontSize: prefs.fontSize || 15,
                lineHeight: (prefs.fontSize || 15) * 1.4,
                automaticLayout: true,
                renderWhitespace: 'boundary',
                smoothScrolling: true,
                scrollBeyondLastLine: false,
                folding: true,
                glyphMargin: true,
                tabSize: 4,
              }}
              theme={prefs.theme === 'light' ? 'light' : 'vs-dark'}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="w-2 cursor-col-resize" onMouseDown={onMouseDownDivider} />

        {/* Output panel */}
        <div className="w-96 p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <div className="text-sm font-semibold text-slate-800">Output</div>
              <div className="text-xs text-slate-600">Terminal</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(result || {}, null, 2)); setToast('Output copied'); }} className="px-2 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 text-sm border border-slate-200" title="Copy output" aria-label="Copy output">Copy</button>
              <button onClick={() => downloadResult()} className="px-2 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 text-sm border border-slate-200" title="Download output" aria-label="Download output">Download</button>
              <button onClick={() => { setResult(null); setToast('Output cleared'); }} className="px-2 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 text-sm border border-slate-200" title="Clear output" aria-label="Clear output">Clear</button>
            </div>
          </div>

          <div className="bg-gradient-to-b from-slate-900 to-black rounded-lg p-3 flex-1 overflow-auto text-sm min-h-0 font-mono text-slate-100 shadow-inner border border-slate-700">
            {!result && (
              <div className="flex flex-col items-start justify-start h-full text-left gap-3 opacity-90">
                <div className="flex items-center gap-3">
                  <svg width="120" height="72" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <rect x="6" y="8" width="108" height="56" rx="6" stroke="#6366f1" strokeWidth="2" fill="#0b1220" />
                    <path d="M18 28h30M18 36h20M18 44h22" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <div>
                    <div className="text-sm font-semibold text-indigo-100">No results yet</div>
                    <div className="text-xs text-indigo-200">Run your code to see output here.</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400">Tip: Ctrl+Enter to run • Ctrl+K for commands</div>
              </div>
            )}

            {result && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <div className="px-2 py-1 rounded bg-indigo-900/50 border border-indigo-800"><strong>Score</strong><div className="text-sm mt-0.5">{result.score ?? '—'}</div></div>
                  <div className="px-2 py-1 rounded bg-indigo-900/50 border border-indigo-800"><strong>Runtime</strong><div className="text-sm mt-0.5">{result.runner?.runtimeMs ?? '—'} ms</div></div>
                  <div className="px-2 py-1 rounded bg-indigo-900/50 border border-indigo-800"><strong>Memory</strong><div className="text-sm mt-0.5">{result.runner?.memoryKb ?? '—'} KB</div></div>
                </div>

                <div>
                  <h5 className="font-medium mb-2 text-slate-100">Tests</h5>
                  {(result.runner?.results || result.results || []).map((t: any, i: number) => (
                    <div key={i} className="mb-2 p-2 rounded bg-slate-800/60">
                      <div className="flex items-center justify-between"><div className="text-slate-200">#{i+1} - {t.name || ''}</div><div className={`${t.passed ? 'text-emerald-400' : 'text-rose-400'} font-medium`}>{t.passed ? 'PASSED' : 'FAILED'}</div></div>
                      <pre className="bg-black/60 text-slate-100 p-2 rounded mt-2 text-xs whitespace-pre-wrap">{String(t.output)}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-slate-900 text-slate-100 rounded p-6 w-96">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg">Settings</h3><button onClick={() => setShowSettings(false)} className="p-1 rounded bg-white/5"><X className="w-4 h-4"/></button></div>
            <div className="space-y-3">
              <div>
                <label className="text-sm block mb-1">Theme</label>
                <div className="flex gap-2">
                  <button onClick={() => setPrefs({ ...prefs, theme: 'dark' })} className={`px-3 py-1 rounded ${prefs.theme === 'dark' ? 'bg-indigo-600' : 'bg-white/5'}`}><Moon className="w-4 h-4 inline"/> Dark</button>
                  <button onClick={() => setPrefs({ ...prefs, theme: 'light' })} className={`px-3 py-1 rounded ${prefs.theme === 'light' ? 'bg-indigo-600' : 'bg-white/5'}`}><Sun className="w-4 h-4 inline"/> Light</button>
                </div>
              </div>
              <div>
                <label className="text-sm block mb-1">Font size</label>
                <input type="range" min={12} max={20} value={prefs.fontSize || 14} onChange={(e) => setPrefs({ ...prefs, fontSize: Number(e.target.value) })} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Command palette */}
      {showCommandPalette && (
        <div className="fixed inset-0 flex items-start justify-center pt-24 pointer-events-none">
          <div className="pointer-events-auto w-[640px] bg-slate-800 rounded p-3">
            <div className="flex items-center gap-2 mb-2"><Command className="w-4 h-4"/><input autoFocus placeholder="Type a command (run, new file, toggle sidebar)..." className="flex-1 bg-transparent outline-none text-slate-100" onKeyDown={(e) => { if (e.key === 'Enter') { const v = (e.target as HTMLInputElement).value.toLowerCase(); if (v.includes('run')) handleRun(); if (v.includes('new')) addFile(); if (v.includes('sidebar')) setShowSidebar(s => !s); setShowCommandPalette(false); } }} /></div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-emerald-100 rounded-full shadow-sm">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
            </div>

            {/* Title & Message */}
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Great Job!</h3>
            <p className="text-slate-600 text-center mb-4">Your solution has been tested</p>

            {/* Results Summary */}
            {result && (
              <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Score</span>
                    <span className="text-lg font-bold text-emerald-600">{result.score ?? '—'}%</span>
                  </div>
                  {result.results && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Tests Passed</span>
                      <span className="text-slate-800">
                        {result.results.filter((r: any) => r.passed).length} / {result.results.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition font-medium shadow-sm"
              >
                Keep Coding
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 transition font-medium shadow-lg"
              >
                Done & Exit
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center mt-4">
              You will be redirected to the challenges page
            </p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (<div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded shadow">{toast}</div>)}
    </div>
  );
}
