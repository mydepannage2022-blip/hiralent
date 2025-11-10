"use client";
import React from 'react';
import CodeEditor from '../../src/components/Code-Runner-Frontend/CodeEditor';

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Code Runner</h1>
      <div style={{ height: '80vh' }}>
        <CodeEditor />
      </div>
    </div>
  );
}
