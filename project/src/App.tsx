import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from '@/components/AuthGuard';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { Chat } from '@/pages/Chat';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route 
          path="/chat" 
          element={
            <AuthGuard>
              <Chat />
            </AuthGuard>
          } 
        />
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </Router>
  );
}

export default App;