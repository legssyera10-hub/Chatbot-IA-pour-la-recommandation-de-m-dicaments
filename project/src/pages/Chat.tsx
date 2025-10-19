import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Wifi, WifiOff, Square, Plus } from 'lucide-react';
import { Header } from '@/components/Header';
import { ChatWindow } from '@/components/ChatWindow';
import { HistoryList } from '@/components/HistoryList';
import { useAuthStore } from '@/store/auth';
import { chatApi } from '@/api/chat';
import { apiClient } from '@/api/client';
import { ChatHistoryItem } from '@/types';

export function Chat() {
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState('');
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const navigate = useNavigate();
  const { logout } = useAuthStore();

  useEffect(() => {
    loadHistory();
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    try {
      const isOnline = await apiClient.healthCheck();
      setIsServerOnline(isOnline);
      if (!isOnline) setError('Serveur indisponible. Veuillez réessayer plus tard.');
    } catch {
      setIsServerOnline(false);
      setError('Impossible de contacter le serveur.');
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    setError('');
    try {
      const res = await chatApi.getHistory();
      const sorted = res.items
        .slice()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setHistory(sorted);
      if (sorted.length > 0 && !selectedChatId) setSelectedChatId(sorted[0].chat_id);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Erreur lors du chargement de l'historique";
      setError(message);
      if (err?.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSelectChat = (chatId: string) => setSelectedChatId(chatId);

  const handleNewMessage = async () => {
    try {
      await loadHistory();
    } catch (err) {
      console.warn('Refresh history failed:', err);
    }
  };

  /** Crée une nouvelle session et l’active */
  const handleNewChat = async () => {
    try {
      setIsActionLoading(true);
      setError('');
      // on peut fermer la session courante, ce n’est pas bloquant si backend le gère déjà
      await chatApi.closeChat(selectedChatId ?? undefined);
      const { chat_id } = await chatApi.newChat();

      const res = await chatApi.getHistory();
      const sorted = res.items
        .slice()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setHistory(sorted);
      setSelectedChatId(chat_id);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Impossible de créer une nouvelle session';
      setError(message);
    } finally {
      setIsActionLoading(false);
    }
  };

  /** Termine la session sélectionnée */
  const handleCloseChat = async () => {
    if (!selectedChatId) return;
    try {
      setIsActionLoading(true);
      setError('');
      await chatApi.closeChat(selectedChatId);
      const res = await chatApi.getHistory();
      const sorted = res.items
        .slice()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setHistory(sorted);
      setSelectedChatId(sorted[0]?.chat_id ?? null);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Impossible de terminer la session';
      setError(message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const selectedHistory =
    history.find((item) => item.chat_id === selectedChatId) || null;

  const retryConnection = () => {
    setError('');
    checkServerStatus();
    loadHistory();
  };

  if (!isServerOnline && error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header onLogout={handleLogout} />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center space-y-6 p-8">
            <div className="text-6xl mb-4">
              <WifiOff className="w-16 h-16 mx-auto text-gray-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Serveur indisponible
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Impossible de se connecter au serveur backend. Vérifiez que le serveur FastAPI fonctionne.
              </p>
            </div>
            <Button onClick={retryConnection} className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Réessayer</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onLogout={handleLogout} />

      <main className="container mx-auto p-4 h-[calc(100vh-80px)]">
        {error && isServerOnline && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={retryConnection}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* barre d'actions globale au-dessus du chat (toujours visible, même en mobile) */}
        <div className="flex items-center justify-end gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            disabled={isActionLoading}
            title="Créer une nouvelle session"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau chat
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCloseChat}
            disabled={!selectedChatId || isActionLoading}
            title="Terminer la session courante"
          >
            <Square className="w-4 h-4 mr-2" />
            Terminer la session
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
          {/* History Panel - masqué en mobile */}
          <div className="hidden md:block">
            <HistoryList
              history={history}
              selectedChatId={selectedChatId}
              onSelect={handleSelectChat}
              isLoading={isLoadingHistory}
              onNewChat={handleNewChat}  // bouton "Nouveau chat" dans l’entête de l’historique
            />
          </div>

          {/* Chat Window */}
          <div className="md:col-span-3">
            <ChatWindow history={selectedHistory} onNewMessage={handleNewMessage} />
          </div>
        </div>

        {/* Server Status Indicator */}
        <div className="fixed bottom-4 right-4">
          <div
            className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
              isServerOnline
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}
          >
            {isServerOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isServerOnline ? 'En ligne' : 'Hors ligne'}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
