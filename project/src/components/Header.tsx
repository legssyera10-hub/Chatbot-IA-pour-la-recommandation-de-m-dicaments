import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Stethoscope } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

interface HeaderProps {
  onLogout: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  const username = useAuthStore((state) => state.username);

  return (
    <header className="border-b bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Stethoscope className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              MedBot Assistant
            </h1>
          </div>
          <Badge variant="outline" className="hidden sm:flex">
            Version 1.0
          </Badge>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <User className="w-4 h-4" />
            <span className="hidden sm:block">{username}</span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">Déconnexion</span>
          </Button>
        </div>
      </div>
    </header>
  );
}