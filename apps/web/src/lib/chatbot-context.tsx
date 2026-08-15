"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  timestamp: Date;
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

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      text: "👋 Hi! I'm the Lumina Assistant. Ask me about grades, assignments, announcements, courses, or anything else you need help with!",
      timestamp: new Date(),
    },
  ]);
  const [isOpen, setIsOpen] = useState(false);

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
