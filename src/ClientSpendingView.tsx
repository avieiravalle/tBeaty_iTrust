import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api.ts';
import { Client, ClientSpendingStats } from './types.ts';
import { Card } from './UI.tsx';
import { Wallet, TrendingUp, History, Loader, Calendar, CheckCircle, Clock } from 'lucide-react';

interface ClientSpendingViewProps {
  client: Client;
}

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: string, icon: React.ElementType, color: string }) => (
    <Card className={`border-l-4 ${color}`}>
        <p className="text-sm font-medium text-zinc-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-zinc-900">{value}</h3>
    </Card>
);

const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
};

export const ClientSpendingView = ({ client }: ClientSpendingViewProps) => {
  const [spendingStats, setSpendingStats] = useState<ClientSpendingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSpending = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getClientSpending(client.id);
      setSpendingStats(data);
    } catch (error) {
      console.error("Failed to fetch spending stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    fetchSpending();
  }, [fetchSpending]);

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  if (isLoading) {
    return <div className="text-center p-12"><Loader className="animate-spin inline-block" /></div>;
  }

  if (!spendingStats || !spendingStats.monthlyBreakdown) {
    return <Card className="text-center py-12 text-zinc-500">Não foi possível carregar os dados de gastos.</Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-green-100 text-green-600 rounded-xl">
          <Wallet size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Meus Gastos</h2>
          <p className="text-zinc-500">Seu histórico e previsões de gastos no tBeauty.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard 
            title="Total Gasto (Histórico)" 
            value={formatCurrency(spendingStats.historicalTotal)} 
            icon={History}
            color="border-l-blue-500"
        />
        <StatCard 
            title="Agendamentos Futuros" 
            value={formatCurrency(spendingStats.upcomingTotal)} 
            icon={TrendingUp}
            color="border-l-amber-500"
        />
      </div>

      {spendingStats.monthlyBreakdown.length === 0 ? (
        <Card>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><History size={20} className="text-zinc-500" /> Histórico de Serviços</h3>
            <p className="text-zinc-500 text-sm">Nenhum serviço encontrado no seu histórico.</p>
        </Card>
      ) : (
        spendingStats.monthlyBreakdown.map((monthData) => (
            <Card key={monthData.month}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 capitalize">
                    <Calendar size={20} className="text-zinc-500" />
                    {formatMonth(monthData.month)}
                </h3>
                <div className="flex justify-end gap-6 mb-4 text-xs text-zinc-500">
                    <p>Consumado: <span className="font-bold text-zinc-800">{formatCurrency(monthData.completedTotal)}</span></p>
                    <p>Previsto: <span className="font-bold text-zinc-800">{formatCurrency(monthData.upcomingTotal)}</span></p>
                </div>
                <ul className="space-y-3">
                    {monthData.appointments.map((item, index) => (
                        <li key={index} className="flex justify-between items-center p-3 bg-zinc-50 rounded-lg">
                            <div>
                                <p className="font-medium">{item.service_name}</p>
                                <p className="text-xs text-zinc-400">{new Date(item.start_time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="font-bold text-zinc-700">{formatCurrency(item.service_price)}</p>
                                {item.status === 'COMPLETED' ? (
                                    <span title="Concluído" className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle size={14} /> Concluído</span>
                                ) : (
                                    <span title="Agendado" className="flex items-center gap-1 text-xs text-amber-600"><Clock size={14} /> Agendado</span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </Card>
        ))
      )}
    </div>
  );
};