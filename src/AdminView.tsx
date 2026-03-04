import React, { useState, useEffect } from 'react';
import { ArrowLeft, LogOut, LayoutDashboard, Calendar, Scissors, Package, DollarSign, Users, Settings, Heart, Radar, HelpCircle, Home, Menu } from 'lucide-react';
import { AuthView } from './AuthView';
import { User } from './types';
import { SidebarItem } from './UI';
import { ThemeLoader } from './ThemeLoader';
import { DashboardView } from './DashboardView';
import { AppointmentsView } from './AppointmentsView';
import { ServicesView } from './ServicesView';
import { InventoryView } from './InventoryView';
import { StaffView } from './StaffView';
import { SettingsView } from './SettingsView';
import { CommissionsView } from './CommissionsView';
import { ClientsView } from './ClientsView';
import { HelpView } from './HelpView';
import { OpportunitiesView } from './OpportunitiesView.tsx';
import { NotificationCenter } from './NotificationCenter';
import { CollaboratorDashboardView } from './CollaboratorDashboardView.tsx';
import { SuperAdminView } from './SuperAdminView.tsx';

const AdminDashboard = ({ user, onLogout }: { user: User, onLogout: () => void }) => {
  const [activeView, setActiveView] = useState('dashboard');
  const [opportunityType, setOpportunityType] = useState<'inactive' | 'birthday' | null>(null); // This is now only used by the sidebar link
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const managerViews = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'appointments', label: 'Agendamentos', icon: Calendar },
    { id: 'services', label: 'Serviços', icon: Scissors },
    { id: 'inventory', label: 'Estoque', icon: Package },
    { id: 'staff', label: 'Profissionais', icon: Users },
    { id: 'clients', label: 'Clientes', icon: Heart },
    { id: 'opportunities', label: 'Oportunidades', icon: Radar },
    { id: 'settings', label: 'Configurações', icon: Settings },
    { id: 'help', label: 'Ajuda / Manual', icon: HelpCircle }
  ];

  const collaboratorViews = [
    { id: 'collaborator-dashboard', label: 'Início', icon: Home },
    { id: 'appointments', label: 'Meus Agendamentos', icon: Calendar },
    { id: 'commissions', label: 'Minhas Comissões', icon: DollarSign },
  ];

  const views = user.role === 'COLLABORATOR' ? collaboratorViews : managerViews;

  useEffect(() => {
    setActiveView(user.role === 'COLLABORATOR' ? 'collaborator-dashboard' : 'dashboard');
  }, [user.role]);

  if (user.role === 'ADMIN') {
    return <SuperAdminView user={user} onLogout={onLogout} />;
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'collaborator-dashboard':
        return <CollaboratorDashboardView user={user} onViewAppointments={() => setActiveView('appointments')} />;
      case 'dashboard':
        return <DashboardView storeId={user.store_id} />;
      case 'appointments':
        return <AppointmentsView role={user.role} userId={user.id} storeId={user.store_id} />;
      case 'services':
        return <ServicesView storeId={user.store_id} />;
      case 'inventory':
        return <InventoryView storeId={user.store_id} />;
      case 'staff':
        return <StaffView user={user} />;
      case 'settings':
        return <SettingsView storeId={user.store_id} storeCode={user.store_code} />;
      case 'clients':
        return <ClientsView storeId={user.store_id} />;
      case 'commissions':
        return <CommissionsView userId={user.id} />;
      case 'help':
        return <HelpView />;
      case 'opportunities':
        // When navigating from sidebar, reset opportunityType so the view itself controls its state
        // or defaults to 'inactive'.
        return <OpportunitiesView storeId={user.store_id} initialTab={opportunityType || 'inactive'} />;
      default:
        return <DashboardView storeId={user.store_id} />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-zinc-100 p-4 flex flex-col transition-transform duration-200 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="mb-8">
          <h1 className="text-xl font-bold tracking-tighter">tBeauty</h1>
          <p className="text-xs text-zinc-400">Painel do {user.role === 'MANAGER' ? 'Gestor' : 'Colaborador'}</p>
        </div>
        <nav className="flex-1 space-y-2">
          {views.map(view => (
            <SidebarItem 
              key={view.id} 
              id={view.id} 
              label={view.label} 
              icon={view.icon} 
              active={activeView === view.id} 
              onClick={() => { 
                if (view.id === 'opportunities') setOpportunityType(null); 
                setActiveView(view.id);
                setIsSidebarOpen(false); // Close sidebar on mobile after click
              }} 
              className={activeView === view.id ? 'bg-black text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-black'}
            />
          ))}
        </nav>
        <div className="mt-auto">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:bg-rose-50 hover:text-rose-600 transition-colors">
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-10 p-4 border-b border-zinc-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 rounded-lg hover:bg-zinc-100 lg:hidden text-zinc-500"
            >
              <Menu size={24} />
            </button>
            <div><h2 className="text-lg font-bold">Olá, {user.name.split(' ')[0]}!</h2><p className="text-sm text-zinc-500">Bem-vindo(a) de volta.</p></div>
          </div>
          <div className="flex items-center gap-4"><NotificationCenter user={user} /></div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">{renderActiveView()}</main>
      </div>
    </div>
  );
};

export const AdminView = ({ onBack, initialRegister = false }: { onBack: () => void, initialRegister?: boolean }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!initialRegister) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const loggedInUser = JSON.parse(storedUser);
          if (loggedInUser && loggedInUser.id && loggedInUser.role) {
            setUser(loggedInUser);
          } else {
            localStorage.removeItem('user');
          }
        } catch (e) {
          console.error("Failed to parse user from localStorage", e);
          localStorage.removeItem('user');
        }
      }
    }
  }, [initialRegister]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (!user) {
    return (
      <div className="relative">
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 z-10 p-3 rounded-2xl bg-white border border-zinc-100 text-zinc-500 hover:text-black hover:bg-zinc-50 transition-all shadow-sm"
          aria-label="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <AuthView onLogin={handleLogin} initialRegister={initialRegister} />
      </div>
    );
  }

  return (
    <ThemeLoader storeId={user.store_id}>
      <AdminDashboard user={user} onLogout={handleLogout} />
    </ThemeLoader>
  );
};