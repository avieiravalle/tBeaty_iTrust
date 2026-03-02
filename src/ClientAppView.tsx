import React, { useState, useEffect } from 'react';
import { api } from './services/api.ts';
import { Client, Store } from './types.ts';
import { Building, Calendar, Wallet, LogOut } from 'lucide-react';

interface ClientAppViewProps {
  client: Client;
  onLogout: () => void;
}

const NearbySalonsView = () => {
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    api.getStores().then(setStores).catch(err => console.error("Failed to fetch stores", err));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Salões Próximos</h2>
      {stores.length === 0 ? (
        <p className="text-zinc-500">Nenhum salão encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map(store => (
            <div key={store.id} className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-lg transition-shadow">
              <h3 className="font-bold text-lg">{store.name}</h3>
              <p className="text-sm text-zinc-400 mb-4">Código: {store.code}</p>
              <button className="w-full bg-black text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors">
                Ver Serviços
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const ClientAppView = ({ client, onLogout }: ClientAppViewProps) => {
  const [activeView, setActiveView] = useState('salons');

  const renderContent = () => {
    switch (activeView) {
      case 'salons':
        return <NearbySalonsView />;
      case 'appointments':
        return <div className="text-center p-12 text-zinc-400">Meus Agendamentos (Em breve)</div>;
      case 'spending':
        return <div className="text-center p-12 text-zinc-400">Meus Gastos (Em breve)</div>;
      default:
        return <NearbySalonsView />;
    }
  };

  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: React.ElementType, label: string }) => (
    <button 
      onClick={() => setActiveView(id)}
      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg w-24 transition-colors ${activeView === id ? 'text-black font-bold' : 'text-zinc-500'}`}
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

      <main className="p-4 md:p-8">
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