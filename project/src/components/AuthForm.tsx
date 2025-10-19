// project/src/components/AuthForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Stethoscope, AlertCircle } from 'lucide-react';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth';

interface AuthFormProps {
  mode: 'login' | 'signup';
  /** Afficher ou non le petit lien sous le bouton (ex: "Créer un compte") */
  showAltLink?: boolean; // <- NEW (par défaut true)
}

export function AuthForm({ mode, showAltLink = true }: AuthFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);

    try {
      const credentials = { username: username.trim(), password };
      const response =
        mode === 'login' ? await authApi.login(credentials) : await authApi.signup(credentials);

      login(response.access_token, username.trim());
      navigate('/chat');
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Une erreur est survenue. Vérifiez vos identifiants.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isSignup = mode === 'signup';
  const title = isSignup ? 'Créer un compte' : 'Se connecter';
  const description = isSignup
    ? 'Créez votre compte pour accéder au chatbot médical'
    : 'Connectez-vous à votre compte';
  const buttonText = isSignup ? 'Créer le compte' : 'Se connecter';
  const linkText = isSignup ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? Créer un compte';
  const linkTo = isSignup ? '/login' : '/signup';

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
            <Stethoscope className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription className="mt-2">{description}</CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur</Label>
            <Input
              id="username"
              type="text"
              placeholder="Entrez votre nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="Entrez votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full bg-gray-900 text-white hover:bg-gray-900/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isSignup ? 'Création...' : 'Connexion...'}
              </>
            ) : (
              buttonText
            )}
          </Button>

          {showAltLink && (
            <Button
              type="button"
              variant="link"
              onClick={() => navigate(linkTo)}
              className="w-full bg-gray-900 text-white hover:bg-gray-900/90"
            >
              {linkText}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
