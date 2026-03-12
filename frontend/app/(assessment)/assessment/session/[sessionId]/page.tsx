"use client";

import React from "react";
import { useParams } from "next/navigation";
import HiralentRunner from "@/src/components/assessment/HiralentRunner";

export default function Page() {
  const params = useParams();
  const sessionId = String((params as any)?.sessionId || "");
  return <HiralentRunner sessionId={sessionId} />;
}
