"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { useChatbot } from "@/lib/chatbot-context";
import { getBotResponse } from "@/lib/chatbot-responses";
import type { InstituteTheme } from "@/lib/theme";

interface ChatbotWidgetProps {
  theme: InstituteTheme;
}

export default function ChatbotWidget({ theme }: ChatbotWidgetProps) {
  const { messages, addMessage, isOpen, setIsOpen } = useChatbot();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping) return;

    // Add user message
    addMessage("user", text);
    setInput("");

    // Simulate bot typing delay (500-800ms)
    setIsTyping(true);
    const delay = 500 + Math.random() * 300;
    setTimeout(() => {
      const response = getBotResponse(text);
      addMessage("bot", response);
      setIsTyping(false);
    }, delay);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ── Floating chat bubble ── */}
      {!isOpen && (
        <button
          id="chatbot-bubble"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl"
          style={{ backgroundColor: theme.colors.primary }}
          aria-label="Open Lumina Assistant"
        >
          <MessageCircle className="h-6 w-6 text-white" />
          {/* Pulse animation */}
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: theme.colors.primary }}
          />
        </button>
      )}

      {/* ── Chat panel ── */}
      {isOpen && (
        <div
          id="chatbot-panel"
          className="fixed bottom-6 right-6 z-50 flex flex-col w-90 h-125 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden"
          style={{
            animation: "chatbot-slide-up 0.3s ease-out",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Lumina Assistant</h3>
                <p className="text-[10px] text-white/70">Always here to help</p>
              </div>
            </div>
            <button
              id="chatbot-close"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center h-8 w-8 rounded-full text-white/80 hover:bg-white/20 transition-colors"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex items-center justify-center h-7 w-7 rounded-full shrink-0 ${
                    msg.role === "user" ? "bg-gray-200" : ""
                  }`}
                  style={
                    msg.role === "bot"
                      ? { backgroundColor: `${theme.colors.primary}1A` }
                      : undefined
                  }
                >
                  {msg.role === "bot" ? (
                    <Bot
                      className="h-3.5 w-3.5"
                      style={{ color: theme.colors.primary }}
                    />
                  ) : (
                    <User className="h-3.5 w-3.5 text-gray-500" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "text-white rounded-br-sm"
                      : "bg-white text-gray-700 rounded-bl-sm shadow-sm border border-gray-100"
                  }`}
                  style={
                    msg.role === "user"
                      ? { backgroundColor: theme.colors.primary }
                      : undefined
                  }
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-end gap-2">
                <div
                  className="flex items-center justify-center h-7 w-7 rounded-full shrink-0"
                  style={{ backgroundColor: `${theme.colors.primary}1A` }}
                >
                  <Bot
                    className="h-3.5 w-3.5"
                    style={{ color: theme.colors.primary }}
                  />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                id="chatbot-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-shadow placeholder:text-gray-400 focus:border-transparent focus:ring-2"
                style={{
                  // @ts-expect-error CSS variable for focus ring
                  "--tw-ring-color": `${theme.colors.primary}40`,
                }}
                disabled={isTyping}
              />
              <button
                id="chatbot-send"
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="flex items-center justify-center h-10 w-10 rounded-full text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95"
                style={{ backgroundColor: theme.colors.primary }}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyframe animation */}
      <style jsx global>{`
        @keyframes chatbot-slide-up {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
