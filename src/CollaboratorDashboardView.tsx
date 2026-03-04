import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api.ts';
import { User, Appointment, CommissionStats } from './types.ts';
import { Clock, DollarSign, User as ClientIcon, Loader2, FileText, Plus, X, XCircle } from 'lucide-react';

// Componente Card local para evitar dependência de arquivos ausentes no contexto
const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={`bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm ${className || ''}`}>
    {children}
  </div>
);

interface CollaboratorDashboardViewProps {
  user: User;
  onViewAppointments: () => void;
}

const Stat = ({ label, value }: { label: string, value: string }) => (
  <div>
    <p className="text-sm text-zinc-500">{label}</p>
    <p className="text-2xl font-bold text-zinc-900">{value}</p>
  </div>
);

const AppointmentCard = ({ appointment }: { appointment: Appointment }) => (
  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
    <div className="flex items-center gap-3">
      <ClientIcon size={16} className="text-zinc-500" />
      <div>
        <p className="font-semibold text-sm">{appointment.client_name}</p>
        <p className="text-xs text-zinc-500">{appointment.service_name}</p>
      </div>
    </div>
    <div className="text-sm font-bold flex items-center gap-1">
      <Clock size={14} />
      {new Date(appointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
    </div>
  </div>
);

export const CollaboratorDashboardView = ({ user, onViewAppointments }: CollaboratorDashboardViewProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [commissionStats, setCommissionStats] = useState<CommissionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [appts, commissions] = await Promise.all([
        api.getAppointments(user.store_id),
        api.getCommissionStats(user.id)
      ]);
      // Filtra agendamentos para o usuário atual
      setAppointments(appts.filter(a => a.professional_id === user.id));
      setCommissionStats(commissions);
    } catch (error) {
      console.error("Failed to fetch collaborator dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, user.store_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddExpense = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addCollaboratorExpense({
        description: newExpense.description,
        amount: parseFloat(newExpense.amount) || 0,
        userId: user.id,
        storeId: user.store_id
      });
      setIsAddingExpense(false);
      setNewExpense({ description: '', amount: '' });
      await fetchData();
    } catch (error: any) {
      console.error("Failed to add expense:", error);
      alert(`Erro ao adicionar custo: ${error.message}`);
    }
  }, [newExpense, user.id, user.store_id, fetchData]);

  const handleDeleteExpense = useCallback(async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este custo?')) {
      try {
        await api.deleteCollaboratorExpense(id, user.id);
        await fetchData();
      } catch (error: any) {
        alert(`Erro ao excluir custo: ${error.message}`);
      }
    }
  }, [user.id, fetchData]);

  const { todayAppointments, tomorrowAppointments } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(tomorrow.getDate() + 1);

    const filterAndSort = (start: Date, end: Date) => appointments
      .filter(a => {
        const apptDate = new Date(a.start_time);
        return a.status === 'PENDING' && apptDate >= start && apptDate < end;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return { todayAppointments: filterAndSort(today, tomorrow), tomorrowAppointments: filterAndSort(tomorrow, dayAfterTomorrow) };
  }, [appointments]);

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  const goalProgress = useMemo(() => {
      if (!commissionStats || !commissionStats.monthly_goal || commissionStats.monthly_goal === 0 || !commissionStats.monthly_revenue) return 0;
      // A meta é da loja, o progresso é a contribuição do colaborador para a meta geral.
      return (commissionStats.monthly_revenue / commissionStats.monthly_goal) * 100;
  }, [commissionStats]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-zinc-400" size={40} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
              <h3 className="font-bold text-lg mb-4">Hoje</h3>
              <div className="space-y-2">{todayAppointments.length > 0 ? todayAppointments.map(apt => <AppointmentCard key={apt.id} appointment={apt} />) : <p className="text-sm text-zinc-400 p-4 text-center bg-zinc-50 rounded-lg">Nenhum agendamento para hoje.</p>}</div>
            </Card>
            <Card>
              <h3 className="font-bold text-lg mb-4">Amanhã</h3>
              <div className="space-y-2">{tomorrowAppointments.length > 0 ? tomorrowAppointments.map(apt => <AppointmentCard key={apt.id} appointment={apt} />) : <p className="text-sm text-zinc-400 p-4 text-center bg-zinc-50 rounded-lg">Nenhum agendamento para amanhã.</p>}</div>
            </Card>
            <button onClick={onViewAppointments} className="text-sm font-bold text-black hover:underline">Ver agenda completa &rarr;</button>
        </div>
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><DollarSign size={20} /> Resumo Financeiro do Mês</h3>
                {commissionStats ? (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <Stat label="Renda Bruta" value={formatCurrency(commissionStats.monthly_revenue || 0)} />
                            <Stat label="Comissão (Líquido)" value={formatCurrency(commissionStats.monthly)} />
                        </div>
                        
                        {commissionStats.monthly_goal && commissionStats.monthly_goal > 0 && (
                            <div>
                                <div className="flex justify-between items-baseline mb-1">
                                    <p className="text-sm text-zinc-500">Meta da Loja</p>
                                    <p className="text-xs font-bold">{formatCurrency(commissionStats.monthly_goal)}</p>
                                </div>
                                <div className="w-full bg-zinc-200 rounded-full h-2.5">
                                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${Math.min(goalProgress, 100)}%` }}></div>
                                </div>
                                <p className="text-xs text-zinc-400 mt-1 text-right">Sua contribuição: {goalProgress.toFixed(1)}%</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-zinc-400">Não foi possível carregar os dados financeiros.</p>
                )}
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2"><FileText size={18} /> Meus Custos Extras (Mês)</h3>
                    <button onClick={() => setIsAddingExpense(true)} className="flex items-center gap-1 bg-zinc-100 text-zinc-600 px-2 py-1 rounded-lg hover:bg-zinc-200 transition-colors text-xs font-bold">
                        <Plus size={14} /> Adicionar
                    </button>
                </div>
                {commissionStats && commissionStats.recent_expenses && commissionStats.recent_expenses.length > 0 ? (
                    <div className="space-y-2">
                        {commissionStats.recent_expenses.map(expense => (
                            <div key={expense.id} className="group flex justify-between items-center text-sm p-2 bg-zinc-50 rounded-lg">
                                <span>{expense.description}</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-rose-600">- {formatCurrency(expense.amount)}</span>
                                    <button onClick={() => handleDeleteExpense(expense.id)} className="text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><XCircle size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (<p className="text-sm text-zinc-400">Nenhum custo pessoal registrado este mês.</p>)}
                <p className="text-xs text-zinc-400 mt-4 bg-zinc-100 p-2 rounded-md">Adicione aqui seus custos pessoais (ex: transporte, materiais) para seu controle.</p>
            </Card>
        </div>
      </div>
      <AnimatePresence>
        {isAddingExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
              <h3 className="text-xl font-bold mb-6">Adicionar Custo Pessoal</h3>
              <form onSubmit={handleAddExpense} className="space-y-4"><div><label className="block text-sm font-medium text-zinc-700 mb-1">Descrição</label><input required placeholder="Ex: Transporte, Material" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} /></div><div><label className="block text-sm font-medium text-zinc-700 mb-1">Valor (R$)</label><input required type="number" step="0.01" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} /></div><div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsAddingExpense(false)} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button><button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors">Salvar Custo</button></div></form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};