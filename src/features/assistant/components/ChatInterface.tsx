import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import type { ChatMessage } from "../api/chat.api";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  typingMessage?: string;
  isTyping?: boolean;
}

export default function ChatInterface({
  messages,
  isLoading,
  onSendMessage,
  typingMessage = "",
  isTyping = false,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const suggestions = [
    "How am I doing this month?",
    "When is my next bill?",
    "What's my biggest expense?",
    "Am I on track with my savings?",
  ];

  return (
    <div className="flex flex-col h-full bg-card/90 backdrop-blur-sm rounded-none md:rounded-2xl shadow-none md:shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">ClariFi Assistant</h2>
        <p className="text-sm text-muted-foreground">
          Your personal financial advisor
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !isTyping ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">👋</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Hi there! How can I help with your finances today?
            </h3>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(suggestion)}
                  className="px-4 py-2 text-sm bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                  disabled={isLoading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}

        {/* Typing animation */}
        {isTyping && typingMessage && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-muted text-foreground">
              <p className="text-sm whitespace-pre-wrap">
                {typingMessage}
                <span className="inline-block w-1 h-4 ml-1 bg-foreground animate-pulse"></span>
              </p>
            </div>
          </div>
        )}

        {isLoading && !isTyping && (
          <div className="flex justify-start">
            <div className="bg-muted px-4 py-3 rounded-2xl">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-6 py-4 border-t border-border bg-card"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your finances..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-input bg-background text-foreground rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
