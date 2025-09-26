"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "model",
      content: "👋 Hi! I’m your AI assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: newMessages }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages([...newMessages, { role: "model", content: data.reply }]);
      } else {
        setMessages([
          ...newMessages,
          {
            role: "model",
            content: "⚠ Error: " + (data.error || "Something went wrong."),
          },
        ]);
      }
    } catch (error) {
      setMessages([
        ...newMessages,
        { role: "model", content: "⚠ Network error. Try again later." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-full max-w-sm bg-white shadow-2xl rounded-2xl border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-3 flex justify-between items-center">
            <span className="font-semibold">AI Chatbot</span>
            <button onClick={() => setIsOpen(false)} aria-label="Close chat">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-96">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg max-w-[85%] whitespace-pre-wrap text-sm ${
                  msg.role === "user"
                    ? "bg-blue-100 text-blue-900 ml-auto"
                    : "bg-gray-100 text-gray-900 prose prose-sm max-w-full" // ✨ FIX: Added `prose` for markdown styling
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            ))}
            {loading && (
              <div className="p-2 rounded-lg bg-gray-100 text-gray-500 w-fit text-sm">
                Typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="border-t p-2 flex gap-2 items-start">
            {/* ✨ FIX: Switched to textarea for multiline support */}
            <textarea
              rows="1"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={loading} // ✨ FIX: Disable when loading
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300"
              disabled={loading} // ✨ FIX: Disable when loading
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}