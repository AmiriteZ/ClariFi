import { useState } from "react";
import { useAuthStore } from "../../../store/auth.store";
import { auth } from "../../../lib/firebase";
import Avatar3D from "../components/Avatar3D";
import ChatInterface from "../components/ChatInterface";
import { sendChatMessage, type ChatMessage } from "../api/chat.api";

export default function AssistantPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [typingMessage, setTypingMessage] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (message: string) => {
    if (!user) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get fresh Firebase token
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Send to API
      const response = await sendChatMessage(message, messages, token);

      // Start typing animation
      setIsTyping(true);
      setIsTalking(true);
      const fullMessage = response.message;
      let currentIndex = 0;

      const typingInterval = setInterval(() => {
        if (currentIndex < fullMessage.length) {
          setTypingMessage(fullMessage.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTyping(false);
          setIsTalking(false);

          // Add complete assistant message
          const assistantMessage: ChatMessage = {
            role: "assistant",
            content: fullMessage,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setTypingMessage("");
        }
      }, 20); // 20ms per character for smooth typing
    } catch (error) {
      console.error("Error sending message:", error);
      setIsTyping(false);
      setIsTalking(false);

      // Show error message
      const errorMessage: ChatMessage = {
        role: "assistant",
        content:
          error instanceof Error
            ? `Sorry, I encountered an error: ${error.message}`
            : "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Please Sign In
          </h2>
          <p className="text-slate-600">
            You need to be signed in to use the AI assistant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex items-center justify-center p-6 bg-gradient-to-br from-emerald-50 to-blue-50">
      {/* Single merged container */}
      <div className="w-full max-w-4xl h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* 3D Avatar Section - Top */}
        <div className="h-[400px] border-b border-slate-200 flex-shrink-0">
          <Avatar3D isTalking={isTalking} modelPath="/models/scene.gltf" />
        </div>

        {/* Chat Section - Bottom */}
        <div className="flex-1 min-h-0">
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            typingMessage={typingMessage}
            isTyping={isTyping}
          />
        </div>
      </div>
    </div>
  );
}
