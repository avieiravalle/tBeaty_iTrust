import React, { useState, useEffect } from 'react';
import { api } from './services/api.ts';
import { Client, Store } from './types.ts';
import { Building, Calendar, Wallet, LogOut, Star } from 'lucide-react';
import { ClientAppointmentsView } from './ClientAppointmentsView.tsx';

interface ClientAppViewProps {
  client: Client;
  onLogout: () => void;
}

const NearbySalonsView = ({ client, onViewServices }: { client: Client, onViewServices: (storeId: number) => void }) => {
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    // Pass client.id to get favorite status
    if (client) {
      api.getStores(client.id).then(setStores).catch(err => console.error("Failed to fetch stores", err));
    }
  }, [client]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Salões Próximos</h2>
      {stores.length === 0 ? (
        <p className="text-zinc-500">Nenhum salão encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map(store => (
            <div key={store.id} className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-lg transition-shadow flex flex-col">
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg">{store.name}</h3>
                  {store.is_favorite === 1 && <Star size={18} className="text-rose-400 fill-current" />}
                </div>
              </div>
              <button onClick={() => onViewServices(store.id)} className="w-full mt-2 bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-rose-600 transition-colors">
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
  const [activeView, setActiveView] = useState('appointments');
  const [preselectedStoreId, setPreselectedStoreId] = useState<number | null>(null);

  const handleViewServices = (storeId: number) => {
    setPreselectedStoreId(storeId);
    setActiveView('appointments');
  };

  const renderContent = () => {
    switch (activeView) {
      case 'salons':
        return <NearbySalonsView client={client} onViewServices={handleViewServices} />;
      case 'appointments':
        return <ClientAppointmentsView 
                  client={client} 
                  preselectedStoreId={preselectedStoreId} 
                  onModalOpened={() => setPreselectedStoreId(null)} />;
      case 'spending':
        return <div className="text-center p-12 text-zinc-400">Meus Gastos (Em breve)</div>;
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