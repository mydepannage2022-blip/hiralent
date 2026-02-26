import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#05070b] text-white">{children}</div>;
}
