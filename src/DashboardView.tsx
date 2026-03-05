import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api.ts';
import { DashboardStats, Service, StaffFinancialStats, Client } from './types.ts';
import { Card, StatCard } from './UI.tsx';
import { DollarSign, TrendingUp, PieChart, Filter, Radar, Users as UsersIcon, Gift, Package as PackageIcon, X, Lightbulb, Loader, MessageSquare, CheckCircle2, Edit, FileText } from 'lucide-react';
// import { OpportunityListModal } from './OpportunityListModal.tsx'; // This component is no longer needed here
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface DashboardViewProps {
  storeId: number;
}

type Period = 'daily' | 'weekly' | 'monthly';

type ClientWithStats = Client & {
  appointment_count?: number;
  last_appointment?: string;
  birth_date?: string | null;
};

export const DashboardView = ({ storeId }: DashboardViewProps) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [staffStats, setStaffStats] = useState<StaffFinancialStats[]>([]);
  const [period, setPeriod] = useState<Period>('monthly');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isOpportunitiesModalOpen, setIsOpportunitiesModalOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [mainStatsData, staffStatsData] = await Promise.all([
        api.getDashboardStats(period, selectedCategory),
        api.getStaffDashboardStats(period)
      ]);
      setStats(mainStatsData);
      setStaffStats(staffStatsData);
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    }
  }, [period, selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const services: Service[] = await api.getServices();
      const uniqueCategories = [...new Set(services.map(s => s.category).filter(Boolean) as string[])];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  const periodLabels: Record<Period, string> = {
    daily: 'Hoje',
    weekly: 'Esta Semana',
    monthly: 'Este Mês',
  };

  const goalProgress = useMemo(() => {
    if (!stats || !stats.monthlyGoal || stats.monthlyGoal === 0) return 0;
    return (stats.revenue / stats.monthlyGoal) * 100;
  }, [stats]);

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Comissões', value: stats.totalCommissions, color: '#fecdd3' }, // rose-200
      { name: 'Custos Extras', value: stats.extraCosts, color: '#e11d48' }, // rose-600
      // Note: 'Custo de Estoque' here represents the total value of current inventory, not a periodic expense.
      // It's included for visualization as requested but is a different type of metric.
      { name: 'Reposição de Estoque', value: stats.stockCost, color: '#fb7185' }, // rose-400
    ].filter(item => item.value > 0);
  }, [stats]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800">Saúde Financeira</h2>
          <p className="text-sm text-zinc-500">Análise do período: {periodLabels[period]}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsOpportunitiesModalOpen(true)}
            className="flex items-center gap-2 bg-zinc-100 text-zinc-900 px-4 py-2 rounded-xl hover:bg-zinc-200 transition-colors border border-zinc-200"
          >
            <Radar size={16} />
            <span className="text-xs font-bold">Radar de Oportunidades</span>
          </button>
          <div className="flex bg-zinc-100 p-1 rounded-xl">
            {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${period === p ? 'bg-white shadow-sm text-black' : 'text-zinc-500'}`}>
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <div className="relative">
            <select onChange={(e) => setSelectedCategory(e.target.value)} value={selectedCategory} className="appearance-none bg-zinc-100 p-2.5 text-xs font-bold rounded-xl text-zinc-500 focus:ring-2 focus:ring-black outline-none pr-8">
              <option value="all">Todas Categorias</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <Filter size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatCard label="Faturamento Bruto" value={stats ? formatCurrency(stats.revenue) : '...'} icon={DollarSign} colorClass="bg-emerald-100 text-emerald-600" />
        <StatCard label="Lucro Líquido" value={stats ? formatCurrency(stats.netProfit) : '...'} icon={TrendingUp} colorClass="bg-sky-100 text-sky-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="font-bold mb-1 flex items-center gap-2"><PieChart size={16} className="text-rose-600" /> Composição das Saídas</h3>
          <p className="text-xs text-zinc-400 mb-4">Visão geral dos seus custos no período.</p>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <RechartsPieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} labelLine={false}>
                  {pieData.map((entry) => <Cell key={`cell-${entry.name}`} fill={entry.color} stroke={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)', border: '1px solid #f1f5f9', borderRadius: '12px' }} />
                <Legend iconType="circle" />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="lg:col-span-3">
          <h3 className="font-bold mb-1">Meta Mensal de Faturamento</h3>
          <p className="text-xs text-zinc-400 mb-6">Acompanhe o progresso em direção ao seu objetivo.</p>
          <div className="space-y-4 pt-8">
            <div className="flex justify-between items-end">
              <span className="text-3xl font-bold text-emerald-600">{stats ? formatCurrency(stats.revenue) : '...'}</span>
              <span className="text-sm text-zinc-500">Meta: {stats ? formatCurrency(stats.monthlyGoal) : '...'}</span>
            </div>
            <div className="w-full bg-zinc-200 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-4 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(goalProgress, 100)}%` }}
              ></div>
            </div>
            <p className="text-center text-sm font-medium">{goalProgress.toFixed(1)}% da meta atingida.</p>
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="p-6 border-b border-zinc-100">
          <h3 className="font-bold flex items-center gap-2"><UsersIcon size={16} className="text-black" /> Desempenho dos Profissionais</h3>
          <p className="text-xs text-zinc-400">Faturamento e comissões por profissional no período.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50">
              <tr>
                <th scope="col" className="px-6 py-3">Profissional</th>
                <th scope="col" className="px-6 py-3 text-right">Faturamento Gerado</th>
                <th scope="col" className="px-6 py-3 text-right">Comissão Estimada</th>
              </tr>
            </thead>
            <tbody>
              {staffStats.length === 0 ? (
                <tr><td colSpan={3} className="text-center p-8 text-zinc-400">Nenhum dado de profissional para o período.</td></tr>
              ) : (
                staffStats.map(staff => (
                  <tr key={staff.id} className="bg-white border-b last:border-0">
                    <th scope="row" className="px-6 py-4 font-bold text-zinc-900">{staff.name}</th>
                    <td className="px-6 py-4 text-zinc-600 text-right font-semibold">{formatCurrency(staff.totalRevenue || 0)}</td>
                    <td className="px-6 py-4 text-zinc-600 text-right">{formatCurrency(staff.totalCommission || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {isOpportunitiesModalOpen && (
          <OpportunitiesModal onClose={() => setIsOpportunitiesModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const OpportunitiesModal = ({ onClose }: { onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<'inactive' | 'birthday' | 'combo'>('inactive');
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const fetchClients = useCallback(async () => {
    if (activeTab === 'combo') {
      setClients([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = activeTab === 'inactive'
        ? await api.getInactiveClients()
        : await api.getBirthdayClients();
      setClients(data);
    } catch (error) {
      console.error(`Failed to fetch ${activeTab} clients:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const tabConfig = {
    inactive: { title: 'Clientes Inativos', icon: UsersIcon, description: 'Clientes que não agendam há mais de 90 dias.' },
    birthday: { title: 'Aniversariantes', icon: Gift, description: 'Clientes que fazem aniversário este mês.' },
    combo: { title: 'Dicas de Combos', icon: PackageIcon, description: 'Ideias para aumentar seu ticket médio.' },
  };

  const handleOpenMessageModal = (client: ClientWithStats) => {
    setSelectedClient(client);
    if (activeTab === 'inactive') {
        setMessage(`Olá ${client.name.split(' ')[0]}, sentimos sua falta aqui no salão! Para celebrar seu retorno, estamos oferecendo um desconto especial no seu próximo agendamento. Que tal?`);
    } else {
        setMessage(`Feliz aniversário, ${client.name.split(' ')[0]}! 🎉 Para comemorar seu dia, temos um presente especial para você em nosso salão. Válido durante todo o seu mês!`);
    }
    setIsMessageModalOpen(true);
    setSendSuccess(false);
  };

  const handleCloseMessageModal = () => {
      setIsMessageModalOpen(false);
      setTimeout(() => {
        setSelectedClient(null);
        setMessage('');
        setIsSending(false);
      }, 300);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedClient || !message) return;
      setIsSending(true);
      try {
          await api.sendWhatsappMessage({ to: selectedClient.phone, message });
          setSendSuccess(true);
          setTimeout(handleCloseMessageModal, 2000);
      } catch (error: any) {
          alert(`Falha ao enviar mensagem: ${error.message}`);
      } finally {
          setIsSending(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="p-6 border-b border-zinc-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Radar size={20} /></div>
            <div>
              <h3 className="text-xl font-bold">Radar de Oportunidades</h3>
              <p className="text-zinc-500 text-sm">Insights e ações para impulsionar seu negócio.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={24} /></button>
        </div>
        <div className="flex border-b border-zinc-200 px-4">
          {Object.entries(tabConfig).map(([key, config]) => (
            <button key={key} onClick={() => setActiveTab(key as any)} className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${activeTab === key ? 'border-b-2 border-black text-black' : 'text-zinc-500 hover:text-zinc-800'}`}>
              <config.icon size={16} /> {config.title}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'combo' ? (
            <div className="p-8">
              <div className="flex items-start gap-4 bg-zinc-50 p-6 rounded-xl border border-zinc-200">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><Lightbulb size={24} /></div>
                <div>
                  <h4 className="text-lg font-bold">Ideia: Promoção de Combos</h4>
                  <div className="prose prose-sm text-zinc-600 mt-2">
                    <p>Crie pacotes de serviços que se complementam. Por exemplo: "Pé + Mão com 10% de desconto" ou "Corte + Hidratação com preço especial".</p>
                    <p>Divulgue esses combos nas redes sociais e envie para sua lista de clientes no WhatsApp para incentivar agendamentos de maior valor.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3">Nome</th>
                  <th scope="col" className="px-6 py-3">Telefone</th>
                  {activeTab === 'inactive' && <th scope="col" className="px-6 py-3">Último Agendamento</th>}
                  {activeTab === 'birthday' && <th scope="col" className="px-6 py-3">Aniversário</th>}
                  <th scope="col" className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center p-8 text-zinc-400"><Loader className="animate-spin inline-block mr-2" /> Carregando...</td></tr>
                ) : clients.length === 0 ? (
                  <tr><td colSpan={4} className="text-center p-8 text-zinc-400">Nenhum cliente encontrado.</td></tr>
                ) : (
                  clients.map(client => (
                    <tr key={client.id} className="bg-white border-b last:border-0">
                      <th scope="row" className="px-6 py-4 font-bold text-zinc-900">{client.name}</th>
                      <td className="px-6 py-4 text-zinc-600">{client.phone}</td>
                      {activeTab === 'inactive' && <td className="px-6 py-4 text-zinc-600">{client.last_appointment ? new Date(client.last_appointment).toLocaleDateString() : 'N/A'}</td>}
                      {activeTab === 'birthday' && <td className="px-6 py-4 text-zinc-600">{client.birth_date ? new Date(client.birth_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'N/A'}</td>}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleOpenMessageModal(client)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Enviar Mensagem"><MessageSquare size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        <AnimatePresence>
          {isMessageModalOpen && selectedClient && (
              <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/40">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                      {sendSuccess ? (
                          <div className="text-center">
                              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
                              <h3 className="text-xl font-bold">Mensagem Enviada!</h3>
                              <p className="text-zinc-500 mt-2">A mensagem para {selectedClient.name} foi enviada com sucesso.</p>
                          </div>
                      ) : (
                          <>
                              <h3 className="text-xl font-bold mb-2">Enviar Mensagem</h3>
                              <p className="text-sm text-zinc-500 mb-6">Para: <strong>{selectedClient.name}</strong> ({selectedClient.phone})</p>
                              <form onSubmit={handleSendMessage} className="space-y-4">
                                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="w-full p-4 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" />
                                  <div className="flex gap-3 pt-4">
                                      <button type="button" onClick={handleCloseMessageModal} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
                                      <button type="submit" disabled={isSending} className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors disabled:bg-zinc-400 flex items-center justify-center gap-2">
                                          {isSending ? <Loader size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                                          {isSending ? 'Enviando...' : 'Enviar via WhatsApp'}
                                      </button>
                                  </div>
                              </form>
                          </>
                      )}
                  </motion.div>
              </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};