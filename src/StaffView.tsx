import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit, XCircle, Briefcase, Percent, Clock, DollarSign } from 'lucide-react';
import { api } from './services/api.ts';
import { User, Service } from './types.ts';
import { Card } from './UI.tsx';

interface StaffViewProps {
  storeId: number;
}

export const StaffView = ({ storeId }: StaffViewProps) => {
  const [staff, setStaff] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [commissionEditingStaff, setCommissionEditingStaff] = useState<User | null>(null);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [serviceCommissions, setServiceCommissions] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    commission_rate: '0',
    break_start_time: '',
    break_end_time: '',
  });

  const fetchStaff = useCallback(async () => {
    try {
      const data = await api.getStaff(storeId);
      const servicesData = await api.getServices(storeId);
      setStaff(data);
    } catch (error) {
      console.error("Failed to fetch staff:", error);
    }
  }, [storeId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleOpenAddModal = () => {
    setEditingStaff(null);
    setFormData({ name: '', email: '', password: '', commission_rate: '0', break_start_time: '', break_end_time: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingStaff(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Password is not edited here
      commission_rate: user.commission_rate.toString(),
      break_start_time: user.break_start_time || '',
      break_end_time: user.break_end_time || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
  };

  const handleOpenCommissionModal = async (user: User) => {
    setCommissionEditingStaff(user);
    try {
      const [servicesData, commissionsData] = await Promise.all([
        api.getServices(storeId),
        api.getStaffServiceCommissions(user.id)
      ]);
      setAllServices(servicesData);
      setServiceCommissions(Object.fromEntries(Object.entries(commissionsData).map(([k, v]) => [k, v.toString()])));
      setIsCommissionModalOpen(true);
    } catch (error) {
      alert('Falha ao carregar dados de comissão.');
    }
  };

  const handleCloseCommissionModal = () => setIsCommissionModalOpen(false);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const staffData = {
        name: formData.name,
        email: formData.email,
        commission_rate: parseFloat(formData.commission_rate) || 0,
        break_start_time: formData.break_start_time || null,
        break_end_time: formData.break_end_time || null,
      };

      if (editingStaff) {
        await api.updateStaff(editingStaff.id, staffData);
      } else {
        await api.addStaff({ ...staffData, store_id: storeId });
      }
      
      handleCloseModal();
      await fetchStaff();
    } catch (error: any) {
      console.error("Failed to save staff:", error);
      alert(`Erro ao salvar profissional: ${error.message}`);
    }
  }, [formData, storeId, fetchStaff, editingStaff]);

  const handleSaveCommissions = async () => {
    if (!commissionEditingStaff) return;
    try {
      await api.updateStaffServiceCommissions(commissionEditingStaff.id, serviceCommissions);
      handleCloseCommissionModal();
      alert('Comissões atualizadas com sucesso!');
    } catch (error: any) {
      console.error("Failed to save commissions:", error);
      alert(`Erro ao salvar comissões: ${error.message}`);
    }
  };

  const handleDelete = useCallback(async (userId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este profissional?')) {
      try {
        await api.deleteStaff(userId);
        await fetchStaff();
      } catch (error: any) {
        console.error("Failed to delete staff:", error);
        alert(`Erro ao excluir profissional: ${error.message}`);
      }
    }
  }, [fetchStaff]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Equipe de Profissionais</h2>
        <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
          <Plus size={18} />
          <span>Adicionar Profissional</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map(user => (
          <Card key={user.id} className="group hover:border-black transition-colors relative">
            <div className="p-2 bg-zinc-100 rounded-lg group-hover:bg-black group-hover:text-white transition-colors inline-block mb-4"><Briefcase size={20} /></div>
            <h4 className="font-bold text-lg mb-1">{user.name}</h4>
            <p className="text-zinc-500 text-sm truncate">{user.email}</p>
            <div className="mt-2 flex items-center gap-4 text-sm">
                <p className="text-zinc-500 flex items-center gap-1"><Percent size={14} />{user.commission_rate}%</p>
                {user.break_start_time && user.break_end_time && (
                    <p className="text-zinc-500 flex items-center gap-1"><Clock size={14} />{user.break_start_time} - {user.break_end_time}</p>
                )}
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleOpenCommissionModal(user)} className="p-2 bg-white/50 backdrop-blur-sm rounded-lg text-zinc-500 hover:bg-emerald-50 hover:text-emerald-600" aria-label="Comissões">
                <DollarSign size={16} />
              </button>
              <button onClick={() => handleOpenEditModal(user)} className="p-2 bg-white/50 backdrop-blur-sm rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-black" aria-label="Editar">
                <Edit size={16} />
              </button>
              <button onClick={() => handleDelete(user.id)} className="p-2 bg-white/50 backdrop-blur-sm rounded-lg text-zinc-500 hover:bg-rose-50 hover:text-rose-600" aria-label="Excluir">
                <XCircle size={16} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
              <h3 className="text-xl font-bold mb-6">{editingStaff ? 'Editar Profissional' : 'Adicionar Novo Profissional'}</h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Nome Completo</label><input required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">E-mail</label><input required type="email" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Comissão Padrão (%)</label><input required type="number" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.commission_rate} onChange={e => setFormData({...formData, commission_rate: e.target.value})} /></div>
                
                <div className="pt-2">
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Horário de Pausa (Almoço)</label>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="break_start_time" className="text-xs text-zinc-500">Início</label>
                            <input id="break_start_time" type="time" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.break_start_time} onChange={e => setFormData({...formData, break_start_time: e.target.value})} />
                        </div>
                        <div>
                            <label htmlFor="break_end_time" className="text-xs text-zinc-500">Fim</label>
                            <input id="break_end_time" type="time" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.break_end_time} onChange={e => setFormData({...formData, break_end_time: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4"><button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button><button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors">Salvar</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCommissionModalOpen && commissionEditingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
              <h3 className="text-xl font-bold mb-2">Comissões por Serviço</h3>
              <p className="text-sm text-zinc-500 mb-6">Defina comissões específicas para <strong>{commissionEditingStaff.name}</strong>. Se o campo estiver vazio, a taxa padrão de {commissionEditingStaff.commission_rate}% será usada.</p>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {allServices.map(service => (
                  <div key={service.id} className="flex items-center justify-between gap-4 p-3 bg-zinc-50 rounded-xl">
                    <span className="font-medium text-sm">{service.name}</span>
                    <div className="relative w-24">
                      <input type="number" placeholder={commissionEditingStaff.commission_rate.toString()} value={serviceCommissions[service.id] || ''} onChange={(e) => setServiceCommissions(prev => ({ ...prev, [service.id]: e.target.value }))} className="w-full pl-3 pr-6 py-1 border border-zinc-200 rounded-lg text-right focus:ring-2 focus:ring-black outline-none" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-6"><button type="button" onClick={handleCloseCommissionModal} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button><button type="button" onClick={handleSaveCommissions} className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors">Salvar Comissões</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};