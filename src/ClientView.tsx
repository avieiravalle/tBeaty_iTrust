import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Client } from './types';
import { ClientAuthView } from './ClientAuthView';
import { ClientAppView } from './ClientAppView';

export const ClientView = ({ onBack, initialRegister = false }: { onBack: () => void, initialRegister?: boolean }) => {
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    if (!initialRegister) {
      const storedClient = localStorage.getItem('client');
      if (storedClient) {
        try {
          const loggedInClient = JSON.parse(storedClient);
          if (loggedInClient && loggedInClient.id) {
            setClient(loggedInClient);
          } else {
            localStorage.removeItem('client');
          }
        } catch (e) {
          console.error("Failed to parse client from localStorage", e);
          localStorage.removeItem('client');
        }
      }
    }
  }, [initialRegister]);

  const handleLogin = (loggedInClient: Client) => {
    setClient(loggedInClient);
    localStorage.setItem('client', JSON.stringify(loggedInClient));
  };

  const handleLogout = () => {
    setClient(null);
    localStorage.removeItem('client');
  };

  if (!client) {
    return (
      <div className="relative">
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 z-10 p-3 rounded-2xl bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-all shadow-sm"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <ClientAuthView onLogin={handleLogin} initialRegister={initialRegister} onBack={onBack} />
      </div>
    );
  }

  return <ClientAppView client={client} onLogout={handleLogout} />;
};