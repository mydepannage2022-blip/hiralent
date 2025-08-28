import React from "react";
import { Search } from "lucide-react";

const messages = [
  {
    id: 1,
    company: "Schlumberger",
    time: "1 minutes ago",
    text: "Your application for the ‘Business Analyst’ role is s...",
    unread: 4,
  },
  {
    id: 2,
    company: "Woodplc",
    time: "6 minutes ago",
    text: "To proceed with your application for the ‘Product Man...",
    online: true,
  },
  {
    id: 3,
    company: "Etihad Airways",
    time: "7 minutes ago",
    text: "Dear Ana, Thank you for your interest in the ‘Front-en...",
  },
  {
    id: 4,
    company: "IOGP",
    time: "9 minutes ago",
    text: "Good news! You’ve been shortlisted for the next stage...",
    online: true,
  },
  {
    id: 5,
    company: "Baker Hughes",
    time: "10 minutes ago",
    text: "We’d appreciate your feedback on your recent int...",
    unread: 5,
  },
  {
    id: 6,
    company: "Aramco",
    time: "15 minutes ago",
    text: "We wanted to inform you that the ‘HR Coordinator’...",
    unread: 5,
  },
  {
    id: 7,
    company: "Emirates Global",
    time: "16 minutes ago",
    text: "We’d appreciate your feedback on your recent intervie...",
  },
  {
    id: 8,
    company: "Partners Success",
    time: "23 minutes ago",
    text: "Dear Ana, Thank you for your interest in the ‘Front-en...",
  },
  {
    id: 9,
    company: "Weir",
    time: "59 minutes ago",
    text: "Thank you for applying for the ‘Software Engineer’...",
    unread: 1,
    online: true,
  },
  {
    id: 10,
    company: "Tuv-nord",
    time: "22 hour ago",
    text: "We were impressed with your resume and would li...",
    unread: 5,
  },
  {
    id: 11,
    company: "ADNOC",
    time: "3 days ago",
    text: "You’re invited to our upcoming virtual career event, wh...",
  },
];

function MessageProfile() {
  return (
    <div className="h-screen overflow-y-auto border-r  px-3">
      {/* Search Bar */}
      <div className="bg-white sticky top-0 z-1 pt-3">
        <div className="flex items-center bg-gray-100 rounded-xl px-3 py-2 mb-4 ">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search"
            className="ml-2 w-full bg-transparent outline-none text-sm"
          />
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-1">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-center gap-2 border-b pb-2">
            {/* Left side */}
            <div className="flex items-start">
              {/* Avatar placeholder (circle with initials) */}
              <div className="relative w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                {msg.company.charAt(0)}
                {msg.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                )}
              </div>
            </div>
            <div className="flex-1">
              {/* Texts */}
              <div className="flex justify-between">
                <h4 className="font-semibold text-sm">{msg.company}</h4>
                <span className="text-[10px] text-gray-400">{msg.time}</span>
              </div>

              {/* Right side */}
              <div className="flex space-y-1">
                <p className="text-[11px] text-gray-500 truncate flex-1">
                  {msg.text}
                </p>
                {msg.unread && (
                  <span className="text-[9px] bg-red-500 text-white w-4 h-4 flex items-center justify-center rounded-full">
                    {msg.unread}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MessageProfile;
