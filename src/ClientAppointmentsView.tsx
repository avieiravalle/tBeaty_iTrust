import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, User as UserIcon, Plus, X, XCircle, Loader, Building } from 'lucide-react';
import { api } from './services/api.ts';
import { Appointment, Service, User, Client, Store } from './types.ts';
import { Card } from './UI.tsx';

interface ClientAppointmentsViewProps {
  client: Client;
}

export const ClientAppointmentsView = ({ client }: ClientAppointmentsViewProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Dados para o modal de agendamento
  const [stores, setStores] = useState<Store[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
  const [formData, setFormData] = useState({
    storeId: '',
    professional_id: '',
    service_ids: [] as string[],
    date: '',
    time: ''
  });

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getClientAppointments(client.id);
      setAppointments(data);
    } catch (error) {
      console.error("Failed to fetch client appointments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Busca salões quando o modal abre pela primeira vez
  useEffect(() => {
    if (isModalOpen && stores.length === 0) {
      api.getStores().then(setStores).catch(e => console.error("Failed to fetch stores", e));
    }
  }, [isModalOpen, stores.length]);

  // Busca serviços e profissionais quando um salão é selecionado
  useEffect(() => {
    if (formData.storeId) {
      const storeId = parseInt(formData.storeId);
      api.getServices(storeId).then(setServices).catch(e => console.error(e));
      api.getStaff(storeId).then(setStaff).catch(e => console.error(e));
    } else {
      setServices([]);
      setStaff([]);
    }
    // Reseta campos dependentes
    setFormData(prev => ({ ...prev, professional_id: '', service_ids: [], time: '' }));
  }, [formData.storeId]);

  const totalDuration = useMemo(() => {
    return formData.service_ids.reduce((total, id) => {
        const service = services.find(s => s.id.toString() === id);
        return total + (service ? service.duration_minutes : 0);
    }, 0);
  }, [formData.service_ids, services]);

  // Busca horários disponíveis
  useEffect(() => {
    if (formData.date && formData.professional_id && totalDuration > 0 && formData.storeId) {
        const fetchSlots = async () => {
            setIsLoadingSlots(true);
            setAvailableSlots([]);
            try {
                const slots = await api.getAvailability(
                    parseInt(formData.professional_id),
                    formData.date,
                    totalDuration,
                    parseInt(formData.storeId)
                );
                setAvailableSlots(slots);
            } catch (error) {
                console.error("Failed to fetch slots", error);
            } finally {
                setIsLoadingSlots(false);
            }
        };
        fetchSlots();
    } else {
        setAvailableSlots([]);
    }
  }, [formData.date, formData.professional_id, totalDuration, formData.storeId]);

  const handleOpenModal = () => {
    setFormData({ storeId: '', professional_id: '', service_ids: [], date: '', time: '' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => {
      const current = prev.service_ids;
      const newServiceIds = current.includes(serviceId)
        ? current.filter(id => id !== serviceId)
        : [...current, serviceId];
      return { ...prev, service_ids: newServiceIds, time: '' }; // Reseta a hora quando os serviços mudam
    });
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.storeId) {
        alert("Por favor, selecione um salão.");
        return;
    }
    try {
      const start_time = new Date(`${formData.date}T${formData.time}`).toISOString();
      
      await api.createAppointment({
        client_id: client.id,
        professional_id: parseInt(formData.professional_id),
        service_ids: formData.service_ids.map(id => parseInt(id)),
        start_time,
        storeId: parseInt(formData.storeId)
      });
      
      handleCloseModal();
      fetchAppointments();
    } catch (error: any) {
      alert(`Erro ao criar agendamento: ${error.message}`);
    }
  };

  const handleCancelAppointment = async (id: number) => {
    if (window.confirm("Tem certeza que deseja cancelar este agendamento?")) {
        try {
          await api.updateAppointmentStatus(id, 'CANCELLED');
          fetchAppointments();
        } catch (error: any) {
          alert(`Erro ao cancelar agendamento: ${error.message}`);
        }
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Meus Agendamentos</h2>
        <button onClick={handleOpenModal} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
          <Plus size={18} />
          <span>Novo Agendamento</span>
        </button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
            <Card className="text-center py-12 text-zinc-500">Carregando agendamentos...</Card>
        ) : appointments.length === 0 ? (
          <Card className="text-center py-12 text-zinc-500">
            Você ainda não tem agendamentos.
          </Card>
        ) : (
          appointments.map(apt => (
            <Card key={apt.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="font-bold text-lg">{apt.service_name}</h4>
                <p className="text-zinc-600 text-sm font-medium flex items-center gap-2"><Building size={14} /> {apt.store_name}</p>
                <p className="text-zinc-500 text-sm flex items-center gap-2"><Clock size={14} /> {new Date(apt.start_time).toLocaleString('pt-BR')}</p>
                <p className="text-zinc-500 text-sm flex items-center gap-2"><UserIcon size={14} /> {apt.professional_name}</p>
              </div>
              
              {apt.status === 'PENDING' && new Date(apt.start_time) > new Date() && (
                <button onClick={() => handleCancelAppointment(apt.id)} className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors flex items-center justify-center gap-2">
                    <XCircle size={16} /> Cancelar
                </button>
              )}
              {apt.status !== 'PENDING' && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${apt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {apt.status === 'COMPLETED' ? 'Concluído' : 'Cancelado'}
                </span>
              )}
            </Card>
          ))
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">Novo Agendamento</h3><button onClick={handleCloseModal} className="text-zinc-400 hover:text-zinc-600"><X size={24} /></button></div>
              <form onSubmit={handleCreateAppointment} className="space-y-4">
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Salão</label><select required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.storeId} onChange={e => setFormData({...formData, storeId: e.target.value})}><option value="">Selecione um salão</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                {formData.storeId && (
                  <>
                    <div><label className="block text-sm font-medium text-zinc-700 mb-1">Profissional</label><select required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.professional_id} onChange={e => setFormData({...formData, professional_id: e.target.value, time: ''})}><option value="">Selecione um profissional</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-zinc-700 mb-1">Data</label><input required type="date" min={today} className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value, time: ''})} /></div>
                    <div><label className="block text-sm font-medium text-zinc-700 mb-2">Serviços</label><div className="space-y-2 max-h-40 overflow-y-auto border border-zinc-100 rounded-xl p-2">{services.map(service => (<label key={service.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer"><input type="checkbox" checked={formData.service_ids.includes(service.id.toString())} onChange={() => handleServiceToggle(service.id.toString())} className="rounded border-zinc-300 text-black focus:ring-black" /><span className="text-sm">{service.name} - R${service.price}</span></label>))}</div></div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Horários Disponíveis</label>
                      {isLoadingSlots ? (<div className="text-center p-4 text-zinc-500 flex items-center justify-center gap-2"><Loader size={16} className="animate-spin" /> Carregando...</div>) : availableSlots.length > 0 ? (<div className="grid grid-cols-4 gap-2">{availableSlots.map(slot => (<button key={slot} type="button" onClick={() => setFormData({ ...formData, time: slot })} className={`p-2 rounded-lg text-sm font-semibold transition-colors ${formData.time === slot ? 'bg-black text-white' : 'bg-zinc-100 hover:bg-zinc-200'}`}>{slot}</button>))}</div>) : (<div className="text-center p-4 text-zinc-500 text-sm bg-zinc-50 rounded-lg">{formData.date && formData.professional_id && totalDuration > 0 ? 'Nenhum horário disponível.' : 'Selecione profissional, data e serviços.'}</div>)}
                      <input type="hidden" value={formData.time} required />
                    </div>
                  </>
                )}
                <button type="submit" className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors mt-4">Agendar</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};