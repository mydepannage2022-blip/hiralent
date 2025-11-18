"use client";
import React, { useEffect } from "react";
import { useAuth } from "../../../../src/context/AuthContext";
import { initializeSocket, disconnectSocket } from "../../../../src/lib/message/socket.client";
import ChatShell from "../../../../src/components/candidate/dashboard/message/ChatShell";

const MessagePage: React.FC = () => {
  const { user, token } = useAuth();

  // Initialize Socket.io when component mounts
  useEffect(() => {
    if (token) {
      console.log("🔌 Initializing socket for user:", user?.full_name);
      initializeSocket(token);

      // Cleanup on unmount
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

export default MessagePage;