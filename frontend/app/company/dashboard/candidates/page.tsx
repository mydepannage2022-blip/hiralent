"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CandidatesRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/company/dashboard/candidates/internal");
  }, [router]);

  return null;
}
