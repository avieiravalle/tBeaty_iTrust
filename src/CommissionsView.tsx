import React, { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { api } from './services/api.ts';
import { CommissionStats } from './types.ts';
import { Card } from './UI.tsx';

interface CommissionsViewProps {
  userId: number;
}

export const CommissionsView = ({ userId }: CommissionsViewProps) => {
  const [stats, setStats] = useState<CommissionStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getCommissionStats(userId);
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch commission stats:", error);
      }
    };
    fetchStats();
  }, [userId]);

  if (!stats) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-40 bg-zinc-100 rounded-3xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-24 bg-zinc-100 rounded-2xl"></div>
          <div className="h-24 bg-zinc-100 rounded-2xl"></div>
          <div className="h-24 bg-zinc-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-black text-white rounded-3xl p-8 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-2">Sua Taxa de Comissão</p>
          <h3 className="text-5xl font-bold mb-6">{stats.rate}%</h3>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl inline-block">
            <p className="text-[10px] text-zinc-400 uppercase font-bold">Total do Mês</p>
            <p className="text-xl font-bold">R${stats.monthly.toFixed(2)}</p>
          </div>
        </div>
        <DollarSign size={120} className="absolute -right-8 -bottom-8 text-white/5 rotate-12" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-emerald-500"><p className="text-sm font-medium text-zinc-500 mb-1">Hoje</p><h3 className="text-2xl font-bold text-zinc-900">R${stats.daily.toFixed(2)}</h3></Card>
        <Card className="border-l-4 border-l-indigo-500"><p className="text-sm font-medium text-zinc-500 mb-1">Esta Semana</p><h3 className="text-2xl font-bold text-zinc-900">R${stats.weekly.toFixed(2)}</h3></Card>
        <Card className="border-l-4 border-l-black"><p className="text-sm font-medium text-zinc-500 mb-1">Este Mês</p><h3 className="text-2xl font-bold text-zinc-900">R${stats.monthly.toFixed(2)}</h3></Card>
      </div>

      <Card>
        <h3 className="text-lg font-bold mb-4">Como funciona?</h3>
        <p className="text-zinc-600 text-sm leading-relaxed">
          Suas comissões são calculadas automaticamente com base nos serviços marcados como <strong>CONCLUÍDO</strong>. 
          A taxa de {stats.rate}% é aplicada sobre o valor bruto de cada serviço realizado por você.
        </p>
      </Card>
    </div>
  );
};