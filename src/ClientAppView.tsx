import React, { useState, useEffect } from 'react';
import { api } from './services/api.ts';
import { Client, Store } from './types.ts';
import { Building, Calendar, Wallet, LogOut, Star } from 'lucide-react';
import { ClientAppointmentsView } from './ClientAppointmentsView.tsx';
import { ClientSpendingView } from './ClientSpendingView.tsx';
import { SalonsView } from './SalonsView.tsx';

interface ClientAppViewProps {
  client: Client;
  onLogout: () => void;
}

export const ClientAppView = ({ client, onLogout }: ClientAppViewProps) => {
  const [activeView, setActiveView] = useState('appointments');
  const [preselectedStoreId, setPreselectedStoreId] = useState<number | null>(null);

  const handleViewServices = (storeId: number) => {
    setPreselectedStoreId(storeId);
    setActiveView('appointments');
  };

  const renderContent = () => {
    switch (activeView) {
      case 'salons':
        return <SalonsView client={client} onViewServices={handleViewServices} />;
      case 'appointments':
        return <ClientAppointmentsView 
                  client={client} 
                  preselectedStoreId={preselectedStoreId} 
                  onModalOpened={() => setPreselectedStoreId(null)} />;
      case 'spending':
        return <ClientSpendingView client={client} />;
      default:
        return <ClientAppointmentsView client={client} />;
    }
  };

  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: React.ElementType, label: string }) => (
    <button 
      onClick={() => setActiveView(id)}
      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg w-24 transition-colors ${activeView === id ? 'text-rose-500 font-bold' : 'text-zinc-500'}`}
    >
      <Icon size={24} strokeWidth={activeView === id ? 2.5 : 2} />
      <span className="text-xs">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-10 p-4 border-b border-zinc-100 flex justify-between items-center">
        <div>
          <p className="text-xs text-zinc-500">Bem-vindo(a)!</p>
          <h1 className="font-bold text-lg">{client.name}</h1>
        </div>
        <button onClick={onLogout} className="p-3 rounded-2xl bg-zinc-100 text-zinc-500 hover:text-rose-500 hover:bg-rose-50 transition-all">
          <LogOut size={20} />
        </button>
      </header>

      <main className="p-4 md:p-8 pb-24">
        {renderContent()}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-zinc-100 p-2 z-10">
        <nav className="flex justify-around">
          <NavItem id="salons" icon={Building} label="Salões" />
          <NavItem id="appointments" icon={Calendar} label="Agenda" />
          <NavItem id="spending" icon={Wallet} label="Gastos" />
        </nav>
      </footer>
    </div>
  );
};