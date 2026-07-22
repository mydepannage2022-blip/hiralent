"use client";
import React, { Suspense } from 'react';
import CodeRunner from '../../src/components/Code-Runner-Frontend/CodeRunner';

export default function Page() {
  return (
    <div className="w-screen h-screen flex flex-col bg-slate-50 overflow-hidden">
      <main className="flex-1 overflow-auto">
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
          <CodeRunner />
        </Suspense>
      </main>
    </div>
  );
}