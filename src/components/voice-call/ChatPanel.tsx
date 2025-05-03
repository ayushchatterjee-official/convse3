
import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceCall } from '@/contexts/VoiceCallContext';

export const ChatPanel: React.FC = () => {
  const { user } = useAuth();
  const { messages, sendChatMessage } = useVoiceCall();
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    sendChatMessage(message);
    setMessage('');
  };
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="flex flex-col h-full border-l border-gray-200 dark:border-gray-700">
      <div className="border-b border-gray-200 dark:border-gray-700 p-3">
        <h3 className="font-semibold">Chat</h3>
      </div>
      
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex max-w-[80%]">
                {msg.senderId !== user?.id && (
                  <Avatar className="h-8 w-8 mr-2">
                    <AvatarFallback>
                      {msg.senderName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    {msg.senderId !== user?.id && (
                      <span className="text-sm text-gray-500">
                        {msg.senderName}
                      </span>
                    )}
                  </div>
                  <div
                    className={`rounded-lg p-2 ${
                      msg.senderId === user?.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <div className="text-xs mt-1 text-right opacity-70">
                      {formatTimestamp(msg.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!message.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
