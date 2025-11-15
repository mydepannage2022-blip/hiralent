"use client";
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Monaco } from '@monaco-editor/react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useRunSubmission } from '../../lib/useRunSubmission';

type Props = {
  questionId?: string | null;
};

export default function CodeEditor({ questionId = null }: Props) {
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [output, setOutput] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'results'|'logs'|'plagiarism'>('results');
  const saveTimer = useRef<any>(null);
  const editorRef = useRef<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // list of languages supported in the UI
  const languages = [
    { id: 'python', label: 'Python' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'typescript', label: 'TypeScript' },
    { id: 'java', label: 'Java' },
    { id: 'c', label: 'C' },
    { id: 'cpp', label: 'C++' },
    { id: 'csharp', label: 'C#' },
    { id: 'go', label: 'Go' },
    { id: 'rust', label: 'Rust' },
    { id: 'kotlin', label: 'Kotlin' },
    { id: 'php', label: 'PHP' },
    { id: 'ruby', label: 'Ruby' },
  ];

  function getTemplate(lang: string) {
    switch (lang) {
      case 'python': return '# Write your Python code\nprint("Hello World")\n';
      case 'javascript': return '// JavaScript example\nconsole.log("Hello World");\n';
      case 'typescript': return '// TypeScript example\nconsole.log("Hello from TS");\n';
      case 'java': return 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}\n';
      case 'c': return '#include <stdio.h>\nint main(){\n    printf("Hello World\\n");\n    return 0;\n}\n';
      case 'cpp': return '#include <iostream>\nusing namespace std;\nint main(){\n    cout << "Hello World" << endl;\n    return 0;\n}\n';
      case 'csharp': return 'using System;\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello World");\n    }\n}\n';
      case 'go': return 'package main\nimport "fmt"\nfunc main(){\n    fmt.Println("Hello World")\n}\n';
      case 'rust': return 'fn main(){\n    println!("Hello World");\n}\n';
      case 'kotlin': return 'fun main(){\n    println("Hello World")\n}\n';
      case 'php': return '<?php\necho "Hello World\n";\n';
      case 'ruby': return 'puts "Hello World"\n';
      default: return '// Start coding';
    }
  }

  // Auto-restore draft
  useEffect(() => {
    try {
      const key = `code-draft:${questionId || 'global'}`;
      const saved = localStorage.getItem(key);
      if (saved) setCode(saved);
      else setCode(getTemplate(language));
    } catch {}
  }, [questionId]);

  // Autosave with debounce
  useEffect(() => {
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const key = `code-draft:${questionId || 'global'}`;
        localStorage.setItem(key, code || '');
      }, 800);
    } catch {}
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [code, questionId]);

  // update template when language changes (only if user hasn't edited code significantly)
  useEffect(() => {
    try {
      const key = `code-draft:${questionId || 'global'}`;
      const saved = localStorage.getItem(key);
      if (!saved || saved.trim().length === 0 || saved.trim() === '# Write your code here') {
        setCode(getTemplate(language));
      }
    } catch {}
  }, [language, questionId]);

  const onMount: OnMount = useCallback((editor, monaco) => {
    editor.focus();
    editorRef.current = editor;
    // prefer dark theme for better contrast
    try { monaco.editor.setTheme('vs-dark'); } catch {}
  }, []);

  // Use shared hook for running submissions and receiving SSE updates
  const { status: runStatus, result: runResult, run: runSubmission } = useRunSubmission();

  const run = async () => {
    setStatus('submitting');
    setIsSubmitting(true);
    try {
      // build payload expected by API
      const payload: any = { assessmentId: String(questionId || 'assessment-unknown'), questionId: String(questionId || 'q1'), language, code };
      await runSubmission(payload);
      setStatus('queued');
      // runSubmission will set internal status; we mirror it below via effect
    } catch (err: any) {
      console.error('Run submission error', err);
      setStatus('error');
      setOutput({ error: String(err?.message || err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mirror runStatus and runResult from hook into local state for UI
  useEffect(() => {
    if (!runStatus) return;
    setStatus(runStatus as string);
  }, [runStatus]);

  useEffect(() => {
    if (!runResult) return;
    // runResult may contain payloads; normalize into output
    const msg = runResult;
    if (msg.type === 'error') {
      setStatus('error');
      setOutput(msg.payload);
      return;
    }
    const p = msg.payload || msg;
    setOutput((prev: any) => {
      const next = { ...(prev || {}) };
      if (p?.result) next.result = p.result;
      if (p?.logs) next.logs = (next.logs || []).concat(p.logs || []);
      if (p?.plagiarism) next.plagiarism = p.plagiarism;
      return next;
    });
    if (p?.status) setStatus(String(p.status).toLowerCase());
  }, [runResult]);

  // Keyboard shortcut Ctrl/Cmd + Enter to run
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      if ((isMac && e.metaKey && e.key === 'Enter') || (!isMac && e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [code, language, questionId]);

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center gap-4 bg-white shadow-sm rounded p-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">C</div>
          <div>
            <div className="text-slate-700 font-semibold">Code Playground</div>
            <div className="text-xs text-slate-400">Run, test and share code</div>
          </div>
        </div>

        <div className="ml-6">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="border rounded-md p-2 text-sm shadow-sm">
            {languages.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('results')} className={`px-3 py-1 rounded-md text-sm ${activeTab==='results' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-slate-700'}`}>Results</button>
            <button onClick={() => setActiveTab('logs')} className={`px-3 py-1 rounded-md text-sm ${activeTab==='logs' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-slate-700'}`}>Logs</button>
            <button onClick={() => setActiveTab('plagiarism')} className={`px-3 py-1 rounded-md text-sm ${activeTab==='plagiarism' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-slate-700'}`}>Plagiarism</button>
          </div>

          <div>
            <button onClick={run} disabled={isSubmitting || !code} className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-md shadow-md disabled:opacity-60">
              {isSubmitting ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 border rounded-lg overflow-hidden shadow-inner">
        <Editor
          height="560px"
          defaultLanguage={language}
          language={language}
          value={code}
          onChange={(v) => setCode(v || '')}
          onMount={onMount}
          options={{ minimap: { enabled: false }, fontSize: 14 }}
        />
      </div>

      <div className="bg-white border rounded-md p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-sm">Status: <span className="font-semibold">{status || 'idle'}</span></div>
            <div className="text-sm">Submission: <span className="font-semibold">{submissionId || '-'}</span></div>
          </div>
          <div>
            {status === 'error' && (
              <div className="text-sm text-red-600">Unable to communicate with backend. Check backend server or try again.</div>
            )}
          </div>
        </div>

        <div className="mt-4">
          {activeTab === 'results' && (
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">{output?.result ? JSON.stringify(output.result, null, 2) : 'No results yet'}</pre>
          )}
          {activeTab === 'logs' && (
            <pre className="whitespace-pre-wrap text-sm bg-black text-white p-3 rounded">{output?.logs ? (Array.isArray(output.logs) ? output.logs.join('\n') : String(output.logs)) : 'No logs yet'}</pre>
          )}
          {activeTab === 'plagiarism' && (
            <div>
              {output?.plagiarism ? (
                <div className="grid gap-2">
                  <div>Score: <strong>{output.plagiarism.score}</strong></div>
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">{JSON.stringify(output.plagiarism.evidences || [], null, 2)}</pre>
                </div>
              ) : <div className="text-sm text-slate-500">No plagiarism info yet</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
