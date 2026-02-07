"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { Play, Settings, Copy, Download, X, Sun, Moon, Command, Zap, BookOpen, ChevronDown, CheckCircle, AlertCircle, Send, Code2, Lock } from 'lucide-react';
import { api } from '../../lib/auth/auth.api';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type RunResult = {
  score?: number;
  runner?: any;
  plagiarism?: { score: number; evidences: any[] };
  results?: any[];
};

type ChallengeData = {
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  functionSignature?: string;
};

const HISTORY_KEY = 'codeRunner.history.v1';
const PREF_KEY = 'codeRunner.prefs.v1';
const FILES_KEY = 'codeRunner.files.v1';
const ACTIVE_FILE_KEY = 'codeRunner.active.v1';
const TAB_SWITCHES_KEY = 'codeRunner.tabSwitches.v1';
const MAX_TAB_SWITCHES = 7;

function getDifficultyColor(difficulty: string) {
  switch (difficulty?.toLowerCase()) {
    case 'easy': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'hard': return 'bg-rose-100 text-rose-700 border-rose-300';
    default: return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

function generateFunctionSignature(language: string, title: string): string {
  const functionName = title.toLowerCase().replace(/\s+/g, '_');
  switch ((language || '').toLowerCase()) {
    case 'javascript': return `function solve(a, b) {\n  return a + b;\n}\n`;
    case 'typescript': return `function solve(a: number, b: number): number {\n  return a + b;\n}\n`;
    case 'java': return `public class Solution {\n  public static int solve(int a, int b) {\n    return a + b;\n  }\n}\n`;
    case 'cpp': return `#include <iostream>\nusing namespace std;\n\nint solve(int a, int b) {\n  return a + b;\n}\n`;
    case 'c': return `#include <stdio.h>\n\nint solve(int a, int b) {\n  return a + b;\n}\n`;
    case 'go': return `package main\n\nimport "fmt"\n\nfunc solve(a, b int) int {\n  return a + b\n}\n`;
    case 'csharp': return `public class Solution {\n  public static int Solve(int a, int b) {\n    return a + b;\n  }\n}\n`;
    case 'ruby': return `def solve(a, b)\n  a + b\nend\n`;
    case 'rust': return `fn solve(a: i32, b: i32) -> i32 {\n  a + b\n}\n`;
    case 'kotlin': return `fun solve(a: Int, b: Int): Int {\n  return a + b\n}\n`;
    case 'swift': return `import Foundation\n\nfunc solve(a: Int, b: Int) -> Int {\n  return a + b\n}\n`;
    case 'php': return `<?php\nfunction solve($a, $b) {\n  return $a + $b;\n}\n?>\n`;
    case 'scala': return `object Solution {\n  def solve(a: Int, b: Int): Int = a + b\n}\n`;
    case 'perl': return `sub solve {\n  my ($a, $b) = @_;\n  return $a + $b;\n}\n`;
    case 'r': return `solve <- function(a, b) {\n  return(a + b)\n}\n`;
    case 'groovy': return `def solve(a, b) {\n  a + b\n}\n`;
    case 'lua': return `function solve(a, b)\n  return a + b\nend\n`;
    case 'dart': return `int solve(int a, int b) {\n  return a + b;\n}\n`;
    case 'elixir': return `defmodule Solution do\n  def solve(a, b) do\n    a + b\n  end\nend\n`;
    case 'haskell': return `solve :: Int -> Int -> Int\nsolve a b = a + b\n`;
    case 'clojure': return `(defn solve [a b]\n  (+ a b))\n`;
    case 'vb': return `Function Solve(a As Integer, b As Integer) As Integer\n  Return a + b\nEnd Function\n`;
    case 'bash': return `#!/bin/bash\nsolve() {\n  echo $((a + b))\n}\n`;
    case 'ocaml': return `let solve a b = a + b\n`;
    case 'fsharp': return `let solve a b = a + b\n`;
    case 'julia': return `function solve(a, b)\n  return a + b\nend\n`;
    case 'typescript-strict': return `function solve(a: number, b: number): number {\n  return a + b;\n}\n`;
    case 'sql': return `SELECT a + b AS result;\n`;
    case 'objective-c': return `#import <Foundation/Foundation.h>\nint solve(int a, int b) {\n  return a + b;\n}\n`;
    case 'matlab': return `function result = solve(a, b)\n  result = a + b;\nend\n`;
    case 'powershell': return `function Solve([int]$a, [int]$b) {\n  return $a + $b\n}\n`;
    case 'assembly': return `section .text\n  global solve\nsolve:\n  add rdi, rsi\n  mov rax, rdi\n  ret\n`;
    case 'cobol': return `IDENTIFICATION DIVISION.\nPROGRAM-ID. SOLVE.\nDATA DIVISION.\nWORKING-STORAGE SECTION.\n01 RESULT PIC 9(5).\nPROCEDURE DIVISION.\n  ACCEPT A B.\n  COMPUTE RESULT = A + B.\n  DISPLAY RESULT.\n  STOP RUN.\n`;
    case 'lisp': return `(defun solve (a b)\n  (+ a b))\n`;
    case 'scheme': return `(define (solve a b)\n  (+ a b))\n`;
    case 'nim': return `proc solve(a, b: int): int =\n  return a + b\n`;
    case 'crystal': return `def solve(a : Int32, b : Int32) : Int32\n  a + b\nend\n`;
    case 'zig': return `pub fn solve(a: i32, b: i32) i32 {\n  return a + b;\n}\n`;
    case 'python':
    default:
      return `def solve(a, b):\n    return a + b\n`;
  }
}

function usePrefs() {
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{"theme":"dark"}'); } catch { return { theme: 'dark' }; }
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
  const questionDifficulty = (searchParams?.get('difficulty') || 'medium') as 'easy' | 'medium' | 'hard';
  
  const [pageOffset, setPageOffset] = useState<number>(48);
  const [showQuestionPanel, setShowQuestionPanel] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const editorRefInstance = useRef<any>(null);
  
  // Initialize with proper function signature
  const [files, setFiles] = useState<{ id: string; name: string; language: string; code: string }[]>(() => {
    try {
      const raw = localStorage.getItem(FILES_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const lang = questionLanguage || 'python';
    const ext = lang === 'javascript' ? 'js' : lang === 'typescript' ? 'ts' : lang === 'java' ? 'java' : 'py';
    return [{ id: 'f1', name: `main.${ext}`, language: lang, code: generateFunctionSignature(lang, questionTitle) }];
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
  const [tabSwitches, setTabSwitches] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(TAB_SWITCHES_KEY) || '0'); } catch { return 0; }
  });
  const tabSwitchesWarningRef = useRef<boolean>(false);
  const [outputTab, setOutputTab] = useState<'results' | 'input' | 'output'>('results');
  const [customInput, setCustomInput] = useState<string>('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('codeRunner.terminal.v1') || '[]'); } catch { return []; }
  });
  const [terminalInput, setTerminalInput] = useState<string>('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(null), 3000); return () => clearTimeout(id); } }, [toast]);

  // Persist tab switches to localStorage
  useEffect(() => {
    try { localStorage.setItem(TAB_SWITCHES_KEY, String(tabSwitches)); } catch {}
  }, [tabSwitches]);

  // Persist terminal logs
  useEffect(() => {
    try { localStorage.setItem('codeRunner.terminal.v1', JSON.stringify(terminalLogs)); } catch {}
  }, [terminalLogs]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current && outputTab === 'output') {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs, outputTab]);

  // Restrict copy/paste in code editor
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const isFocused = activeEl?.closest('[data-uri]') || activeEl?.closest('[role="textbox"]');
      if (!isFocused) {
        e.preventDefault();
        setToast('❌ Pasting from external sources not allowed');
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

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
        
        // Check tab switch limit
        if (tabSwitches >= MAX_TAB_SWITCHES) {
          if (!tabSwitchesWarningRef.current) {
            setToast(`⚠️ Tab switch limit reached (${MAX_TAB_SWITCHES}). You can no longer switch tabs.`);
            tabSwitchesWarningRef.current = true;
          }
          return;
        }
        
        const nextIdx = e.shiftKey ? (idx - 1 + files.length) % files.length : (idx + 1) % files.length;
        setActiveFile(files[nextIdx].id);
        setTabSwitches(prev => prev + 1);
      }
    }
    window.addEventListener('keydown', tabHandler);
    return () => window.removeEventListener('keydown', tabHandler);
  }, [files, activeFile, tabSwitches]);

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

  function addTerminalLog(message: string, type: 'command' | 'output' | 'error' | 'info' = 'output') {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, { message, type, timestamp }] as any);
  }

  function handleTerminalCommand(cmd: string) {
    if (!cmd.trim()) return;
    addTerminalLog(`$ ${cmd}`, 'command');
    setTerminalInput('');
    if (cmd.toLowerCase().includes('help')) {
      addTerminalLog('Available commands: help, clear, run, exit', 'info');
    } else if (cmd.toLowerCase().includes('clear')) {
      setTerminalLogs([]);
    } else if (cmd.toLowerCase().includes('run')) {
      addTerminalLog('Running test suite...', 'info');
      setTimeout(() => { 
        addTerminalLog('Test results: 5/7 passed', 'output'); 
        addTerminalLog('Runtime: 145ms', 'output'); 
      }, 500);
    } else if (cmd.toLowerCase().includes('exit')) {
      addTerminalLog('Exiting terminal...', 'info');
      setTerminalLogs([]);
    } else {
      addTerminalLog(`command not found: ${cmd}`, 'error');
    }
  }

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
      case 'typescript-strict': return 'ts';
      case 'java': return 'java';
      case 'cpp': return 'cpp';
      case 'c++': return 'cpp';
      case 'c': return 'c';
      case 'go': return 'go';
      case 'csharp': return 'cs';
      case 'ruby': return 'rb';
      case 'rust': return 'rs';
      case 'kotlin': return 'kt';
      case 'swift': return 'swift';
      case 'php': return 'php';
      case 'scala': return 'scala';
      case 'perl': return 'pl';
      case 'r': return 'r';
      case 'groovy': return 'groovy';
      case 'lua': return 'lua';
      case 'dart': return 'dart';
      case 'elixir': return 'exs';
      case 'haskell': return 'hs';
      case 'clojure': return 'clj';
      case 'vb': return 'vb';
      case 'bash': return 'sh';
      case 'ocaml': return 'ml';
      case 'fsharp': return 'fs';
      case 'julia': return 'jl';
      case 'sql': return 'sql';
      case 'objective-c': return 'm';
      case 'matlab': return 'm';
      case 'powershell': return 'ps1';
      case 'assembly': return 'asm';
      case 'cobol': return 'cbl';
      case 'lisp': return 'lisp';
      case 'scheme': return 'scm';
      case 'nim': return 'nim';
      case 'crystal': return 'cr';
      case 'zig': return 'zig';
      case 'python':
      default:
        return 'py';
    }
  }

  function templateForLang(lang: string) {
    switch ((lang || '').toLowerCase()) {
      case 'javascript': return 'function main() {\n  console.log("Hello World");\n}\n';
      case 'typescript': return 'function main(): void {\n  console.log("Hello World");\n}\n';
      case 'typescript-strict': return 'function main(): void {\n  console.log("Hello World");\n}\n';
      case 'java': return 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello World");\n  }\n}\n';
      case 'cpp': return '#include <iostream>\nint main(){ std::cout << "Hello World"; return 0; }\n';
      case 'c': return '#include <stdio.h>\nint main(){ printf("Hello World"); return 0; }\n';
      case 'go': return 'package main\nimport "fmt"\nfunc main(){ fmt.Println("Hello World") }\n';
      case 'csharp': return 'using System;\nclass Program { static void Main() { Console.WriteLine("Hello World"); } }\n';
      case 'ruby': return 'puts "Hello World"\n';
      case 'rust': return 'fn main() {\n    println!("Hello World");\n}\n';
      case 'kotlin': return 'fun main() {\n    println("Hello World")\n}\n';
      case 'swift': return 'import Foundation\nprint("Hello World")\n';
      case 'php': return '<?php\necho "Hello World";\n?>\n';
      case 'scala': return 'object Main {\n  def main(args: Array[String]): Unit = {\n    println("Hello World")\n  }\n}\n';
      case 'perl': return '#!/usr/bin/perl\nprint "Hello World\\n";\n';
      case 'r': return 'print("Hello World")\n';
      case 'groovy': return 'println "Hello World"\n';
      case 'lua': return 'print("Hello World")\n';
      case 'dart': return 'void main() {\n  print("Hello World");\n}\n';
      case 'elixir': return 'IO.puts("Hello World")\n';
      case 'haskell': return 'main :: IO ()\nmain = putStrLn "Hello World"\n';
      case 'clojure': return '(println "Hello World")\n';
      case 'vb': return 'Module Main\n  Sub Main()\n    Console.WriteLine("Hello World")\n  End Sub\nEnd Module\n';
      case 'bash': return '#!/bin/bash\necho "Hello World"\n';
      case 'ocaml': return 'let () = print_endline "Hello World"\n';
      case 'fsharp': return 'printfn "Hello World"\n';
      case 'julia': return 'println("Hello World")\n';
      case 'sql': return 'SELECT "Hello World" AS message;\n';
      case 'objective-c': return '#import <Foundation/Foundation.h>\nint main(int argc, const char * argv[]) {\n  NSLog(@"Hello World");\n  return 0;\n}\n';
      case 'matlab': return 'disp("Hello World")\n';
      case 'powershell': return 'Write-Host "Hello World"\n';
      case 'assembly': return 'section .text\n  global _start\n_start:\n  mov rax, 1\n  mov rdi, 1\n  mov rsi, msg\n  mov rdx, 11\n  syscall\n  mov rax, 60\n  mov rdi, 0\n  syscall\nsection .data\n  msg db "Hello World", 0\n';
      case 'cobol': return 'IDENTIFICATION DIVISION.\nPROGRAM-ID. HELLO.\nPROCEDURE DIVISION.\n  DISPLAY "Hello World".\n  STOP RUN.\n';
      case 'lisp': return '(print "Hello World")\n';
      case 'scheme': return '(display "Hello World")\n';
      case 'nim': return 'echo "Hello World"\n';
      case 'crystal': return 'puts "Hello World"\n';
      case 'zig': return 'const std = @import("std");\npub fn main() !void {\n  const stdout = std.io.getStdOut().writer();\n  try stdout.print("Hello World", .{});\n}\n';
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
    setSubmitted(true);
    
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
    }, 1200);
    setToast('✅ Solution submitted! Redirecting...');
  }

  return (
    <div
      ref={containerRef}
      className={`rounded-lg overflow-hidden p-0 shadow-2xl flex flex-col ${prefs.theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#0a0e14] text-white'}`}
      style={{ minHeight: `calc(100vh - ${pageOffset}px)` }}
    >
      {/* Top toolbar - Professional style */}
      <div className={`${prefs.theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#16191e] border-[#2d3139]'} px-6 py-4 flex items-center justify-between border-b shadow-sm`}>
        <div className="flex items-center gap-6">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-sm font-semibold ${prefs.theme === 'light' ? 'text-slate-900' : 'text-white'}`}>HiRalent Code Assessment</div>
            <div className={`text-xs ${prefs.theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{questionTitle}</div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Status Badge - Pill shaped */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm transition-all ${prefs.theme === 'light' ? 'bg-slate-100/80 border border-slate-200' : 'bg-white/8 border border-white/12'}`}>
            <div className={`w-2 h-2 rounded-full ${submitted ? 'bg-emerald-500' : 'bg-yellow-500'}`}></div>
            <span className={`text-xs font-semibold tracking-wide ${prefs.theme === 'light' ? 'text-slate-700' : 'text-white'}`}>
              {submitted ? '✓ COMPLETED' : status ? status.toUpperCase() : 'READY'}
            </span>
          </div>

          {/* Switches Counter - Clean text */}
          {!submitted && (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
              <span>{tabSwitches}/{MAX_TAB_SWITCHES} test cases</span>
            </div>
          )}

          {/* Spacer for visual separation */}
          <div className={`w-px h-6 ${prefs.theme === 'light' ? 'bg-slate-200' : 'bg-slate-700'}`}></div>

          {/* Primary Action Buttons Group */}
          <div className="flex items-center gap-3">
            {/* Run Button */}
            <button
              className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                submitted || submitting
                  ? 'opacity-50 bg-slate-600 cursor-not-allowed text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 hover:shadow-lg hover:scale-105 active:scale-95 text-white'
              }`}
              onClick={() => handleRun()}
              disabled={submitted || submitting}
              style={{
                boxShadow: !submitted && !submitting ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
              }}
              aria-label="Run code"
            >
              {submitting ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
              ) : null}
              {submitting ? 'Running' : 'Run Code'}
            </button>

            {/* Submit Button */}
            {result && result.score !== undefined && (
              <button
                className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  submitted
                    ? 'opacity-50 bg-slate-600 cursor-not-allowed text-white'
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:scale-105 active:scale-95 text-white'
                }`}
                onClick={handleSubmit}
                disabled={submitted}
                style={{
                  boxShadow: !submitted ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
                }}
                aria-label="Submit solution"
              >
                {submitted ? 'Submitted' : 'Submit'}
              </button>
            )}
          </div>

          {/* Utility Icons Group */}
          <div className="flex items-center gap-1.5">
            {/* Theme Toggle Button */}
            <button 
              title={prefs.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className={`p-2 rounded-md transition-all duration-200 ${prefs.theme === 'light' ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/8'}`}
              onClick={() => setPrefs({ ...prefs, theme: prefs.theme === 'dark' ? 'light' : 'dark' })}
              aria-label="Toggle theme"
            >
              {prefs.theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Settings Button */}
            <button 
              title="Settings"
              className={`p-2 rounded-md transition-all duration-200 ${prefs.theme === 'light' ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/8'}`}
              onClick={() => setShowSettings(true)}
              aria-label="Open settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      {/* Main Content Area */}
      <div className={`flex-1 flex items-stretch gap-0 ${prefs.theme === 'light' ? 'bg-slate-50' : 'bg-[#0a0e14]'}`}>
        {/* Left Sidebar - Question Panel - REDESIGNED */}
        {showQuestionPanel && (
          <div className={`w-96 flex flex-col ${prefs.theme === 'light' ? 'border-slate-200 bg-white' : 'border-[#2d3139] bg-[#16191e]'} border-r`}> 
            <div className="h-full flex flex-col overflow-auto">
              {/* Header with Close Button */}
              <div className={`sticky top-0 px-6 py-4 border-b ${prefs.theme === 'light' ? 'border-slate-200 bg-white' : 'border-[#2d3139] bg-[#16191e]'} flex items-center justify-between`}>
                <h2 className={`text-2xl font-bold ${prefs.theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{questionTitle}</h2>
                <button onClick={() => setShowQuestionPanel(false)} className={`p-1 rounded ${prefs.theme === 'light' ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-[#2d3139] text-slate-500'}`}><X className="w-5 h-5"/></button>
              </div>

              {/* Difficulty Badge and Language */}
              <div className="px-6 py-3 flex items-center gap-2 border-b border-[#2d3139]">
                <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${getDifficultyColor(questionDifficulty)}`}>
                  {questionDifficulty?.charAt(0).toUpperCase() + (questionDifficulty?.slice(1) || 'Medium')}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full ${prefs.theme === 'light' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#2d3139] text-slate-300 border-[#3d4451]'} border font-medium`}>
                  {questionLanguage?.toUpperCase()}
                </span>
              </div>

              {/* Challenge Content */}
              <div className="flex-1 overflow-auto p-6 space-y-6">
                {/* Description - No header */}
                <div>
                  <p className={`text-sm leading-relaxed ${prefs.theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                    Write a function named "solve" that takes integers as parameters and returns their sum. Test your solution against multiple test cases.
                  </p>
                </div>

                {/* Constraints */}
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 ${prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Constraints</h4>
                  <ul className="space-y-2">
                    <li className={`text-sm ${prefs.theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>• Time Limit: 5 seconds</li>
                    <li className={`text-sm ${prefs.theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>• Memory Limit: 256 MB</li>
                  </ul>
                </div>

                {/* Examples */}
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 ${prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Examples</h4>
                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg ${prefs.theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-[#2d3139] border-[#3d4451]'} border text-xs space-y-1`}>
                      <div className={`font-semibold ${prefs.theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>Example 1:</div>
                      <div className={`font-mono ${prefs.theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>
                        <div><span className={prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-500'}>Input:</span> <span className={prefs.theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}>5 3</span></div>
                        <div><span className={prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-500'}>Output:</span> <span className={prefs.theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}>8</span></div>
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg ${prefs.theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-[#2d3139] border-[#3d4451]'} border text-xs space-y-1`}>
                      <div className={`font-semibold ${prefs.theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>Example 2:</div>
                      <div className={`font-mono ${prefs.theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>
                        <div><span className={prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-500'}>Input:</span> <span className={prefs.theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}>-1 1</span></div>
                        <div><span className={prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-500'}>Output:</span> <span className={prefs.theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}>0</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed panel button */}
        {!showQuestionPanel && (
          <button
            onClick={() => setShowQuestionPanel(true)}
            className="p-3 rounded-r-lg bg-slate-900 hover:bg-slate-800 text-white border-l border-slate-700 h-fit"
            title="Show question"
          >
            <ChevronDown className="w-4 h-4 rotate-270" />
          </button>
        )}

        {/* Editor + tabs - Middle section */}
        <div className={`flex-1 p-0 flex flex-col ${prefs.theme === 'light' ? 'bg-white' : 'bg-[#16191e]'} relative`}>
          {submitted && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">Solution Submitted</h3>
                <p className="text-sm text-slate-600">Your submission has been locked</p>
              </div>
            </div>
          )}
          
          <div className={`${prefs.theme === 'light' ? 'bg-white border-slate-300' : 'bg-[#16191e] border-[#2d3139]'} border-b px-6 py-3 flex items-center gap-3`}>
            <div className="flex gap-2 items-center flex-wrap" role="tablist" aria-label="Files">
              {files.map(f => (
                <div key={f.id} className={`flex items-center gap-2 px-3 py-2 rounded-t-lg transition border-b-2 cursor-pointer ${activeFile === f.id ? `border-b-blue-500 ${prefs.theme === 'light' ? 'bg-white text-slate-900 font-medium' : 'bg-[#16191e] text-white font-medium'}` : `border-b-transparent ${prefs.theme === 'light' ? 'bg-transparent text-slate-600 hover:text-slate-900' : 'bg-transparent text-slate-500 hover:text-slate-300'}`}`} role="tab" aria-selected={activeFile===f.id} tabIndex={0} onClick={() => {
                  if (submitted) return;
                  if (activeFile !== f.id && tabSwitches >= MAX_TAB_SWITCHES) {
                    setToast(`⚠️ Tab switch limit reached (${MAX_TAB_SWITCHES}). You cannot switch tabs.`);
                    return;
                  }
                  if (activeFile !== f.id) {
                    setActiveFile(f.id);
                    setTabSwitches(prev => prev + 1);
                  }
                }}>
                  <button className="text-xs font-medium truncate max-w-[8rem]">{f.name}</button>
                  {files.length > 1 && !submitted && (
                    <button title="Delete file" onClick={(e) => { e.stopPropagation(); deleteFile(f.id); }} className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition" aria-label={`Delete ${f.name}`}><X className="w-3 h-3"/></button>
                  )}
                </div>
              ))}
              {!submitted && (
                <button onClick={addFile} className={`px-3 py-2 rounded-t-lg text-sm font-medium transition ${prefs.theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-500 hover:text-slate-300'}`} title="Create file" aria-label="Create file">+ New File</button>
              )}
            </div>
            <div className="ml-auto flex gap-2">
                {/* Language selector for active file */}
                <div className={`flex items-center gap-2 rounded px-2 py-1 border ${prefs.theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#2d3139] border-[#3d4451]'}`}>
                  <label className={`text-xs mr-1 font-medium ${prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>Language</label>
                  <select value={(files.find(f => f.id === activeFile)?.language) || 'python'} onChange={(e) => { if (!submitted) changeLanguage(activeFile, e.target.value); }} disabled={submitted} className={`bg-transparent text-sm outline-none font-medium disabled:opacity-60 ${prefs.theme === 'light' ? 'text-slate-800' : 'text-slate-300'}`}>
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="c">C</option>
                    <option value="go">Go</option>
                    <option value="csharp">C#</option>
                    <option value="ruby">Ruby</option>
                    <option value="rust">Rust</option>
                    <option value="kotlin">Kotlin</option>
                    <option value="swift">Swift</option>
                    <option value="php">PHP</option>
                    <option value="scala">Scala</option>
                    <option value="perl">Perl</option>
                    <option value="r">R</option>
                  </select>
                </div>
                <button className={`px-2 py-1 rounded transition ${prefs.theme === 'light' ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-[#2d3139] text-slate-500'}`} onClick={() => copyCode()} title="Copy code"><Copy className="w-4 h-4"/></button>
            </div>
          </div>

          <div className={`flex-1 rounded-none overflow-hidden min-h-0 relative ${prefs.theme === 'light' ? 'bg-white' : 'bg-[#16191e]'}`}>
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
                fontSize: prefs.fontSize || 14,
                lineHeight: (prefs.fontSize || 14) * 1.5,
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

        {/* Output panel with professional terminal */}
        <div className={`w-full sm:w-96 flex flex-col border-l ${prefs.theme === 'light' ? 'border-slate-200 bg-white text-slate-900' : 'border-[#2d3139] bg-[#0a0e14] text-slate-100'}`}>
          {/* Tab navigation - Professional style */}
          <div className={`${prefs.theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#16191e] border-[#2d3139]'} border-b px-4 flex items-center gap-1`}>
            <button
              onClick={() => setOutputTab('results')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                outputTab === 'results'
                  ? `border-b-blue-500 ${prefs.theme === 'light' ? 'text-blue-600 bg-white' : 'text-blue-400 bg-slate-800/60'}`
                  : `${prefs.theme === 'light' ? 'border-b-transparent text-slate-500 hover:text-slate-700' : 'border-b-transparent text-slate-500 hover:text-slate-300'}`
              }`}
            >
              Test Results
            </button>
            <button
              onClick={() => setOutputTab('input')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                outputTab === 'input'
                  ? 'border-b-blue-500 text-blue-400 bg-slate-800/60'
                  : 'border-b-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              Custom Input
            </button>
            <button
              onClick={() => setOutputTab('output')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                outputTab === 'output'
                  ? `border-b-blue-500 ${prefs.theme === 'light' ? 'text-blue-600 bg-white' : 'text-blue-400 bg-slate-800/60'}`
                  : `${prefs.theme === 'light' ? 'border-b-transparent text-slate-500 hover:text-slate-700' : 'border-b-transparent text-slate-500 hover:text-slate-300'}`
              }`}
            >
              Output
            </button>
            <div className="ml-auto flex items-center gap-2">
              {submitted && (
                <div className="text-xs text-emerald-400 flex items-center gap-1 px-2 py-1 rounded bg-emerald-900/20 border border-emerald-800/40">
                  <Lock className="w-3 h-3" />
                  Submitted
                </div>
              )}
            </div>
          </div>

          {/* Terminal Content */}
          <div className={`flex-1 overflow-auto text-xs min-h-0 font-mono p-4 space-y-3 ${prefs.theme === 'light' ? 'bg-white text-slate-900' : 'bg-[#0a0e14] text-slate-100'}`}  style={{fontFamily: "'Fira Code', 'JetBrains Mono', monospace"}}>
            {/* Test Results Tab */}
            {outputTab === 'results' && (
              <div className="space-y-3">
                {!result && status !== 'pending' && status !== 'creating' && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-slate-400 mb-1">Ready to run</div>
                      <div className="text-xs text-slate-500">Press Run to execute your code</div>
                    </div>
                  </div>
                )}

                {(status === 'pending' || status === 'creating') && (
                  <div className="space-y-2 text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 animate-pulse">⟳</span>
                      <span>Running submission...</span>
                    </div>
                  </div>
                )}

                {result && (
                  <div className="space-y-4">
                    {/* Metrics - Single Horizontal Row */}
                    <div className="flex gap-8 items-start px-4 py-3">
                      <div>
                        <div className={`text-xs font-medium mb-1 ${prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>Score</div>
                        <div className={`text-2xl font-bold ${prefs.theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`}>{result.score ?? '0'}%</div>
                      </div>
                      <div>
                        <div className={`text-xs font-medium mb-1 ${prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>Runtime</div>
                        <div className={`text-2xl font-bold ${prefs.theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>{result.runner?.runtimeMs ?? '0'}ms</div>
                      </div>
                      <div>
                        <div className={`text-xs font-medium mb-1 ${prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>Memory</div>
                        <div className={`text-2xl font-bold ${prefs.theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>{result.runner?.memoryKb ?? '0'}KB</div>
                      </div>
                    </div>

                    {/* Test Results */}
                    <div className={`border-t ${prefs.theme === 'light' ? 'border-slate-200' : 'border-[#2d3139]'} pt-3`}>
                      {(result.runner?.results || result.results || []).length === 0 ? (
                        <div className={`text-sm ${prefs.theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>No test results available</div>
                      ) : (
                        (result.runner?.results || result.results || []).map((t: any, i: number) => (
                          <div key={i} className={`mb-3 pb-3 ${i < (result.runner?.results || result.results || []).length - 1 ? `border-b ${prefs.theme === 'light' ? 'border-slate-200' : 'border-[#2d3139]'}` : ''}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className={`font-semibold text-sm ${prefs.theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Test {i+1}</div>
                              <div className={`flex items-center gap-1 font-semibold text-sm ${t.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                                {t.passed ? '✓ PASSED' : '✗ FAILED'}
                              </div>
                            </div>
                            <div className={`text-xs space-y-1 font-mono ${prefs.theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>
                              <div><span className={prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-500'}>Input:</span> {t.input ? t.input.substring(0, 30) : '—'}</div>
                              <div><span className={prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-500'}>Expected:</span> {t.expected ? t.expected.substring(0, 30) : '—'}</div>
                              <div><span className={prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-500'}>Actual:</span> {t.actual ? t.actual.substring(0, 30) : '—'}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Run and Submit Buttons */}
                    <div className={`border-t ${prefs.theme === 'light' ? 'border-slate-200' : 'border-[#2d3139]'} pt-3 flex gap-2`}>
                      <button onClick={() => handleRun()} className={`flex-1 px-3 py-2 rounded font-medium transition ${prefs.theme === 'light' ? 'bg-blue-100 hover:bg-blue-200 text-blue-700' : 'bg-blue-600 hover:bg-blue-700 text-white'}`} disabled={submitting}>
                        ▶ Run
                      </button>
                      <button onClick={handleSubmit} className={`flex-1 px-3 py-2 rounded font-medium transition ${prefs.theme === 'light' ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                        ✓ Submit
                      </button>
                    </div>

                    {/* Terminal Section - Apple Terminal Style with Interactivity */}
                    <div className={`border-t ${prefs.theme === 'light' ? 'border-slate-200' : 'border-[#1e1e1e]'} mt-4 rounded-lg overflow-hidden`}>
                      {/* Terminal Header */}
                      <div className={`flex items-center gap-3 px-4 py-3 ${prefs.theme === 'light' ? 'bg-slate-100' : 'bg-[#2d2d30]'}`}>
                        <div className="flex gap-2">
                          <button onClick={() => setTerminalLogs([])} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer transition" title="Clear terminal" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer transition" />
                          <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 cursor-pointer transition" />
                        </div>
                        <span className={`text-xs font-medium ml-auto ${prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>bash — 80x24</span>
                      </div>
                      
                      {/* Terminal Body */}
                      <div className={`${prefs.theme === 'light' ? 'bg-white border border-slate-200' : 'bg-[#1a1a1a] border border-[#333]'} px-4 py-4 rounded-b-lg h-[240px] overflow-y-auto font-mono text-sm`}>
                        <div className="space-y-1">
                          {terminalLogs.length === 0 ? (
                            <>
                              <div className={prefs.theme === 'light' ? 'text-slate-500' : 'text-slate-400'}>Last login: Tue Jan 21 10:45:23 on ttys000</div>
                              <div className={prefs.theme === 'light' ? 'text-slate-500' : 'text-slate-400'}>Type 'help' for available commands</div>
                            </>
                          ) : (
                            terminalLogs.map((log: any, idx) => (
                              <div key={idx} className={`
                                ${log.type === 'command' ? (prefs.theme === 'light' ? 'text-slate-700' : 'text-slate-300') : ''}
                                ${log.type === 'error' ? (prefs.theme === 'light' ? 'text-red-600' : 'text-red-400') : ''}
                                ${log.type === 'info' ? (prefs.theme === 'light' ? 'text-blue-600' : 'text-blue-400') : ''}
                                ${log.type === 'output' ? (prefs.theme === 'light' ? 'text-emerald-600' : 'text-emerald-400') : ''}
                              `}>
                                {log.message}
                              </div>
                            ))
                          )}
                          <div ref={terminalEndRef} />
                        </div>
                      </div>

                      {/* Terminal Input */}
                      <div className={`flex items-center gap-2 px-4 py-3 border-t ${prefs.theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#242424] border-[#333]'}`}>
                        <span className={prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-400'}>$</span>
                        <input
                          type="text"
                          value={terminalInput}
                          onChange={(e) => setTerminalInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleTerminalCommand(terminalInput);
                            }
                          }}
                          placeholder="Enter command..."
                          className={`flex-1 bg-transparent outline-none font-mono text-sm ${prefs.theme === 'light' ? 'text-slate-700' : 'text-slate-300'} placeholder-slate-500`}
                          autoFocus
                        />
                        <button
                          onClick={() => handleTerminalCommand(terminalInput)}
                          className={`px-2 py-1 rounded text-xs font-medium transition ${
                            prefs.theme === 'light'
                              ? 'bg-blue-500 hover:bg-blue-600 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom Input Tab */}
            {outputTab === 'input' && (
              <div className="space-y-3">
                <div className="text-slate-400 text-xs mb-2">Provide custom test input below:</div>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Enter your custom input here..."
                  className="w-full h-48 bg-slate-800 border border-slate-700 rounded p-3 text-slate-100 text-xs font-mono resize-none focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => {
                    setToast('Custom input saved');
                  }}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition"
                >
                  Run with Custom Input
                </button>
              </div>
            )}

            {/* Output Tab - Professional Terminal */}
            {outputTab === 'output' && (
              <div className={`space-y-2 font-mono text-xs leading-relaxed px-4 py-3 ${prefs.theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>
                <div className={prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-300'}>Welcome to Terminal</div>
                <div className={prefs.theme === 'light' ? 'text-slate-600' : 'text-slate-300'}>Type 'help' to see available commands</div>
                <div className={`mt-3 ${prefs.theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>$</div>
                <div className={`text-xs ${prefs.theme === 'light' ? 'text-slate-500' : 'text-slate-600'}`}>Active Windows</div>
              </div>
            )}
          </div>
        </div>
      
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-2xl">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-slate-900">Settings</h3><button onClick={() => setShowSettings(false)} className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4 text-slate-600"/></button></div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2 text-slate-700">Theme</label>
                <div className="flex gap-2">
                  <button onClick={() => setPrefs({ ...prefs, theme: 'dark' })} className={`px-4 py-2 rounded-lg font-medium transition ${prefs.theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><Moon className="w-4 h-4 inline mr-2"/> Dark</button>
                  <button onClick={() => setPrefs({ ...prefs, theme: 'light' })} className={`px-4 py-2 rounded-lg font-medium transition ${prefs.theme === 'light' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><Sun className="w-4 h-4 inline mr-2"/> Light</button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-2 text-slate-700">Font Size</label>
                <div className="flex items-center gap-4">
                  <input type="range" min={12} max={20} value={prefs.fontSize || 14} onChange={(e) => setPrefs({ ...prefs, fontSize: Number(e.target.value) })} className="flex-1" />
                  <span className="text-sm font-medium text-slate-700 w-8">{prefs.fontSize || 14}px</span>
                </div>
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-emerald-100 rounded-full shadow-sm">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
            </div>

            {/* Title & Message */}
            <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">Perfect!</h3>
            <p className="text-slate-600 text-center mb-6">Your solution has passed the tests</p>

            {/* Results Summary */}
            {result && (
              <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Score</span>
                    <span className="text-2xl font-bold text-emerald-600">{result.score ?? '—'}%</span>
                  </div>
                  {result.results && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Tests Passed</span>
                      <span className="text-lg font-bold text-slate-900">
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
                className="flex-1 px-4 py-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition font-semibold"
              >
                Keep Coding
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 px-4 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition font-semibold shadow-lg"
              >
                Submit & Exit
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center mt-4">
              You will be redirected after submission
            </p>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (<div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-2 rounded shadow">{toast}</div>)}
    </div>
  );
}
