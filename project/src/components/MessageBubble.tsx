import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Bot } from 'lucide-react';
import { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
  timestamp?: string;
}

export function MessageBubble({ message, timestamp }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div className={`p-2 rounded-full ${
            isUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}>
            {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
        </div>

        {/* Message content */}
        <Card className={`p-3 ${
          isUser 
            ? 'bg-blue-500 text-white border-blue-500' 
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant={isUser ? 'secondary' : 'outline'} className={`text-xs ${
                isUser ? 'bg-blue-400 text-white' : ''
              }`}>
                {isUser ? 'Vous' : 'Assistant'}
              </Badge>
              {timestamp && (
                <span className={`text-xs ${
                  isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {new Date(timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
            
            <div className={`prose prose-sm max-w-none ${
              isUser 
                ? 'prose-invert text-white' 
                : 'prose-gray dark:prose-invert'
            }`}>
              {isUser ? (
                <p className="m-0 whitespace-pre-wrap">{message.text}</p>
              ) : (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="m-0 leading-relaxed">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}