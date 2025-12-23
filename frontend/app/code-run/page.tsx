"use client";
import React from 'react';
import CodeRunner from '../../src/components/Code-Runner-Frontend/CodeRunner';

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 p-6 pt-24">
        <CodeRunner />
      </main>
    </div>
  );
}
