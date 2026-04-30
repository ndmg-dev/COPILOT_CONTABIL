import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './utils/supabase';
import Layout from './components/Layout';
import ChatContainer from './components/ChatContainer';
import Dashboard from './components/Dashboard';
import TeamManagement from './components/TeamManagement';
import KnowledgeAdmin from './components/KnowledgeAdmin';
import LoginPage from './components/LoginPage';
import Workspace from './components/Workspace';
import WhatsAppIntegration from './components/WhatsAppIntegration';
// import ObsidianIntegration from './components/ObsidianIntegration';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { UIProvider } from './context/UIContext';
import TermsOfUse from './pages/TermsOfUse';
import PrivacyPolicy from './pages/PrivacyPolicy';

const ALLOWED_DOMAIN = 'mendoncagalvao.com.br';

function AppContent() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session on mount (handles OAuth redirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        validateAndSetSession(session);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          validateAndSetSession(session);
        } else {
          setSession(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const validateAndSetSession = (session) => {
    const email = session.user?.email || '';
    if (email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      setSession(session);
    } else {
      // Domínio não autorizado — forçar logout
      supabase.auth.signOut();
      setSession(null);
    }
  };

  const handleLogin = (newSession) => {
    validateAndSetSession(newSession);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // Show loading spinner while checking session
  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="logo-icon text-3xl">CC</div>
          <div className="text-text-muted text-sm animate-pulse">Autenticando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian-deep text-text-primary uppercase-none font-sans">
      <WorkspaceProvider>
        <UIProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/termos" element={<TermsOfUse />} />
            <Route path="/privacidade" element={<PrivacyPolicy />} />

            {/* Auth Gating */}
            {!session ? (
              <Route path="*" element={<LoginPage onLogin={handleLogin} />} />
            ) : (
              <>
                <Route path="/app" element={<Layout onLogout={handleLogout} session={session} />}>
                  <Route index element={<Navigate to="/app/chat" replace />} />
                  <Route path="chat" element={<ChatContainer />} />
                  <Route path="workspace" element={<Workspace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="team" element={<TeamManagement />} />
                  <Route path="knowledge" element={<KnowledgeAdmin />} />
                  <Route path="whatsapp" element={<WhatsAppIntegration />} />
                  {/* <Route path="obsidian" element={<ObsidianIntegration />} /> */}
                </Route>
                <Route path="*" element={<Navigate to="/app/chat" replace />} />
              </>
            )}
          </Routes>
        </UIProvider>
      </WorkspaceProvider>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;