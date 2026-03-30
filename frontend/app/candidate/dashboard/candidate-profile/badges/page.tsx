// app/candidate/dashboard/candidate-profile/badges/page.tsx

import BadgeWall from "@/src/components/candidate/dashboard/profile/badges/BadgeWall";
import ChatbotButton from "@/src/components/candidate/dashboard/chatbot/ChatbotButton";

export default function CandidateBadgesPage() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-8">
      <BadgeWall />
      <ChatbotButton />

    </div>
  );
}
