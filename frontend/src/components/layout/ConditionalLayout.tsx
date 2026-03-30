"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

const ConditionalLayout = ({ children }: ConditionalLayoutProps) => {
  const pathname = usePathname();

  // Routes where navbar/footer should NOT show
  // ✅ On garde ton système + on ajoute le "Assessment World" standalone
  const excludeLayoutRoutes = [
    // Candidate
    "/candidate/dashboard",
    "/candidate/dashboard/candidate-profile",
    "/candidate/dashboard/notifications",
    "/candidate/dashboard/messages",
    "/candidate/dashboard/settings",
    "/candidate/dashboard/analytics",

    // Company / Agency / Admin
    "/company/dashboard",
    "/agency/dashboard",
    "/admin/dashboard",
    "/admin/login",

    // Auth & public special flows
    "/auth/",
    "/job/findjob",
    "/code-run",

    // ✅ NEW: Assessment standalone world (HackerRank-like)
    "/assessment",
    "/simple-test",
  ];

  const shouldHideLayout = pathname
    ? excludeLayoutRoutes.some((route) => pathname.startsWith(route))
    : false;

  return (
    <>
      {!shouldHideLayout && <Navbar />}
      {children}
      {!shouldHideLayout && <Footer />}
    </>
  );
};

export default ConditionalLayout;
