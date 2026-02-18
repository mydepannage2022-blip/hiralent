"use client";
import React, { useEffect } from "react";
import { useAuth } from "../../../../src/context/AuthContext";
import { initializeSocket, disconnectSocket } from "../../../../src/lib/message/socket.client";
import ChatShell from "../../../../src/components/agency/dashboard/message/ChatShell";

const AgencyMessagePage: React.FC = () => {
  const { user, token } = useAuth();

  useEffect(() => {
    if (token) {
      initializeSocket(token);
      return () => {
        disconnectSocket();
      };
    }
  }, [token, user?.full_name]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Please log in to access messages</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ChatShell />
    </div>
  );
};

export default AgencyMessagePage;
