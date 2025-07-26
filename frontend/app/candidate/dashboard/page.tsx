"use client"

import DashboardSidebar from "@/app/src/components/candidate/dashboard/DashboardSidebar";
import ProtectedRoute from "../../src/components/layout/ProtectedRoute";
import React from 'react'
import DashboardHome from "@/app/src/components/candidate/dashboard/mainComponents/DashboardHome";

const page = () => {

  return (
    <ProtectedRoute>
    <div className="w-full bg-[#F9F9F9]">
      <DashboardHome/>
    </div>
    </ProtectedRoute>
  )
}

export default page
