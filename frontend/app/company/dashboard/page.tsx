import ProtectedRoute from '@/src/components/layout/ProtectedRoute'
import React from 'react'

const page = () => {
  return (
    <ProtectedRoute>
      <div>
        <h1>Company Dashboard coming soon </h1>
      </div>
    </ProtectedRoute>
  )
}

export default page
