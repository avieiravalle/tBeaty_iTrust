import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from './services/api.ts';
import { DashboardStats, Service } from './types.ts';
import { Card } from './UI.tsx';
import { DollarSign, TrendingUp, PieChart, Filter } from 'lucide-react';
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface DashboardViewProps {
  storeId: number;
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

export const DashboardView = ({ storeId }: DashboardViewProps) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [period, setPeriod] = useState<Period>('monthly');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getDashboardStats(storeId, period, selectedCategory);
      setStats(data);
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
    </div>
  );
};