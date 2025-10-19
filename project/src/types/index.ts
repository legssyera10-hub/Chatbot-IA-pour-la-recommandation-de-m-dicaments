export type TokenResponse = { 
  access_token: string; 
  token_type: "bearer" 
};

export type ChatMessage = { 
  role: "user" | "bot"; 
  text: string 
};

export type ChatHistoryItem = {
  chat_id: string;
  messages: ChatMessage[];
  timestamp: string; // ISO
};

export type ChatHistoryResponse = { 
  items: ChatHistoryItem[] 
};

export type AuthCredentials = {
  username: string;
  password: string;
};

export type User = {
  username: string;
  token: string;
};