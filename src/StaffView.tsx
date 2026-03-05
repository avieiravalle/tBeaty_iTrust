import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Edit, DollarSign, UserPlus, AlertTriangle, Check } from 'lucide-react';
import { api } from './services/api.ts';
import { User } from './types.ts';
import { Card } from './UI.tsx';

interface StaffViewProps {
  user: User;
}

export const StaffView = ({ user }: StaffViewProps) => {
  const [staff, setStaff] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    commission_rate: '30',
    break_start_time: '',
    break_end_time: '',
    monthly_goal: ''
  });

  const fetchStaff = useCallback(async () => {
    try {
      const data = await api.getStaff(user.store_id, 'all');
      setStaff(data);
    } catch (error) {
      console.error("Failed to fetch staff:", error);
    }
  }, [user.store_id]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleOpenModal = (staffMember: User | null = null) => {
    setEditingStaff(staffMember);
    if (staffMember) {
      setFormData({
        name: staffMember.name,
        email: staffMember.email,
        commission_rate: staffMember.commission_rate.toString(),
        break_start_time: staffMember.break_start_time || '',
        break_end_time: staffMember.break_end_time || '',
        monthly_goal: staffMember.monthly_goal?.toString() || ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        commission_rate: '30',
        break_start_time: '',
        break_end_time: '',
        monthly_goal: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      commission_rate: parseFloat(formData.commission_rate) || 0,
      monthly_goal: parseFloat(formData.monthly_goal) || 0,
      store_id: user.store_id,
    };
    try {
      if (editingStaff) {
        await api.updateStaff(editingStaff.id, dataToSave);
      } else {
        await api.addStaff(dataToSave);
      }
      handleCloseModal();
      fetchStaff();
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    }
  };

  const handleStatusToggle = async (staffMember: User) => {
    const newStatus = staffMember.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const action = newStatus === 'ACTIVE' ? 'reativar' : 'desativar';
    if (window.confirm(`Tem certeza que deseja ${action} ${staffMember.name}?`)) {
      try {
        await api.updateStaffStatus(staffMember.id, newStatus);
        fetchStaff();
      } catch (error: any) {
        alert(`Erro: ${error.message}`);
      }
    }
  };

  // --- Plan Limit Logic ---
  const planLimits: Record<string, number> = {
    'BASIC': 4,
    'INTERMEDIATE': 9,
    'ADVANCED': Infinity
  };

  const limit = user.store_plan ? planLimits[user.store_plan] : 0;
  const currentCount = staff.filter(s => s.status === 'ACTIVE').length;
  const isLimitReached = user.role === 'MANAGER' && currentCount >= limit;
  const planName = user.store_plan ? user.store_plan.charAt(0) + user.store_plan.slice(1).toLowerCase() : 'N/A';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Profissionais</h2>
        <div className="flex items-center gap-4">
          {user.role === 'MANAGER' && user.store_plan && (
            <div className="text-right">
              <p className="text-sm font-bold">{currentCount} / {limit === Infinity ? 'Ilimitado' : limit} Colaboradores</p>
              <p className="text-xs text-zinc-500">Plano {planName}</p>
            </div>
          )}
          <button 
            onClick={() => handleOpenModal()} 
            disabled={isLimitReached}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors disabled:bg-zinc-400 disabled:cursor-not-allowed"
            title={isLimitReached ? 'Limite de colaboradores atingido' : 'Adicionar Profissional'}
          >
            <UserPlus size={18} />
            <span>Adicionar</span>
          </button>
        </div>
      </div>

      {isLimitReached && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm border border-amber-200 flex items-center gap-3">
          <AlertTriangle className="text-amber-600" />
          <div>
            Você atingiu o limite de colaboradores para o seu plano. Para adicionar mais, por favor, <button className="font-bold underline">faça um upgrade</button>.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map(staffMember => (
          <Card key={staffMember.id} className={`transition-opacity ${staffMember.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold">{staffMember.name}</h4>
                <p className="text-xs text-zinc-500">{staffMember.email}</p>
                <p className="text-xs text-zinc-500">Comissão: {staffMember.commission_rate}%</p>
                <p className="text-xs text-zinc-500">Meta: R$ {(staffMember.monthly_goal || 0).toFixed(2).replace('.', ',')}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${staffMember.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'}`}>
                {staffMember.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
              <button onClick={() => alert('Função de comissão por serviço em breve!')} className="p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 rounded-lg" title="Comissão por Serviço"><DollarSign size={16} /></button>
              <button onClick={() => handleOpenModal(staffMember)} className="p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 rounded-lg" title="Editar"><Edit size={16} /></button>
              <button onClick={() => handleStatusToggle(staffMember)} className={`p-2 rounded-lg ${staffMember.status === 'ACTIVE' ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`} title={staffMember.status === 'ACTIVE' ? 'Desativar' : 'Reativar'}>
                {staffMember.status === 'ACTIVE' ? <X size={16} /> : <Check size={16} />}
              </button>
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
              <h3 className="text-xl font-bold mb-6">{editingStaff ? 'Editar Profissional' : 'Novo Profissional'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Nome</label><input required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">E-mail</label><input required type="email" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-zinc-700 mb-1">Comissão Padrão (%)</label><input required type="number" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.commission_rate} onChange={e => setFormData({...formData, commission_rate: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-zinc-700 mb-1">Meta Mensal (R$)</label><input type="number" placeholder="Ex: 5000" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.monthly_goal} onChange={e => setFormData({...formData, monthly_goal: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-zinc-700 mb-1">Início Pausa</label><input type="time" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.break_start_time} onChange={e => setFormData({...formData, break_start_time: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-zinc-700 mb-1">Fim Pausa</label><input type="time" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.break_end_time} onChange={e => setFormData({...formData, break_end_time: e.target.value})} /></div>
                </div>
                <p className="text-xs text-zinc-400">{editingStaff ? 'A senha não será alterada.' : 'Uma senha segura será gerada e deverá ser redefinida pelo colaborador no primeiro acesso.'}</p>
                <div className="flex gap-3 pt-4"><button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50">Cancelar</button><button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800">Salvar</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};