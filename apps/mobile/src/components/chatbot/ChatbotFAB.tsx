import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { getBotResponse } from '../../lib/chatbot-responses';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  createdAt: string;
}

const INITIAL_MESSAGE: Message = {
  id: 'init-msg-1',
  role: 'bot',
  text: "Hi! I'm the CdM Assistant. Ask me about grades, assignments, announcements, courses, or anything else you need help with!",
  createdAt: new Date().toISOString(),
};

export function ChatbotFAB() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Realistic bot response delay (450ms - 750ms)
    const delay = 450 + Math.random() * 300;
    setTimeout(() => {
      const botReply = getBotResponse(text);
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        text: botReply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, delay);
  };

  // Bottom tab bar height clearance:
  // Tab bar in _layout is 64 (Android) or 60 + insets.bottom (iOS)
  const tabHeight = Platform.OS === 'ios' ? 60 + insets.bottom : 64;
  const fabBottom = tabHeight + 16;

  return (
    <>
      {/* ── Circular Floating Action Button ── */}
      {!isOpen && (
        <TouchableOpacity
          style={[
            styles.fabButton,
            {
              backgroundColor: theme.colors.primary,
              bottom: fabBottom,
            },
          ]}
          onPress={() => setIsOpen(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open CdM Assistant Chatbot"
        >
          <MessageCircle size={26} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* ── Floating Chat Panel Modal ── */}
      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          {/* Backdrop Tap to close */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          />

          {/* Floating Chat Container */}
          <View
            style={[
              styles.chatContainer,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                bottom: tabHeight + 8,
              },
            ]}
          >
            {/* Header */}
            <View
              style={[
                styles.chatHeader,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <View style={styles.headerLeft}>
                <View style={styles.botAvatarBadge}>
                  <Bot size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>CdM Assistant</Text>
                  <Text style={styles.headerSubtitle}>Always here to help</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close CdM Assistant"
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Messages ScrollView */}
            <ScrollView
              ref={scrollViewRef}
              style={[styles.messagesArea, { backgroundColor: theme.colors.background }]}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageRow,
                      isUser ? styles.userRow : styles.botRow,
                    ]}
                  >
                    {!isUser && (
                      <View
                        style={[
                          styles.botAvatarCircle,
                          { backgroundColor: `${theme.colors.primary}18` },
                        ]}
                      >
                        <Bot size={15} color={theme.colors.primary} />
                      </View>
                    )}

                    <View
                      style={[
                        styles.messageBubble,
                        isUser
                          ? [styles.userBubble, { backgroundColor: theme.colors.primary }]
                          : [
                              styles.botBubble,
                              {
                                backgroundColor: theme.colors.card,
                                borderColor: theme.colors.border,
                              },
                            ],
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          {
                            color: isUser ? '#FFFFFF' : theme.colors.text,
                          },
                        ]}
                        selectable
                      >
                        {msg.text}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Typing Indicator */}
              {isTyping && (
                <View style={[styles.messageRow, styles.botRow]}>
                  <View
                    style={[
                      styles.botAvatarCircle,
                      { backgroundColor: `${theme.colors.primary}18` },
                    ]}
                  >
                    <Bot size={15} color={theme.colors.primary} />
                  </View>
                  <View
                    style={[
                      styles.messageBubble,
                      styles.botBubble,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typingText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      CdM Assistant is typing...
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input Bar */}
            <View
              style={[
                styles.inputBar,
                {
                  backgroundColor: theme.colors.card,
                  borderTopColor: theme.colors.border,
                },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[
                  styles.textInput,
                  {
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Ask me anything..."
                placeholderTextColor={theme.colors.textSecondary}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor: input.trim().length > 0 ? theme.colors.primary : `${theme.colors.primary}60`,
                  },
                ]}
                onPress={handleSend}
                disabled={input.trim().length === 0 || isTyping}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <Send size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabButton: {
    position: 'absolute',
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  chatContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: '72%',
    maxHeight: 560,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botAvatarBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesArea: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  botAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  typingText: {
    fontSize: 12.5,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 13.5,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
