import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, AlertTriangle, Users, ChevronRight } from 'lucide-react';
import { api } from './services/api.ts';
import { DashboardStats } from './types.ts';
import { Card, StatCard } from './UI.tsx';

interface DashboardViewProps {
  storeId: number;
}

export const DashboardView = ({ storeId }: DashboardViewProps) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getDashboardStats(storeId);
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      }
    };
    fetchStats();
  }, [storeId]);

  if (!stats) {
    // You can return a loading skeleton here for better UX
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-28 bg-zinc-100 rounded-2xl"></div>
          <div className="h-28 bg-zinc-100 rounded-2xl"></div>
          <div className="h-28 bg-zinc-100 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Faturamento Total" 
          value={`R$${stats.revenue.toFixed(2)}`} 
          icon={TrendingUp} 
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          label="Agendamentos" 
          value={stats.appointments} 
          icon={Calendar} 
          colorClass="bg-indigo-50 text-indigo-600"
        />
        <StatCard 
          label="Estoque Baixo" 
          value={stats.lowStock} 
          icon={AlertTriangle} 
          colorClass="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <h3 className="text-lg font-bold mb-4">Atividade Recente</h3>
          <div className="space-y-4">
            {/* This is placeholder data, replace with real activity feed */}
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-zinc-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center"><Users size={18} className="text-zinc-500" /></div>
                  <div>
                    <p className="font-medium text-sm">Novo agendamento realizado</p>
                    <p className="text-xs text-zinc-400">há {i * 2} horas</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-300" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};