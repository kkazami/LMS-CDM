"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  timestamp: Date;
}

export function getChatbotGreeting(userName?: string | null, userRole?: string | null): string {
  const role = (userRole || "").toUpperCase();
  const isInstructor = role === "PROFESSOR" || role === "TEACHER" || role === "ADMIN";
  const rawName = (userName || "").trim();

  if (isInstructor) {
    if (!rawName) {
      return "👋 Hi Professor! Need help drafting an announcement, checking at-risk students, or something else?";
    }
    const cleaned = rawName.replace(/^(Professor|Prof\.)\s+/i, "").trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    const lastName = parts.length > 0 ? parts[parts.length - 1] : rawName;
    return `👋 Hi Professor ${lastName}! Need help drafting an announcement, checking at-risk students, or something else?`;
  }

  // Student (or default)
  if (!rawName) {
    return "👋 Hi! I'm the CdM Assistant. Ask me about your grades, deadlines, or courses — how can I help?";
  }
  const firstName = rawName.split(/\s+/)[0];
  return `👋 Hi ${firstName}! I'm the CdM Assistant. Ask me about your grades, deadlines, or courses — how can I help?`;
}

interface ChatbotContextValue {
  /** All chat messages in the current session */
  messages: ChatMessage[];
  /** Add a message to the chat */
  addMessage: (role: "user" | "bot", text: string) => void;
  /** Whether the chat widget is open */
  isOpen: boolean;
  /** Toggle chat open/close */
  setIsOpen: (open: boolean) => void;
}

const ChatbotContext = createContext<ChatbotContextValue | null>(null);

let messageCounter = 0;

export function ChatbotProvider({
  children,
  userName,
  userRole,
}: {
  children: ReactNode;
  userName?: string | null;
  userRole?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "bot",
      text: getChatbotGreeting(userName, userRole),
      timestamp: new Date(),
    },
  ]);
  const [isOpen, setIsOpen] = useState(false);

  // Update welcome greeting when session details load or change
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === "welcome") {
        return [
          {
            id: "welcome",
            role: "bot",
            text: getChatbotGreeting(userName, userRole),
            timestamp: prev[0].timestamp,
          },
        ];
      }
      return prev;
    });
  }, [userName, userRole]);

  const addMessage = useCallback((role: "user" | "bot", text: string) => {
    messageCounter++;
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${messageCounter}-${Date.now()}`,
        role,
        text,
        timestamp: new Date(),
      },
    ]);
  }, []);

  return (
    <ChatbotContext.Provider value={{ messages, addMessage, isOpen, setIsOpen }}>
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot(): ChatbotContextValue {
  const ctx = useContext(ChatbotContext);
  if (!ctx) throw new Error("useChatbot must be used within <ChatbotProvider>");
  return ctx;
}
