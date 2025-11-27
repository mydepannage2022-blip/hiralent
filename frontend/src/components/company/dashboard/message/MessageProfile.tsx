"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Search, X } from "lucide-react";

const ALL_MESSAGES = [
  { id: 1, company: "Schlumberger", time: "1 minute ago", text: "Your application...", unread: 4 },
  { id: 2, company: "Woodplc", time: "6 minutes ago", text: "To proceed...", online: true },
  { id: 3, company: "Partners Success", time: "23 minutes ago", text: "Dear Ana...", unread: 2 },
  // comment out above to test empty state → []
];

interface MessageProfileProps {
  onSelectChat: (chat: any) => void;
  selectedChat: any;
}

export default function MessageProfile({ onSelectChat, selectedChat }: MessageProfileProps) {
  const [search, setSearch] = useState("");
  const [allChats] = useState(ALL_MESSAGES);

  // Filter chats dynamically
  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allChats;
    return allChats.filter(
      (c) =>
        c.company.toLowerCase().includes(q) ||
        String(c.text || "").toLowerCase().includes(q)
    );
  }, [search, allChats]);

  const hasChats = allChats.length > 0;

  // Reset selection when all chats are removed
  useEffect(() => {
    if (!hasChats) onSelectChat(null);
  }, [hasChats, onSelectChat]);

  // Highlight matching part
  const highlightMatch = (text: string) => {
    if (!search.trim()) return text;
    const regex = new RegExp(`(${search})`, "gi");
    return text.split(regex).map((part, i) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <span key={i} className="bg-blue-100 text-blue-600 font-medium">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="h-screen overflow-y-auto px-3 flex flex-col">
      {/* Search Bar */}
      <div className="sticky top-0 bg-white z-10 pt-3">
        <div className="flex items-center bg-gray-100 rounded-xl px-3 py-2 mb-4 relative">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-2 w-full bg-transparent outline-none text-sm pr-6"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 text-gray-500 hover:text-gray-700 transition"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Chat List / Empty States */}
      {hasChats ? (
        <div className="space-y-1 flex-1">
          {filteredChats.length > 0 ? (
            filteredChats.map((msg) => (
              <div
                key={msg.id}
                onClick={() => onSelectChat(msg)}
                className={`flex items-center gap-2 border-b pb-2 px-2 cursor-pointer rounded-lg transition 
                  ${selectedChat?.id === msg.id ? "bg-gray-100" : "hover:bg-gray-50"}`}
              >
                {/* Avatar */}
                <div className="relative w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                  {msg.company.charAt(0)}
                  {msg.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                  )}
                </div>

                {/* Chat Info */}
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h4 className="font-semibold text-sm">{highlightMatch(msg.company)}</h4>
                    <span className="text-[10px] text-gray-400">{msg.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-[11px] text-gray-500 truncate flex-1">
                      {highlightMatch(msg.text)}
                    </p>
                    {msg.unread && (
                      <span className="text-[9px] bg-red-500 text-white w-4 h-4 flex items-center justify-center rounded-full ml-1">
                        {msg.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            // only text when search yields no results
            <div className="flex-1 flex items-center justify-center text-center text-gray-500">
              <p className="text-sm">No chats found</p>
            </div>
          )}
        </div>
      ) : (
        // show button only if chat list truly empty
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
          <p className="text-sm mb-3">No chats here yet</p>
          <div
            onClick={() => alert("Navigate to Search Jobs")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg cursor-pointer"
          >
            Search a Job
          </div>
        </div>
      )}
    </div>
  );
}