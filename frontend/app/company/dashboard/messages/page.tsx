"use client";
import dynamic from "next/dynamic";
import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";

const MessageProfile = dynamic(
  () => import("@/src/components/company/dashboard/message/MessageProfile"),
  { loading: () => <div className="animate-pulse bg-gray-200 w-80 h-full rounded-xl" /> }
);

const UserChats = dynamic(
  () => import("@/src/components/company/dashboard/message/UserChats"),
  { loading: () => <div className="animate-pulse bg-gray-200 flex-1 h-96 rounded-xl" /> }
);

export default function Page() {
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleBack = () => setSelectedChat(null);

  return (
    <div className="w-full h-full flex border rounded-xl bg-white">
      {/* 🖥️ Desktop View */}
      {!isMobileView ? (
        <>
          {/* Left Sidebar */}
          <div className="w-[320px] border-r">
            <MessageProfile onSelectChat={setSelectedChat} selectedChat={selectedChat} />
          </div>

          {/* Right Side */}
          <div className="flex-1 flex items-center justify-center">
            {selectedChat ? (
              <UserChats chat={selectedChat} />
            ) : (
              <p className="text-gray-400 text-sm">Select a chat to start messaging</p>
            )}
          </div>
        </>
      ) : (
        // 📱 Mobile View
        <div className="flex-1 h-screen flex flex-col">
          {!selectedChat ? (
            // Show Chat List
            <MessageProfile onSelectChat={setSelectedChat} selectedChat={selectedChat} />
          ) : (
            // Show Chat Window with only Back Button
            <div className="flex flex-col h-full">
              <div className="flex items-center p-3 border-b bg-white">
                <button
                  onClick={handleBack}
                  className="p-2 rounded-full hover:bg-gray-100 transition"
                  aria-label="Go back"
                >
                  <ArrowLeft size={20} />
                </button>
              </div>

              {/* Chat Content */}
              <div className="flex-1 overflow-y-auto">
                <UserChats chat={selectedChat} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}