import React, { useState, useEffect } from 'react';
import { ArrowLeft, LogOut, Calendar } from 'lucide-react';
import { Client } from './types';
import { ClientAppointmentsView } from './ClientAppointmentsView';
import { ClientAuthView } from './ClientAuthView';

const ClientDashboard = ({ client, onLogout }: { client: Client, onLogout: () => void }) => {
  // Por enquanto, o painel mostra apenas a visão de agendamentos.
  // Isso pode ser expandido com mais itens no futuro.
  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <aside className="w-64 bg-white border-r border-zinc-100 p-4 flex flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold tracking-tighter">tBeauty</h1>
          <p className="text-xs text-zinc-400">Portal do Cliente</p>
        </div>
        <nav className="flex-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-black text-white shadow-lg">
            <Calendar size={20} />
            <span className="font-medium">Meus Agendamentos</span>
          </button>
        </nav>
        <div className="mt-auto">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:bg-rose-50 hover:text-rose-600 transition-colors">
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-10 p-4 border-b border-zinc-100">
          <div>
            <h2 className="text-lg font-bold">Olá, {client.name.split(' ')[0]}!</h2>
            <p className="text-sm text-zinc-500">Gerencie seus agendamentos.</p>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          <ClientAppointmentsView client={client} />
        </main>
      </div>
    </div>
  );
};

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
          className="absolute top-6 left-6 z-10 p-3 rounded-2xl bg-white border border-zinc-100 text-zinc-500 hover:text-black hover:bg-zinc-50 transition-all shadow-sm"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <ClientAuthView onLogin={handleLogin} initialRegister={initialRegister} />
      </div>
    );
  }

  return <ClientDashboard client={client} onLogout={handleLogout} />;
};