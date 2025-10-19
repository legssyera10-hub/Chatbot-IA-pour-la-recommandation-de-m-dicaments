# MedBot Assistant - Application Frontend

Une application frontend moderne de chatbot médical (non-diagnostique) construite avec React, TypeScript, et Tailwind CSS. Cette application consomme une API FastAPI backend pour fournir des réponses médicales informatives.

## 🚀 Fonctionnalités

- **Authentification sécurisée** avec JWT (signup/login)
- **Interface de chat en temps réel** avec historique des sessions
- **Design responsive** avec layout 2 colonnes sur desktop
- **Support Markdown** pour les réponses du bot
- **Gestion d'état global** avec Zustand + persistance localStorage
- **Client HTTP centralisé** avec intercepteurs automatiques
- **Disclaimer médical** proéminent pour rappeler les limites
- **Gestion complète des erreurs** et états de chargement
- **Thème sombre/clair** supporté

## 🛠️ Technologies

- **Frontend**: React 18 + Vite + TypeScript
- **UI**: Tailwind CSS + shadcn/ui + lucide-react
- **État**: Zustand avec persistance
- **HTTP**: Axios avec intercepteurs
- **Routing**: React Router v6
- **Date**: date-fns avec locale française
- **Markdown**: react-markdown

## 📋 Prérequis

1. **Backend FastAPI** opérationnel sur le port configuré
2. **MongoDB** actif et connecté au backend
3. **Node.js** 18+ installé

## 🚀 Installation et démarrage

1. **Cloner et installer les dépendances**:
```bash
npm install
```

2. **Configurer l'environnement**:
```bash
cp .env.example .env
# Modifier VITE_API_BASE_URL si nécessaire (par défaut: http://127.0.0.1:8000)
```

3. **Démarrer l'application**:
```bash
npm run dev
```

4. **Accéder à l'application**:
   - Ouvrir http://localhost:5173
   - Créer un compte ou se connecter
   - Commencer à chatter avec l'assistant

## 📡 API Backend attendue

L'application s'attend à ce que votre backend FastAPI expose ces endpoints :

- `POST /auth/signup` - Création de compte (JSON)
- `POST /auth/login` - Connexion (form-urlencoded)  
- `POST /chat/message` - Envoyer un message (JSON + auth)
- `GET /chat/history` - Récupérer l'historique (auth)
- `GET /health` - Health check (optionnel)

## 🏗️ Architecture

```
src/
├── api/              # Clients HTTP et endpoints
│   ├── client.ts     # Instance Axios configurée
│   ├── auth.ts       # Endpoints authentification
│   └── chat.ts       # Endpoints chat
├── components/       # Composants réutilisables
│   ├── AuthForm.tsx  # Formulaire login/signup
│   ├── AuthGuard.tsx # Protection des routes
│   ├── ChatWindow.tsx# Fenêtre de chat principale
│   ├── Header.tsx    # En-tête avec user info
│   ├── HistoryList.tsx # Panneau historique
│   └── MessageBubble.tsx # Bulles de messages
├── pages/           # Pages/routes principales
│   ├── Login.tsx
│   ├── Signup.tsx
│   └── Chat.tsx
├── store/           # État global Zustand
│   └── auth.ts      # Store authentification
├── types/           # Types TypeScript
│   └── index.ts
└── App.tsx         # Routage principal
```

## 🔒 Sécurité

- **JWT automatique**: Le token est envoyé avec chaque requête authentifiée
- **Protection des routes**: `/chat` nécessite une authentification
- **Gestion 401**: Déconnexion automatique si le token expire
- **Persistance sécurisée**: Token stocké en localStorage avec Zustand

## 🎨 UI/UX

- **Design médical**: Palette bleu/blanc avec icônes stéthoscope
- **Responsif**: Layout adaptatif mobile/desktop
- **Accessibilité**: Focus visible, labels appropriés, aria-live
- **Micro-interactions**: Animations fluides, hover states
- **Disclaimer visible**: Avertissement médical proéminent

## 🧪 Tests manuels suggérés

1. **Authentification**:
   - Créer un compte → redirection automatique vers /chat
   - Se déconnecter → redirection vers /login
   - Accès direct à /chat sans auth → redirection vers /login

2. **Chat**:
   - Envoyer "j'ai de la fièvre" → voir la réponse du bot
   - Tester "douleur thoracique" → vérifier message d'urgence
   - Vérifier le scroll automatique et typing indicator

3. **Historique**:
   - Sessions sauvegardées après conversation
   - Navigation entre sessions
   - Ordre chronologique correct

4. **Erreurs**:
   - Backend arrêté → bannière d'erreur
   - Timeout réseau → gestion gracieuse
   - Token expiré → déconnexion automatique

## 📝 Scripts disponibles

- `npm run dev` - Serveur de développement
- `npm run build` - Build de production
- `npm run preview` - Prévisualisation du build
- `npm run lint` - Vérification ESLint

## 🔧 Configuration

Toute la configuration se fait via le fichier `.env`:

```env
# URL de base de l'API backend
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 📞 Support

En cas de problème :

1. Vérifier que le backend FastAPI fonctionne
2. Vérifier la configuration `.env`
3. Consulter la console navigateur pour les erreurs
4. Tester l'API directement via curl/Postman

---

**Note importante**: Cette application ne fournit que des informations médicales générales. Elle ne remplace en aucun cas un avis médical professionnel.