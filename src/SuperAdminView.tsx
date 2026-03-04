import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from './services/api.ts';
import { Store, User, AdminDashboardStats } from './types.ts';
import { Card, SidebarItem } from './UI.tsx';
import { LogOut, ShieldCheck, Store as StoreIcon, Clock, DollarSign, CheckCircle, XCircle, Loader, Settings, Save, Menu } from 'lucide-react';

interface SuperAdminViewProps {
  user: User;
  onLogout: () => void;
}

const StatCard = ({ label, value, icon: Icon }: { label: string, value: string | number, icon: React.ElementType }) => (
  <Card>
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${label.includes('Receita') ? 'bg-emerald-100 text-emerald-600' : label.includes('Ativas') ? 'bg-sky-100 text-sky-600' : 'bg-amber-100 text-amber-600'}`}><Icon size={24} /></div>
      <div>
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <h3 className={`text-3xl font-bold ${label.includes('Receita') ? 'text-emerald-800' : label.includes('Ativas') ? 'text-sky-800' : 'text-amber-800'}`}>{value}</h3>
      </div>
    </div>
  </Card>
);

const StoreList = ({ stores, onUpdateStatus }: { stores: Store[], onUpdateStatus: (storeId: number, status: Store['status']) => void }) => {
  if (stores.length === 0) {
    return <div className="text-center p-12 text-zinc-400">Nenhuma loja nesta categoria.</div>;
  }

  const planLabels: Record<string, string> = {
    'BASIC': 'Básico',
    'INTERMEDIATE': 'Intermediário',
    'ADVANCED': 'Avançado',
  };

  const statusConfig = {
    PENDING_PAYMENT: {
      actionLabel: 'Aprovar Pagamento',
      actionIcon: CheckCircle,
      actionClass: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
      nextStatus: 'ACTIVE',
    },
    ACTIVE: {
      actionLabel: 'Desativar',
      actionIcon: XCircle,
      actionClass: 'bg-rose-100 text-rose-700 hover:bg-rose-200',
      nextStatus: 'INACTIVE',
    },
    INACTIVE: {
      actionLabel: 'Reativar',
      actionIcon: CheckCircle,
      actionClass: 'bg-sky-100 text-sky-700 hover:bg-sky-200',
      nextStatus: 'ACTIVE',
    },
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-zinc-500 uppercase bg-zinc-50">
          <tr>
            <th scope="col" className="px-6 py-3">Loja</th>
            <th scope="col" className="px-6 py-3">Gestor</th>
            <th scope="col" className="px-6 py-3">Plano</th>
            <th scope="col" className="px-6 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {stores.map(store => {
            const config = store.status ? statusConfig[store.status as keyof typeof statusConfig] : null;
            return (
              <tr key={store.id} className="bg-white border-b last:border-0">
                <th scope="row" className="px-6 py-4 font-bold text-zinc-900">{store.name}</th>
                <td className="px-6 py-4 text-zinc-600">{store.manager_email || 'N/A'}</td>
                <td className="px-6 py-4 text-zinc-600 font-semibold">{store.plan ? planLabels[store.plan] : 'N/A'}</td>
                <td className="px-6 py-4 text-right">
                  {config && (
                    <button 
                      onClick={() => onUpdateStatus(store.id, config.nextStatus)}
                      className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-2 ml-auto ${config.actionClass}`}
                    >
                      <config.actionIcon size={14} />
                      {config.actionLabel}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const AdminSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminSystemSettings();
      setSettings(data);
    } catch (error) {
      alert('Falha ao carregar configurações.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateAdminSystemSettings(settings);
      alert('Configurações salvas!');
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-bold mb-4">Configurações do Sistema</h3>
      <div className="space-y-4 max-w-md">
        <div><label htmlFor="admin_pix_key" className="block text-sm font-medium text-zinc-700 mb-1">Chave Pix Principal (para Planos)</label><input id="admin_pix_key" type="text" value={settings.admin_pix_key || ''} onChange={(e) => setSettings(prev => ({ ...prev, admin_pix_key: e.target.value }))} className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" /></div>
        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl disabled:bg-zinc-400">{isSaving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />} {isSaving ? 'Salvando...' : 'Salvar Configurações'}</button>
      </div>
    </Card>
  );
};

export const SuperAdminView = ({ user, onLogout }: SuperAdminViewProps) => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'settings'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, storesData] = await Promise.all([
        api.getAdminDashboardStats(),
        api.getAdminStores(),
      ]);
      setStats(statsData);
      setStores(storesData);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      alert('Falha ao carregar dados do administrador.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = useCallback(async (storeId: number, status: Store['status']) => {
    const action = status === 'ACTIVE' ? 'ativar' : 'desativar';
    if (window.confirm(`Tem certeza que deseja ${action} esta loja?`)) {
      try {
        await api.updateStoreStatus(storeId, status);
        await fetchData(); // Recarrega os dados
      } catch (error: any) {
        alert(`Falha ao atualizar status: ${error.message}`);
      }
    }
  }, [fetchData]);

  const { pendingStores, activeStores, inactiveStores } = useMemo(() => ({
    pendingStores: stores.filter(s => s.status === 'PENDING_PAYMENT'),
    activeStores: stores.filter(s => s.status === 'ACTIVE'),
    inactiveStores: stores.filter(s => s.status === 'INACTIVE'),
  }), [stores]);

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  const tabConfig = {
    pending: { label: 'Pendentes', count: pendingStores.length, component: <StoreList stores={pendingStores} onUpdateStatus={handleUpdateStatus} /> },
    active: { label: 'Ativas', count: activeStores.length, component: <StoreList stores={activeStores} onUpdateStatus={handleUpdateStatus} /> },
    inactive: { label: 'Inativas', count: inactiveStores.length, component: <StoreList stores={inactiveStores} onUpdateStatus={handleUpdateStatus} /> },
  };

  const [activeStoreTab, setActiveStoreTab] = useState<'pending' | 'active' | 'inactive'>('pending');

  useEffect(() => {
    setActiveStoreTab(pendingStores.length > 0 ? 'pending' : 'active');
  }, [pendingStores.length]);

  return (
    <div className="min-h-screen bg-zinc-100 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-black p-4 flex flex-col text-white transition-transform duration-200 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="mb-10">
          <h1 className="text-xl font-bold tracking-tighter">tBeauty</h1>
          <p className="text-xs text-zinc-400">Painel do Administrador</p>
        </div>
        <nav className="flex-1 space-y-2">
          <SidebarItem id="dashboard" label="Dashboard" icon={ShieldCheck} active={activeView === 'dashboard'} onClick={() => { setActiveView('dashboard'); setIsSidebarOpen(false); }} className={activeView === 'dashboard' ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/5 hover:text-white'} />
          <SidebarItem id="settings" label="Configurações" icon={Settings} active={activeView === 'settings'} onClick={() => { setActiveView('settings'); setIsSidebarOpen(false); }} className={activeView === 'settings' ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/5 hover:text-white'} />
        </nav>
        <div className="mt-auto">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-300 hover:bg-white/10 hover:text-white transition-colors">
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto min-w-0">
        <div className="lg:hidden mb-6">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 -ml-2 rounded-lg hover:bg-zinc-200 text-zinc-800"
          >
            <Menu size={24} />
          </button>
        </div>

        {activeView === 'dashboard' && (
          <>
            <h2 className="text-2xl font-bold mb-2">Dashboard do Administrador</h2>
            <p className="text-zinc-500 mb-8">Visão geral da plataforma e gerenciamento de lojas.</p>

            {isLoading ? <Loader className="animate-spin" /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard label="Receita Mensal (MRR)" value={formatCurrency(stats?.mrr || 0)} icon={DollarSign} />
                <StatCard label="Lojas Ativas" value={stats?.activeStores || 0} icon={StoreIcon} />
                <StatCard label="Pagamentos Pendentes" value={stats?.pendingStores || 0} icon={Clock} />
              </div>
            )}

            <h3 className="text-xl font-bold mb-4">Gerenciamento de Lojas</h3>
            <Card className="p-0">
              <div className="flex border-b border-zinc-200">
                {Object.entries(tabConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setActiveStoreTab(key as 'pending' | 'active' | 'inactive')}
                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${activeStoreTab === key ? 'border-b-2 border-primary-dark text-primary-dark' : 'text-zinc-500 hover:text-zinc-800'}`}
                  >
                    {config.label}
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeStoreTab === key ? 'bg-primary-dark text-white' : 'bg-zinc-200 text-zinc-600'}`}>{config.count}</span>
                  </button>
                ))}
              </div>
              {tabConfig[activeStoreTab].component}
            </Card>
          </>
        )}
        {activeView === 'settings' && (
          <>
            <h2 className="text-2xl font-bold mb-8">Configurações do Sistema</h2>
            <AdminSettings />
          </>
        )}
      </main>
    </div>
  );
};