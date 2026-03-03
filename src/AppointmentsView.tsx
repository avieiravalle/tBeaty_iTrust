import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, User as UserIcon, Plus, X, CheckCircle, XCircle, Loader } from 'lucide-react';
import { api } from './services/api.ts';
import { Appointment, Service, User, Client } from './types.ts';
import { Card } from './UI.tsx';

interface AppointmentsViewProps {
  role: 'MANAGER' | 'COLLABORATOR' | 'ADMIN';
  userId: number;
  storeId: number;
}

export const AppointmentsView = ({ role, userId, storeId }: AppointmentsViewProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: '',
    professional_id: role === 'COLLABORATOR' ? userId.toString() : '',
    service_ids: [] as string[],
    date: '',
    time: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const [appointmentsData, servicesData, staffData, clientsData] = await Promise.all([
        api.getAppointments(storeId),
        api.getServices(storeId),
        api.getStaff(storeId),
        api.getClients(storeId)
      ]);
      
      // Filter appointments based on role
      const filteredAppointments = role === 'COLLABORATOR' 
        ? appointmentsData.filter(a => a.professional_id === userId)
        : appointmentsData;
        
      setAppointments(filteredAppointments);
      setServices(servicesData);
      setStaff(staffData);
      setClients(clientsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }, [storeId, role, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate total duration of selected services
  const totalDuration = useMemo(() => {
    return formData.service_ids.reduce((total, id) => {
        const service = services.find(s => s.id.toString() === id);
        return total + (service ? service.duration_minutes : 0);
    }, 0);
  }, [formData.service_ids, services]);

  // Fetch available slots when dependencies change
  useEffect(() => {
    if (formData.date && formData.professional_id && totalDuration > 0) {
        const fetchSlots = async () => {
            setIsLoadingSlots(true);
            setAvailableSlots([]); // Clear previous slots
            try {
                const slots = await api.getAvailability(
                    parseInt(formData.professional_id),
                    formData.date,
                    totalDuration,
                    storeId
                );
                setAvailableSlots(slots);
            } catch (error) {
                console.error("Failed to fetch slots", error);
                setAvailableSlots([]); // Ensure it's empty on error
            } finally {
                setIsLoadingSlots(false);
            }
        };
        fetchSlots();
    } else {
        setAvailableSlots([]); // Clear slots if dependencies are not met
    }
  }, [formData.date, formData.professional_id, totalDuration, storeId]);

  const handleOpenModal = () => {
    setFormData({
      client_id: '',
      professional_id: role === 'COLLABORATOR' ? userId.toString() : '',
      service_ids: [],
      date: '',
      time: ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => {
      const current = prev.service_ids;
      if (current.includes(serviceId)) {
        return { ...prev, service_ids: current.filter(id => id !== serviceId) };
      } else {
        return { ...prev, service_ids: [...current, serviceId] };
      }
    });
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const start_time = new Date(`${formData.date}T${formData.time}`).toISOString();
      
      await api.createAppointment({
        client_id: parseInt(formData.client_id),
        professional_id: parseInt(formData.professional_id),
        service_ids: formData.service_ids.map(id => parseInt(id)),
        start_time,
        storeId
      });
      
      handleCloseModal();
      fetchData();
    } catch (error: any) {
      alert(`Erro ao criar agendamento: ${error.message}`);
    }
  };

  const handleStatusUpdate = async (id: number, status: 'COMPLETED' | 'CANCELLED') => {
    try {
      await api.updateAppointmentStatus(id, status);
      fetchData();
    } catch (error: any) {
      alert(`Erro ao atualizar status: ${error.message}`);
    }
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Agendamentos</h2>
        <button onClick={handleOpenModal} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
          <Plus size={18} />
          <span>Novo Agendamento</span>
        </button>
      </div>

      <div className="grid gap-4">
        {appointments.length === 0 ? (
          <Card className="text-center py-12 text-zinc-500">
            Nenhum agendamento encontrado.
          </Card>
        ) : (
          appointments.map(apt => (
            <Card key={apt.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${apt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' : apt.status === 'CANCELLED' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">{apt.client_name}</h4>
                  <p className="text-zinc-500 text-sm flex items-center gap-2">
                    <Clock size={14} />
                    {new Date(apt.start_time).toLocaleString()}
                  </p>
                  <p className="text-zinc-500 text-sm flex items-center gap-2">
                    <UserIcon size={14} />
                    {apt.professional_name} • {apt.service_name}
                  </p>
                </div>
              </div>
              
              {apt.status === 'PENDING' && (
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => handleStatusUpdate(apt.id, 'COMPLETED')} className="flex-1 md:flex-none px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> Concluir
                  </button>
                  <button onClick={() => handleStatusUpdate(apt.id, 'CANCELLED')} className="flex-1 md:flex-none px-4 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors flex items-center justify-center gap-2">
                    <XCircle size={16} /> Cancelar
                  </button>
                </div>
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
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Novo Agendamento</h3>
                <button onClick={handleCloseModal} className="text-zinc-400 hover:text-zinc-600"><X size={24} /></button>
              </div>
              
              <form onSubmit={handleCreateAppointment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Cliente</label>
                  <select required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}>
                    <option value="">Selecione um cliente</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {role !== 'COLLABORATOR' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Profissional</label>
                    <select required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.professional_id} onChange={e => setFormData({...formData, professional_id: e.target.value})}>
                      <option value="">Selecione um profissional</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Data</label><input required type="date" min={today} className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Serviços</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-zinc-100 rounded-xl p-2">
                    {services.map(service => (
                      <label key={service.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer">
                        <input type="checkbox" checked={formData.service_ids.includes(service.id.toString())} onChange={() => handleServiceToggle(service.id.toString())} className="rounded border-zinc-300 text-black focus:ring-black" />
                        <span className="text-sm">{service.name} - R${service.price}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Horários Disponíveis</label>
                  {isLoadingSlots ? (
                    <div className="text-center p-4 text-zinc-500 flex items-center justify-center gap-2"><Loader size={16} className="animate-spin" /> Carregando horários...</div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">{availableSlots.map(slot => (<button key={slot} type="button" onClick={() => setFormData({ ...formData, time: slot })} className={`p-2 rounded-lg text-sm font-semibold transition-colors ${formData.time === slot ? 'bg-black text-white' : 'bg-zinc-100 hover:bg-zinc-200'}`}>{slot}</button>))}</div>
                  ) : (
                    <div className="text-center p-4 text-zinc-500 text-sm bg-zinc-50 rounded-lg">
                      {formData.date && formData.professional_id && totalDuration > 0
                        ? 'Nenhum horário disponível para esta data/serviços.'
                        : 'Selecione um profissional, data e serviços para ver os horários.'}
                    </div>
                  )}
                  <input type="hidden" value={formData.time} required />
                </div>

                <button type="submit" className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors mt-4">Agendar</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};