"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Tout ce qui commence par /assessment => mode "standalone"
  const isAssessmentWorld = pathname?.startsWith("/assessment") || pathname?.startsWith("/simple-test");

  if (isAssessmentWorld) {
    return <>{children}</>;
  }

  // Sinon layout normal (mets ton vrai header/footer ici)
  return (
    <div className="min-h-screen">
      {/* <YourHeader /> */}
      {children}
      {/* <YourFooter /> */}
    </div>
  );
}
