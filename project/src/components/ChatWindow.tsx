import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, AlertTriangle } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { chatApi } from '@/api/chat';
import { ChatHistoryItem, ChatMessage } from '@/types';

interface ChatWindowProps {
  history: ChatHistoryItem | null;
  onNewMessage: (userMessage: string, botReply: string) => void;
}

export function ChatWindow({ history, onNewMessage }: ChatWindowProps) {
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update messages when history changes
  useEffect(() => {
    if (history) {
      setCurrentMessages(history.messages);
    } else {
      setCurrentMessages([]);
    }
  }, [history]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages, isSending]);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending) return;

    setError('');
    setIsSending(true);

    // Add user message immediately
    const userMessage: ChatMessage = { role: 'user', text: trimmedMessage };
    setCurrentMessages(prev => [...prev, userMessage]);
    setMessage('');

    try {
      const response = await chatApi.sendMessage(trimmedMessage);
      const botMessage: ChatMessage = { role: 'bot', text: response.reply };
      
      // Add bot message
      setCurrentMessages(prev => [...prev, botMessage]);
      
      // Notify parent for history update
      onNewMessage(trimmedMessage, response.reply);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          'Erreur lors de l\'envoi du message. Veuillez réessayer.';
      setError(errorMessage);
      
      // Remove the user message if sending failed
      setCurrentMessages(prev => prev.slice(0, -1));
      setMessage(trimmedMessage); // Restore the message
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const displayMessages = currentMessages;

  return (
    <div className="flex flex-col h-full">
      
      {/* Messages Area */}
      <Card className="flex-1 p-4 mb-4">
        <ScrollArea className="h-full pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {displayMessages.length === 0 && !isSending && (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                <div className="space-y-4">
                  <div className="text-4xl">🩺</div>
                  <div>
                    <h3 className="text-lg font-medium">Bienvenue sur MedBot Assistant</h3>
                    <p className="mt-2 text-sm">
                      Posez-moi vos questions médicales générales. Je suis là pour vous aider avec des informations de santé.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {displayMessages.map((msg, index) => (
              <MessageBubble 
                key={`${history?.chat_id || 'current'}-${index}`} 
                message={msg}
              />
            ))}
            
            {isSending && (
              <div className="flex justify-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <Badge variant="outline" className="animate-pulse">
                    L'assistant réfléchit...
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Input Area */}
      <div className="flex space-x-2">
        <Textarea
          ref={textareaRef}
          placeholder="Tapez votre question médicale... (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          className="flex-1 resize-none min-h-[60px] max-h-32"
          rows={2}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className="h-[60px] px-4"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}