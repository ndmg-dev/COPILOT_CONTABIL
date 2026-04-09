import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // In a real app, this would call your Supabase auth API
      // For now, we'll simulate a successful login
      setTimeout(() => {
        // Simple validation for demo
        if (email && password) {
          // Navigate to the app dashboard
          if (onLogin) onLogin();
          setLoading(false);
        } else {
          setError('Por favor, preencha todos os campos');
          setLoading(false);
        }
      }, 1000);
    } catch (err) {
      setError('Erro ao fazer login. Verifique suas credenciais.');
      setLoading(false);
    }
  };

  // Handle navigation after login (simplified for MVP)
  // In a real app, you would use useNavigate hook from react-router-dom

  return (
    <div className="min-h-screen flex items-center justify-center bg-obsidian-dark">
      <div className="bg-obsidian-panel rounded-lg p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="h-12 w-12 bg-accent-purple/20 rounded flex items-center justify-center mx-auto">
            <span className="text-accent-purple font-bold text-xl">CC</span>
          </div>
          <h2 className="text-2xl font-bold">Copilot Contábil IA</h2>
          <p className="text-accent-green/50">Acesse sua conta contábil inteligente</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@escritorio.com"
              className="w-full px-4 py-2 rounded-lg bg-obsidian-panel border border-border-subtle text-obsidian-text focus:outline-none focus:ring-2 focus:ring-accent-purple"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-lg bg-obsidian-panel border border-border-subtle text-obsidian-text focus:outline-none focus:ring-2 focus:ring-accent-purple"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-accent-purple text-white font-medium hover:bg-accent-purple/80 transition-colors disabled:bg-accent-purple/50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="text-center text-xs text-accent-green/50">
          Não tem acesso? Entre em contato com o administrador do escritório.
        </div>
      </div>
    </div>
  );
};

export default Login;