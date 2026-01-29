"use client";
import React from 'react';
import CodeRunner from '../../src/components/Code-Runner-Frontend/CodeRunner';

export default function Page() {
  return (
    <div className="w-screen h-screen flex flex-col bg-slate-50 overflow-hidden">
      <main className="flex-1 overflow-auto">        <CodeRunner />
      </main>
    </div>
  );
}