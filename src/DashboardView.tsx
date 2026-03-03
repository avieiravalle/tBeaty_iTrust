import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api.ts';
import { DashboardStats, Service, StaffFinancialStats } from './types.ts';
import { Card } from './UI.tsx';
import { DollarSign, TrendingUp, PieChart, Filter, Radar, Users as UsersIcon, Gift, Package as PackageIcon, X, Lightbulb } from 'lucide-react';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface DashboardViewProps {
  storeId: number;
  onOpportunityClick: (type: 'inactive' | 'birthday') => void;
}

type Period = 'daily' | 'weekly' | 'monthly';

const FinancialStatCard = ({ label, value, icon: Icon, color }: { label: string, value: string, icon: React.ElementType, color: string }) => (
  <div className="bg-stone-50/50 border border-stone-200/50 rounded-2xl p-6">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <h3 className="text-3xl font-bold text-zinc-900">{value}</h3>
      </div>
    </div>
  </div>
);

export const DashboardView = ({ storeId, onOpportunityClick }: DashboardViewProps) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [staffStats, setStaffStats] = useState<StaffFinancialStats[]>([]);
  const [period, setPeriod] = useState<Period>('monthly');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isRadarModalOpen, setIsRadarModalOpen] = useState(false);
  const [activeTipModal, setActiveTipModal] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const [mainStatsData, staffStatsData] = await Promise.all([
        api.getDashboardStats(storeId, period, selectedCategory),
        api.getStaffDashboardStats(storeId, period)
      ]);
      setStats(mainStatsData);
      setStaffStats(staffStatsData);
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    }
  }, [storeId, period, selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const services: Service[] = await api.getServices(storeId);
      const uniqueCategories = [...new Set(services.map(s => s.category).filter(Boolean) as string[])];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, [storeId]);

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
      { name: 'Comissões', value: stats.totalCommissions, color: '#fde68a' }, // amber-200
      { name: 'Custos Extras', value: stats.extraCosts, color: '#ca8a04' }, // amber-600
      // Note: 'Custo de Estoque' here represents the total value of current inventory, not a periodic expense.
      // It's included for visualization as requested but is a different type of metric.
      { name: 'Reposição de Estoque', value: stats.stockCost, color: '#f59e0b' }, // amber-500
    ].filter(item => item.value > 0);
  }, [stats]);

  return (
    <div className="space-y-8 bg-stone-50 p-1">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800">Saúde Financeira</h2>
          <p className="text-sm text-zinc-500">Análise do período: {periodLabels[period]}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsRadarModalOpen(true)}
            className="flex items-center gap-2 bg-amber-400/20 text-amber-700 px-4 py-2 rounded-xl hover:bg-amber-400/40 transition-colors border border-amber-400/30"
          >
            <Radar size={16} />
            <span className="text-xs font-bold">Radar de Oportunidades</span>
          </button>
          <div className="flex bg-stone-200/70 p-1 rounded-xl">
            {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${period === p ? 'bg-white shadow-sm text-black' : 'text-zinc-500'}`}>
                {periodLabels[p]}
              </button>
            ))}
          </div>
          <div className="relative">
            <select onChange={(e) => setSelectedCategory(e.target.value)} value={selectedCategory} className="appearance-none bg-stone-200/70 p-2.5 text-xs font-bold rounded-xl text-zinc-500 focus:ring-2 focus:ring-amber-500 outline-none pr-8">
              <option value="all">Todas Categorias</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <Filter size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinancialStatCard label="Faturamento Bruto" value={stats ? formatCurrency(stats.revenue) : '...'} icon={DollarSign} color="bg-emerald-100 text-emerald-600" />
        <FinancialStatCard label="Lucro Líquido" value={stats ? formatCurrency(stats.netProfit) : '...'} icon={TrendingUp} color="bg-sky-100 text-sky-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 bg-stone-50/50 border-stone-200/50">
          <h3 className="font-bold mb-1 flex items-center gap-2"><PieChart size={16} className="text-amber-700" /> Composição das Saídas</h3>
          <p className="text-xs text-zinc-400 mb-4">Visão geral dos seus custos no período.</p>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <RechartsPieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} labelLine={false}>
                  {pieData.map((entry) => <Cell key={`cell-${entry.name}`} fill={entry.color} stroke={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(5px)', border: '1px solid #eab308', borderRadius: '12px' }} />
                <Legend iconType="circle" />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="lg:col-span-3 bg-stone-50/50 border-stone-200/50">
          <h3 className="font-bold mb-1">Meta Mensal de Faturamento</h3>
          <p className="text-xs text-zinc-400 mb-6">Acompanhe o progresso em direção ao seu objetivo.</p>
          <div className="space-y-4 pt-8">
            <div className="flex justify-between items-end">
              <span className="text-3xl font-bold text-amber-700">{stats ? formatCurrency(stats.revenue) : '...'}</span>
              <span className="text-sm text-zinc-500">Meta: {stats ? formatCurrency(stats.monthlyGoal) : '...'}</span>
            </div>
            <div className="w-full bg-stone-200/80 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-400 to-amber-600 h-4 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(goalProgress, 100)}%` }}
              ></div>
            </div>
            <p className="text-center text-sm font-medium">{goalProgress.toFixed(1)}% da meta atingida.</p>
          </div>
        </Card>
      </div>

      <Card className="bg-stone-50/50 border-stone-200/50 p-0">
        <div className="p-6 border-b border-zinc-100">
          <h3 className="font-bold flex items-center gap-2"><UsersIcon size={16} className="text-blue-700" /> Desempenho dos Profissionais</h3>
          <p className="text-xs text-zinc-400">Faturamento e comissões por profissional no período.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50/50">
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
        {isRadarModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative"
            >
              <button onClick={() => setIsRadarModalOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600"><X size={24} /></button>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Radar size={20} /></div>
                <h3 className="text-xl font-bold">Radar de Oportunidades</h3>
              </div>
              <p className="text-zinc-500 mb-8">Descubra insights e ideias para impulsionar seu negócio com as Dicas Itrust.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card onClick={() => onOpportunityClick('inactive')} className="p-4 text-center cursor-pointer hover:bg-zinc-50 transition-colors">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3"><Users size={24} /></div>
                  <h5 className="font-bold text-sm">Clientes Inativos</h5>
                  <p className="text-xs text-zinc-500 mt-1">Reative clientes que não agendam há um tempo.</p>
                </Card>
                <Card onClick={() => onOpportunityClick('birthday')} className="p-4 text-center cursor-pointer hover:bg-zinc-50 transition-colors">
                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center mx-auto mb-3"><Gift size={24} /></div>
                  <h5 className="font-bold text-sm">Aniversariantes</h5>
                  <p className="text-xs text-zinc-500 mt-1">Ofereça um mimo para aniversariantes do mês.</p>
                </Card>
                <Card onClick={() => setActiveTipModal('combo')} className="p-4 text-center cursor-pointer hover:bg-zinc-50 transition-colors">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-3"><PackageIcon size={24} /></div>
                  <h5 className="font-bold text-sm">Combos de Serviços</h5>
                  <p className="text-xs text-zinc-500 mt-1">Crie pacotes para aumentar o ticket médio.</p>
                </Card>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-zinc-50 rounded-2xl shadow-2xl w-full max-w-lg p-8 relative border border-zinc-200"
            >
              <button onClick={() => setActiveTipModal(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600"><X size={24} /></button>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><Lightbulb size={24} /></div>
                <div>
                  <h4 className="text-lg font-bold">
                    {activeTipModal === 'inactive' && 'Ideia: Campanha para Clientes Inativos'}
                    {activeTipModal === 'birthday' && 'Ideia: Ação para Aniversariantes'}
                    {activeTipModal === 'combo' && 'Ideia: Promoção de Combos'}
                  </h4>
                  <div className="prose prose-sm text-zinc-600 mt-4">
                    {activeTipModal === 'inactive' && (
                      <>
                        <p>Identifique clientes que não agendam há mais de 3 meses. Envie uma mensagem personalizada via WhatsApp oferecendo <strong>15% de desconto</strong> no próximo serviço.</p>
                        <p><strong>Exemplo de mensagem:</strong> "Olá [Nome do Cliente], sentimos sua falta! Para celebrar seu retorno, estamos oferecendo 15% de desconto no seu próximo agendamento. Que tal?"</p>
                      </>
                    )}
                    {activeTipModal === 'birthday' && (
                      <>
                        <p>No início de cada mês, filtre os clientes que fazem aniversário. Envie uma mensagem carinhosa oferecendo um serviço de baixo custo (ex: hidratação, design de sobrancelha) como presente.</p>
                        <p><strong>Exemplo de mensagem:</strong> "Feliz aniversário, [Nome do Cliente]! 🎉 Para comemorar seu dia, o tBeauty te presenteia com uma hidratação especial. Válido durante todo o seu mês!"</p>
                      </>
                    )}
                    {activeTipModal === 'combo' && (
                      <>
                        <p>Crie pacotes de serviços que se complementam. Por exemplo: "Pé + Mão com 10% de desconto" ou "Corte + Hidratação com preço especial".</p>
                        <p>Divulgue esses combos nas redes sociais e envie para sua lista de clientes no WhatsApp para incentivar agendamentos de maior valor.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};