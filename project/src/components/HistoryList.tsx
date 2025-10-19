import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { History, MessageCircle, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChatHistoryItem } from '@/types';

interface HistoryListProps {
  history: ChatHistoryItem[];
  selectedChatId: string | null;
  onSelect: (chatId: string) => void;
  isLoading: boolean;
}

export function HistoryList({ history, selectedChatId, onSelect, isLoading }: HistoryListProps) {
  const getLastBotMessage = (item: ChatHistoryItem) => {
    const botMessages = item.messages.filter(msg => msg.role === 'bot');
    return botMessages[botMessages.length - 1]?.text || 'Nouvelle conversation';
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>Historique</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>Historique</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {history.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4 space-y-2">
            {history.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">
                  Aucune conversation pour le moment
                </p>
                <p className="text-xs mt-1">
                  Commencez à chatter pour voir l'historique
                </p>
              </div>
            ) : (
              history.map((item, index) => {
                const isSelected = item.chat_id === selectedChatId;
                const lastBotMessage = getLastBotMessage(item);
                const relativeTime = formatDistanceToNow(
                  new Date(item.timestamp),
                  { addSuffix: true, locale: fr }
                );

                return (
                  <div key={item.chat_id}>
                    <Button
                      variant={isSelected ? "default" : "ghost"}
                      className={`w-full p-3 h-auto text-left justify-start ${
                        isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => onSelect(item.chat_id)}
                    >
                      <div className="w-full space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <MessageCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="font-medium text-sm">
                              Session #{item.chat_id.slice(-8)}
                            </span>
                          </div>
                          <Badge 
                            variant={isSelected ? "secondary" : "outline"} 
                            className={`text-xs ${
                              isSelected ? 'bg-blue-400 text-white' : ''
                            }`}
                          >
                            {item.messages.length}
                          </Badge>
                        </div>
                        
                        <p className={`text-xs text-left leading-relaxed ${
                          isSelected ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {truncateText(lastBotMessage)}
                        </p>
                        
                        <div className="flex items-center space-x-1 text-xs opacity-75">
                          <Calendar className="w-3 h-3" />
                          <span>{relativeTime}</span>
                        </div>
                      </div>
                    </Button>
                    {index < history.length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}