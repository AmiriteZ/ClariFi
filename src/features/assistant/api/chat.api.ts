const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  message: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function sendChatMessage(
  message: string,
  conversationHistory: ChatMessage[],
  token: string
): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      conversationHistory,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to send message");
  return data;
}
