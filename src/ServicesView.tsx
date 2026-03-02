import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Scissors, Clock, Edit, XCircle } from 'lucide-react';
import { api } from './services/api.ts';
import { Service } from './types.ts';
import { Card } from './UI.tsx';

interface ServicesViewProps {
  storeId: number;
}

export const ServicesView = ({ storeId }: ServicesViewProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({ name: '', price: '', duration_minutes: '', category: '' });

  const fetchServices = useCallback(async () => {
    try {
      const data = await api.getServices(storeId);
      setServices(data);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  }, [storeId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleOpenAddModal = () => {
    setEditingService(null);
    setFormData({ name: '', price: '', duration_minutes: '', category: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      price: service.price.toString(),
      duration_minutes: service.duration_minutes.toString(),
      category: service.category || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setFormData({ name: '', price: '', duration_minutes: '', category: '' });
  };

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serviceData = {
        name: formData.name,
        price: parseFloat(formData.price) || 0,
        duration_minutes: parseInt(formData.duration_minutes, 10) || 0,
        category: formData.category,
      };

      if (editingService) {
        await api.updateService(editingService.id, serviceData);
      } else {
        await api.addService({ ...serviceData, storeId, category: formData.category });
      }
      
      handleCloseModal();
      await fetchServices();
    } catch (error) {
      console.error("Failed to save service:", error);
      alert("Erro ao salvar serviço.");
    }
  }, [formData, storeId, fetchServices, editingService]);

  const handleDelete = useCallback(async (serviceId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.')) {
      try {
        await api.deleteService(serviceId);
        await fetchServices();
      } catch (error: any) {
        console.error("Failed to delete service:", error);
        alert(`Erro ao excluir serviço: ${error.message}`);
      }
    }
  }, [fetchServices]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Catálogo de Serviços</h2>
        <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
          <Plus size={18} />
          <span>Adicionar Serviço</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(service => (
          <Card key={service.id} className="group hover:border-black transition-colors relative">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-zinc-100 rounded-lg group-hover:bg-black group-hover:text-white transition-colors"><Scissors size={20} /></div>
              <span className="text-xl font-bold">R${service.price}</span>
            </div>
            <h4 className="font-bold text-lg mb-1">{service.name}</h4>
            <p className="text-zinc-500 text-sm flex items-center gap-1"><Clock size={14} />{service.duration_minutes} minutos</p>
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleOpenEditModal(service)}
                className="p-2 bg-white/50 backdrop-blur-sm rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-black"
                aria-label="Editar serviço"
              >
                <Edit size={16} />
              </button>
              <button 
                onClick={() => handleDelete(service.id)}
                className="p-2 bg-white/50 backdrop-blur-sm rounded-lg text-zinc-500 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Excluir serviço"
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
              <h3 className="text-xl font-bold mb-6">{editingService ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Nome do Serviço</label><input required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Categoria</label><input placeholder="Ex: Cabelo, Unha, Estética" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-zinc-700 mb-1">Preço (R$)</label><input required type="number" step="0.01" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-zinc-700 mb-1">Duração (min)</label><input required type="number" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.duration_minutes} onChange={e => setFormData({...formData, duration_minutes: e.target.value})} /></div>
                </div>
                <div className="flex gap-3 pt-4"><button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button><button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors">Salvar Serviço</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};