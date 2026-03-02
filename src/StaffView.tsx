import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, User as UserIcon, Edit, XCircle, AtSign, Percent, Eye, EyeOff } from 'lucide-react';
import { api } from './services/api.ts';
import { User, Service } from './types.ts';
import { Card } from './UI.tsx';

interface StaffViewProps {
  storeId: number;
}

export const StaffView = ({ storeId }: StaffViewProps) => {
  const [staff, setStaff] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [specificCommissions, setSpecificCommissions] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    commission_rate: '',
  });

  const fetchStaff = useCallback(async () => {
    try {
      const data = await api.getStaff(storeId);
      setStaff(data);
    } catch (error) {
      console.error("Failed to fetch staff:", error);
    }
  }, [storeId]);

  const fetchServices = useCallback(async () => {
    try {
      const data = await api.getServices(storeId);
      setServices(data);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  }, [storeId]);

  useEffect(() => {
    fetchStaff();
    fetchServices();
  }, [fetchStaff, fetchServices]);

  const handleOpenAddModal = () => {
    setEditingStaff(null);
    setFormData({ name: '', email: '', password: '', commission_rate: '30' }); // Default commission
    setSpecificCommissions({});
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (user: User) => {
    setEditingStaff(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Password is not edited here for security
      commission_rate: user.commission_rate.toString(),
    });
    try {
      const commissions = await api.getStaffServiceCommissions(user.id);
      const commissionStrings: Record<string, string> = {};
      for (const key in commissions) {
        commissionStrings[key] = commissions[key].toString();
      }
      setSpecificCommissions(commissionStrings);
    } catch (error) {
      console.error("Failed to fetch specific commissions", error);
      setSpecificCommissions({});
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    setSpecificCommissions({});
    setShowPassword(false);
    setFormData({ name: '', email: '', password: '', commission_rate: '' });
  };

  const handleSpecificCommissionChange = (serviceId: string, value: string) => {
    setSpecificCommissions(prev => ({
      ...prev,
      [serviceId]: value,
    }));
  };

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const staffData = {
        name: formData.name,
        email: formData.email,
        commission_rate: parseFloat(formData.commission_rate) || 0,
      };

      if (editingStaff) {
        await api.updateStaff(editingStaff.id, staffData);
        await api.updateStaffServiceCommissions(editingStaff.id, specificCommissions);
      } else {
        if (!formData.password) {
          alert("A senha é obrigatória para novos profissionais.");
          return;
        }
        const newUser = await api.addStaff({ 
            ...staffData, 
            password: formData.password, 
            store_id: storeId 
        });
        if (Object.keys(specificCommissions).length > 0) {
          await api.updateStaffServiceCommissions(newUser.id, specificCommissions);
        }
      }
      
      handleCloseModal();
      await fetchStaff();
    } catch (error: any) {
      console.error("Failed to save staff:", error);
      alert(`Erro ao salvar profissional: ${error.message}`);
    }
  }, [formData, storeId, fetchStaff, editingStaff, specificCommissions]);

  const handleDelete = useCallback(async (userId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este profissional? Esta ação não pode ser desfeita.')) {
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
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-zinc-100 rounded-lg group-hover:bg-black group-hover:text-white transition-colors"><UserIcon size={24} /></div>
            </div>
            <h4 className="font-bold text-lg mb-1">{user.name}</h4>
            <p className="text-zinc-500 text-sm flex items-center gap-1.5 mb-2"><AtSign size={14} />{user.email}</p>
            <p className="text-zinc-500 text-sm flex items-center gap-1.5"><Percent size={14} />{user.commission_rate}% de comissão</p>
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleOpenEditModal(user)}
                className="p-2 bg-white/50 backdrop-blur-sm rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-black"
                aria-label="Editar profissional"
              >
                <Edit size={16} />
              </button>
              <button 
                onClick={() => handleDelete(user.id)}
                className="p-2 bg-white/50 backdrop-blur-sm rounded-lg text-zinc-500 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Excluir profissional"
              >
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
                {!editingStaff && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Senha Provisória</label>
                    <div className="relative">
                      <input required type={showPassword ? 'text' : 'password'} className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none pr-10" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-black">
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                )}
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Taxa de Comissão (%)</label><input required type="number" step="1" min="0" max="100" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.commission_rate} onChange={e => setFormData({...formData, commission_rate: e.target.value})} /></div>
                
                {editingStaff && (
                  <div className="pt-4 mt-4 border-t border-zinc-200">
                    <h4 className="text-md font-bold mb-2">Comissões Específicas</h4>
                    <p className="text-xs text-zinc-500 mb-4">Defina uma comissão diferente para serviços específicos. Se o campo estiver vazio, a taxa geral de {formData.commission_rate}% será aplicada.</p>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2 -mr-2">
                      {services.map(service => (
                        <div key={service.id} className="flex items-center justify-between gap-4 bg-zinc-50/80 p-2 rounded-lg">
                          <label className="text-sm text-zinc-600 flex-1 truncate" title={service.name}>{service.name}</label>
                          <div className="relative w-24">
                            <input type="number" step="1" min="0" max="100" className="w-full pl-2 pr-6 py-1 border border-zinc-200 rounded-md focus:ring-1 focus:ring-black outline-none" placeholder={formData.commission_rate} value={specificCommissions[service.id] || ''} onChange={e => handleSpecificCommissionChange(service.id.toString(), e.target.value)} />
                            <Percent size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4"><button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button><button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors">Salvar</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};