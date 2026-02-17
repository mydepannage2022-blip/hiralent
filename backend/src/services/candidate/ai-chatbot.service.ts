import { PrismaClient } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

type Role = "user" | "assistant";

interface ChatContext {
  candidateId: string;
  profileData?: any;
  completenessData?: any;
  badgesData?: any;
  skillsData?: any;
}

/* ==================== GET CANDIDATE CONTEXT ==================== */
export async function getCandidateContext(candidateId: string): Promise<ChatContext> {
  const user = await prisma.user.findUnique({
    where: { user_id: candidateId },
    include: {
      candidateProfile: true,
      candidateSkills: {
        orderBy: [{ is_verified: "desc" }, { created_at: "desc" }],
      },
      profileCompleteness: {
        orderBy: { last_calculated: "desc" },
        take: 1,
      },
    },
  });

  if (!user) throw new Error("Candidate not found");

  const badges = await prisma.badge.findMany({
    include: { awards: { where: { candidate_id: candidateId } } },
  });

  const earnedBadges = badges.filter((b) => b.awards.length > 0);
  const lockedBadges = badges.filter((b) => b.awards.length === 0);

  return {
    candidateId,
    profileData: {
      full_name: user.full_name,
      email: user.email,
      phone: user.phone_number,
      headline: user.candidateProfile?.headline,
      about_me: user.candidateProfile?.about_me,
      location: user.candidateProfile?.location,
      profile_picture: user.candidateProfile?.profile_picture_url,
      experience: user.candidateProfile?.experience ? JSON.parse(user.candidateProfile.experience) : [],
      education: user.candidateProfile?.education ? JSON.parse(user.candidateProfile.education) : [],
    },
    completenessData: user.profileCompleteness?.[0] || null,
    badgesData: {
      earned: earnedBadges.map((b) => ({
        name: b.name,
        description: b.description,
        icon: b.icon,
        awarded_at: b.awards[0]?.awarded_at,
      })),
      locked: lockedBadges.map((b) => ({
        name: b.name,
        description: b.description,
        icon: b.icon,
        criteria: b.criteria,
      })),
      total: badges.length,
      earned_count: earnedBadges.length,
    },
    skillsData: {
      total: user.candidateSkills.length,
      verified: user.candidateSkills.filter((s) => s.is_verified).length,
      by_category: user.candidateSkills.reduce((acc, skill) => {
        const cat = skill.skill_category || "other";
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      skills: user.candidateSkills.map((s) => ({
        name: s.skill_name,
        category: s.skill_category,
        proficiency: s.proficiency,
        years: s.years_experience,
        verified: s.is_verified,
        source: s.source_type,
      })),
    },
  };
}

/* ==================== SYSTEM PROMPT ==================== */
function buildSystemPrompt(context: ChatContext): string {
  const { profileData, completenessData, badgesData, skillsData } = context;

  return `You are Hira, an AI assistant for Hiralent. Help candidates improve their profile, CV, skills, scoring, and badges.

Output rules:
- Do not use emojis.
- Be precise and short.
- Prefer bullet points and short steps.
- Do not exceed 8 bullet points unless user asks for more detail.
- Never invent data. Use only the provided context. If missing, say what is missing and how to get it.

Candidate context:
Name: ${profileData.full_name || "Not provided"}
Headline: ${profileData.headline || "Not set"}
Location: ${profileData.location || "Not provided"}
About me: ${profileData.about_me ? "Provided" : "Not provided"}
Experience entries: ${profileData.experience?.length || 0}
Education entries: ${profileData.education?.length || 0}

Profile completeness:
${
  completenessData
    ? `Overall: ${completenessData.overall_score}%
Basic: ${completenessData.basic_info_score}%
Skills: ${completenessData.skills_score}%
Experience: ${completenessData.experience_score}%
Education: ${completenessData.education_score}%
Documents: ${completenessData.document_score}%
Missing: ${(completenessData.missing_fields || []).join(", ") || "None"}`
    : "Not calculated"
}

Skills:
Total: ${skillsData.total}
Verified: ${skillsData.verified}
By category: ${JSON.stringify(skillsData.by_category)}

Badges:
Earned: ${badgesData.earned_count}/${badgesData.total}
Earned names: ${(badgesData.earned || []).map((b: any) => b.name).join(", ") || "None"}
Locked names: ${(badgesData.locked || []).map((b: any) => b.name).join(", ") || "None"}`;
}

/* ==================== CONVERSATIONS API (DB) ==================== */

export async function createChatConversation(candidateId: string) {
  return prisma.chatConversation.create({
    data: {
      candidate_id: candidateId,
      title: "New chat",
      last_message_at: new Date(),
    },
    select: {
      conversation_id: true,
      title: true,
      created_at: true,
      last_message_at: true,
    },
  });
}

export async function listChatConversations(candidateId: string, limit = 30) {
  const take = Math.max(1, Math.min(limit, 50));
  return prisma.chatConversation.findMany({
    where: { candidate_id: candidateId, is_archived: false },
    orderBy: { last_message_at: "desc" },
    take,
    select: {
      conversation_id: true,
      title: true,
      created_at: true,
      last_message_at: true,
    },
  });
}

export async function listConversationMessages(candidateId: string, conversationId: string, limit = 50) {
  // ownership check
  const convo = await prisma.chatConversation.findFirst({
    where: { conversation_id: conversationId, candidate_id: candidateId, is_archived: false },
    select: { conversation_id: true },
  });
  if (!convo) throw new Error("Conversation not found");

  const take = Math.max(1, Math.min(limit, 200));
  const msgs = await prisma.chatMessage.findMany({
    where: { conversation_id: conversationId },
    orderBy: { created_at: "asc" },
    take,
    select: { role: true, content: true, created_at: true },
  });

  return msgs as Array<{ role: Role; content: string; created_at: Date }>;
}

export async function renameConversation(candidateId: string, conversationId: string, title: string) {
  const cleaned = (title || "").trim().slice(0, 80);
  if (!cleaned) throw new Error("Title is required");

  const updated = await prisma.chatConversation.updateMany({
    where: { conversation_id: conversationId, candidate_id: candidateId, is_archived: false },
    data: { title: cleaned },
  });

  if (updated.count === 0) throw new Error("Conversation not found");
}

/* ==================== GENERATE CHAT RESPONSE ==================== */

function toTranscript(history: Array<{ role: Role; content: string }>) {
  return history.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
}

export async function generateChatResponse(
  candidateId: string,
  conversationId: string,
  userMessage: string
): Promise<{ response: string; context_used: boolean }> {
  // ownership check
  const convo = await prisma.chatConversation.findFirst({
    where: { conversation_id: conversationId, candidate_id: candidateId, is_archived: false },
    select: { conversation_id: true, title: true },
  });
  if (!convo) throw new Error("Conversation not found");

  const context = await getCandidateContext(candidateId);
  const systemPrompt = buildSystemPrompt(context);

  // last 10 messages in this conversation
  const history = await prisma.chatMessage.findMany({
    where: { conversation_id: conversationId },
    orderBy: { created_at: "desc" },
    take: 10,
    select: { role: true, content: true },
  });

  const transcript = toTranscript(history.reverse() as any);

  const fullPrompt = `${systemPrompt}

Conversation history:
${transcript || "None"}

User message:
${userMessage}

Assistant response:`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024,
      topP: 0.9,
      topK: 40,
    },
  });

  const response = (result.response.text() || "").trim() || "I could not generate a response.";

  // Persist messages + update convo timestamps
  await prisma.$transaction(async (tx) => {
    await tx.chatMessage.create({
      data: { conversation_id: conversationId, role: "user", content: userMessage },
    });

    await tx.chatMessage.create({
      data: { conversation_id: conversationId, role: "assistant", content: response },
    });

    await tx.chatConversation.update({
      where: { conversation_id: conversationId },
      data: {
        last_message_at: new Date(),
        // auto-title if still default
        title: convo.title === "New chat" ? userMessage.slice(0, 60) : undefined,
      },
    });
  });

  return { response, context_used: true };
}

/* ==================== SUGGESTIONS ==================== */
export function getSuggestedQuestions(context: ChatContext): string[] {
  const suggestions: string[] = [];

  if (context.completenessData) {
    const score = context.completenessData.overall_score;
    if (score < 50) {
      suggestions.push("How can I improve my profile score?");
      suggestions.push("What sections are missing from my profile?");
    } else if (score < 80) {
      suggestions.push("How can I reach 100% profile completion?");
    }
  }

  if (context.skillsData) {
    if (context.skillsData.verified < 5) {
      suggestions.push("How do I get my skills verified?");
    }
    suggestions.push("Why was this skill extracted from my CV?");
  }

  if (context.badgesData) {
    if (context.badgesData.earned_count === 0) {
      suggestions.push("How do I earn my first badge?");
    } else if (context.badgesData.locked.length > 0) {
      suggestions.push("What badges can I unlock next?");
    }
  }

  suggestions.push("What do recruiters look for in a profile?");
  suggestions.push("How can I stand out to employers?");

  return suggestions.slice(0, 6);
}

/* ==================== CHAT HISTORY (LEGACY) ==================== */
/**
 * Returns latest chat messages across ALL conversations of a candidate.
 * This matches your controller signature: getChatHistory(candidateId, limit)
 */
export async function getChatHistory(candidateId: string, limit = 50) {
  const take = Math.max(1, Math.min(limit, 200));

  // fetch latest messages for candidate across all conversations
  const msgs = await prisma.chatMessage.findMany({
    where: {
      conversation: {
        candidate_id: candidateId,
        is_archived: false,
      },
    },
    orderBy: { created_at: "desc" },
    take,
    select: {
      role: true,
      content: true,
      created_at: true,
      conversation_id: true,
    },
  });

  // normalize output (old controller expects timestamp?)
  return msgs
    .reverse()
    .map((m) => ({
      role: m.role as Role,
      content: m.content,
      timestamp: m.created_at,
      conversationId: m.conversation_id,
    }));
}

/**
 * Clears chat history for candidate.
 * Safer than deleting conversations: delete messages + reset last_message_at.
 */
export async function clearChatHistory(candidateId: string) {
  await prisma.$transaction(async (tx) => {
    // get all candidate conversations
    const convos = await tx.chatConversation.findMany({
      where: { candidate_id: candidateId, is_archived: false },
      select: { conversation_id: true },
    });

    const ids = convos.map((c) => c.conversation_id);
    if (ids.length === 0) return;

    // delete all messages inside those conversations
    await tx.chatMessage.deleteMany({
      where: { conversation_id: { in: ids } },
    });

    // reset last_message_at + title optionally
    await tx.chatConversation.updateMany({
      where: { conversation_id: { in: ids } },
      data: { last_message_at: new Date() },
    });
  });
}

