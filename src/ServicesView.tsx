import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Scissors, Clock } from 'lucide-react';
import { api } from './services/api.ts';
import { Service } from './types.ts';
import { Card } from './UI.tsx';

interface ServicesViewProps {
  storeId: number;
}

export const ServicesView = ({ storeId }: ServicesViewProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '', duration_minutes: '' });

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

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addService({
        name: newService.name,
        price: parseFloat(newService.price) || 0,
        duration_minutes: parseInt(newService.duration_minutes, 10) || 0,
        storeId
      });
      setIsAdding(false);
      setNewService({ name: '', price: '', duration_minutes: '' });
      await fetchServices();
    } catch (error) {
      console.error("Failed to add service:", error);
      alert("Erro ao adicionar serviço.");
    }
  }, [newService, storeId, fetchServices]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Catálogo de Serviços</h2>
        <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
          <Plus size={18} />
          <span>Adicionar Serviço</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map(service => (
          <Card key={service.id} className="group hover:border-black transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-zinc-100 rounded-lg group-hover:bg-black group-hover:text-white transition-colors"><Scissors size={20} /></div>
              <span className="text-xl font-bold">R${service.price}</span>
            </div>
            <h4 className="font-bold text-lg mb-1">{service.name}</h4>
            <p className="text-zinc-500 text-sm flex items-center gap-1"><Clock size={14} />{service.duration_minutes} minutos</p>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
              <h3 className="text-xl font-bold mb-6">Adicionar Novo Serviço</h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Nome do Serviço</label><input required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-zinc-700 mb-1">Preço (R$)</label><input required type="number" step="0.01" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={newService.price} onChange={e => setNewService({...newService, price: e.target.value})} /></div>
                  <div><label className="block text-sm font-medium text-zinc-700 mb-1">Duração (min)</label><input required type="number" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={newService.duration_minutes} onChange={e => setNewService({...newService, duration_minutes: e.target.value})} /></div>
                </div>
                <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button><button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors">Salvar Serviço</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};