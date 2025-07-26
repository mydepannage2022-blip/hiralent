"use client"

import DashboardSidebar from "@/app/src/components/candidate/dashboard/DashboardSidebar";
import ProtectedRoute from "../../src/components/layout/ProtectedRoute";
import React from 'react'

const page = () => {

  return (
    <ProtectedRoute>
    <div className="w-full">
    <DashboardSidebar/>

    <div className="flex flex-col justify-center items-center">

    </div>
    </div>
    </ProtectedRoute>
  )
}

export default page
