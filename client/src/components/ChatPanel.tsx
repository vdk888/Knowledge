import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Concept, ChatMessage } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatPanelProps {
  concept: Concept | null;
}

const ChatPanel = ({ concept }: ChatPanelProps) => {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<ChatMessage[]>({
    queryKey: concept ? [`/api/chat/${concept.id}/history`] : [],
    enabled: !!concept,
  });
  
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!concept) throw new Error("No concept selected");
      const res = await apiRequest("POST", `/api/chat/${concept.id}`, { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/${concept?.id}/history`] });
      setMessage("");
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message);
    }
  };
  
  // Quick prompt buttons
  const quickPrompts = [
    { text: "Explain simply", prompt: "Can you explain this concept in simpler terms?" },
    { text: "Give examples", prompt: "Could you provide some real-world examples of this concept?" },
    { text: "Quiz me", prompt: "Can you quiz me on this concept to test my understanding?" },
  ];
  
  const handleQuickPrompt = (prompt: string) => {
    setMessage(prompt);
  };
  
  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  // Generate initial message if no messages exist
  useEffect(() => {
    if (concept && messages.length === 0 && !isLoadingMessages && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(`I'm exploring content on ${concept.name}. Can you give me a brief introduction?`);
    }
  }, [concept, messages, isLoadingMessages, sendMessageMutation.isPending]);
  
  return (
    <div className="h-full bg-white flex flex-col"> {/* Removed w-96, added h-full */}
      <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
        <h2 className="font-heading font-semibold text-neutral-900">Learning Assistant</h2>
        <div className="flex space-x-2">
          <button className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
            </svg>
          </button>
          <button className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingMessages ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-bubble assistant-bubble">
            <p className="text-sm text-neutral-800">
              {concept 
                ? `I'm exploring content on ${concept.name}. What would you like to know about this topic?` 
                : "Select a concept from the knowledge map to start a conversation."}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`chat-bubble ${msg.isUser ? "user-bubble" : "assistant-bubble"}`}
            >
              <p className="text-sm text-neutral-800">
                {msg.message.split('\n').map((paragraph, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {paragraph}
                  </span>
                ))}
              </p>
            </div>
          ))
        )}
        
        {sendMessageMutation.isPending && (
          <div className="chat-bubble assistant-bubble">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t border-neutral-200">
        <div className="flex space-x-2 mb-2">
          {quickPrompts.map((prompt) => (
            <button 
              key={prompt.text}
              className="px-3 py-1 text-xs bg-neutral-100 text-neutral-700 rounded hover:bg-neutral-200"
              onClick={() => handleQuickPrompt(prompt.prompt)}
              disabled={!concept || sendMessageMutation.isPending}
            >
              {prompt.text}
            </button>
          ))}
        </div>
        
        <form onSubmit={handleSendMessage} className="flex">
          <input 
            type="text" 
            placeholder={concept ? "Ask about this concept..." : "Select a concept first..."}
            className="flex-1 border border-neutral-300 rounded-l-md px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={!concept || sendMessageMutation.isPending}
          />
          <button 
            type="submit"
            className="bg-primary-500 hover:bg-primary-600 text-white rounded-r-md px-4 flex items-center justify-center transition-colors disabled:bg-neutral-300"
            disabled={!concept || !message.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
