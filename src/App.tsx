import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Users, 
  Settings, 
  LayoutDashboard, 
  Scissors, 
  Package, 
  LogOut, 
  DollarSign,
  Menu,
  X
} from 'lucide-react';
import { api } from './services/api.ts';
import { Role, User, Client } from './types.ts';

// --- Components ---
import { SidebarItem } from './UI.tsx';
import { NotificationCenter } from './NotificationCenter.tsx';
import { LandingView } from './LandingView.tsx';
import { AuthView } from './AuthView.tsx';
import { DashboardView } from './DashboardView.tsx';
import { AppointmentsView } from './AppointmentsView.tsx';
import { ServicesView } from './ServicesView.tsx';
import { InventoryView } from './InventoryView.tsx';
import { CommissionsView } from './CommissionsView.tsx';
import { ClientRegisterView } from './ClientRegisterView.tsx';
import { ClientLoginView } from './ClientLoginView.tsx';
import { ClientAppView } from './ClientAppView.tsx';

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [salonName, setSalonName] = useState('tBeauty');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState<'landing' | 'auth' | 'app' | 'client-register' | 'client-login' | 'client-app'>('landing');

  useEffect(() => {
    if (user) {
      setView('app');
      api.getSettings(user.store_id).then(settings => {
        if (settings.salon_name) setSalonName(settings.salon_name);
      });
    } else {
      // When user logs out, go to auth, not landing
      if (view === 'app') setView('landing');
    }
  }, [user]);

  useEffect(() => {
    if (client) {
      setView('client-app');
    }
    else {
      if (view === 'client-app') setView('landing');
    }
  }, [client]);

  // Close sidebar on mobile when tab changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [activeTab]);

  if (view === 'landing') {
    return <LandingView 
      onSelectSalon={() => setView('auth')}
      onSelectClient={() => setView('client-register')}
    />;
  }

  if (view === 'client-register') {
    return <ClientRegisterView 
      onBack={() => setView('landing')}
      onRegisterSuccess={() => setView('client-login')}
    />;
  }

  if (view === 'client-login') {
    return <ClientLoginView
      onBack={() => setView('landing')}
      onLoginSuccess={(loggedInClient) => setClient(loggedInClient)}
    />;
  }

  if (view === 'auth' && !user) {
    return <AuthView onLogin={setUser} />;
  }

  if (view === 'client-app' && client) {
    return <ClientAppView client={client} onLogout={() => setClient(null)} />;
  }

  // Type guard to ensure user is not null for the main app view
  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView storeId={user.store_id} />;
      case 'appointments': return <AppointmentsView role={user.role} userId={user.id} storeId={user.store_id} />;
      case 'services': return <ServicesView storeId={user.store_id} />;
      case 'staff': return <div className="p-12 text-center text-zinc-400">Gestão de Equipe (Em breve)</div>;
      case 'inventory': return <InventoryView storeId={user.store_id} />;
      case 'commissions': return <CommissionsView userId={user.id} />;
      case 'settings': return <div className="p-12 text-center text-zinc-400">Configurações do Sistema (Em breve)</div>;
      default: return <DashboardView storeId={user.store_id} />;
    }
  };

  const roleLabels: Record<Role, string> = {
    ADMIN: 'Administrador',
    MANAGER: 'Gerente',
    COLLABORATOR: 'Colaborador'
  };

  const tabLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    appointments: 'Agendamentos',
    services: 'Serviços',
    staff: 'Equipe',
    inventory: 'Estoque',
    commissions: 'Minhas Comissões',
    settings: 'Configurações'
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col lg:flex-row text-zinc-900 font-sans overflow-x-hidden">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-zinc-100 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
            <Scissors size={18} />
          </div>
          <h1 className="font-bold text-lg tracking-tight truncate max-w-[150px]">{salonName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationCenter user={user} />
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-zinc-500 hover:text-black transition-colors"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-100 p-6 flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="hidden lg:flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
            <Scissors size={24} />
          </div>
          <h1 className="font-bold text-xl tracking-tight">{salonName}</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {(user.role === 'MANAGER' || user.role === 'ADMIN') && (
            <SidebarItem 
              icon={LayoutDashboard} 
              label="Dashboard" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
              id="nav-dashboard"
            />
          )}
          <SidebarItem 
            icon={Calendar} 
            label="Agendamentos" 
            active={activeTab === 'appointments'} 
            onClick={() => setActiveTab('appointments')} 
            id="nav-appointments"
          />
          {user.role === 'COLLABORATOR' && (
            <SidebarItem 
              icon={DollarSign} 
              label="Minhas Comissões" 
              active={activeTab === 'commissions'} 
              onClick={() => setActiveTab('commissions')} 
              id="nav-commissions"
            />
          )}
          {(user.role === 'MANAGER' || user.role === 'ADMIN') && (
            <>
              <SidebarItem 
                icon={Scissors} 
                label="Serviços" 
                active={activeTab === 'services'} 
                onClick={() => setActiveTab('services')} 
                id="nav-services"
              />
              <SidebarItem 
                icon={Users} 
                label="Equipe" 
                active={activeTab === 'staff'} 
                onClick={() => setActiveTab('staff')} 
                id="nav-staff"
              />
              <SidebarItem 
                icon={Package} 
                label="Estoque" 
                active={activeTab === 'inventory'} 
                onClick={() => setActiveTab('inventory')} 
                id="nav-inventory"
              />
            </>
          )}
          {user.role === 'ADMIN' && (
            <SidebarItem 
              icon={Settings} 
              label="Configurações" 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
              id="nav-settings"
            />
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-100">
          {user.role === 'MANAGER' && (
            <div className="mb-6 px-4 py-3 bg-zinc-50 rounded-xl border border-zinc-100">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Código da Loja</p>
              <p className="text-sm font-mono font-bold text-black">{user.store_code}</p>
            </div>
          )}
          <button 
            onClick={() => setUser(null)}
            className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" 
            id="logout-btn"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-10 overflow-y-auto">
        <header className="hidden lg:flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {tabLabels[activeTab]}
            </h2>
            <p className="text-zinc-500">Bem-vindo(a), {user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationCenter user={user} />
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold">{user.name}</p>
              <p className="text-xs text-zinc-400">{roleLabels[user.role as Role]}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-zinc-200 border-2 border-white shadow-sm overflow-hidden">
              <img src={`https://picsum.photos/seed/${user.email}/100/100`} alt="Avatar" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        {/* Mobile Page Title */}
        <div className="lg:hidden mb-6">
          <h2 className="text-2xl font-bold tracking-tight">{tabLabels[activeTab]}</h2>
          <p className="text-sm text-zinc-500">Olá, {user.name}</p>
        </div>

        <motion.div
          key={activeTab + user.role}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </main>
    </div>
  );
}
