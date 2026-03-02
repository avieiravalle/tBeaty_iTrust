import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, CheckCircle2, XCircle, Clock, UserPlus, History, Heart, Users } from 'lucide-react';
import { api } from './services/api.ts';
import { Role, User, Service, Appointment, Client } from './types.ts';
import { Card } from './UI.tsx';

interface AppointmentsViewProps {
  role: Role;
  userId?: number;
  storeId: number;
}

export const AppointmentsView = ({ role, userId, storeId }: AppointmentsViewProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);  
  const [newAppt, setNewAppt] = useState({ client_id: '', professional_id: '', service_id: '', start_time: '' });
  const [selectedClientHistory, setSelectedClientHistory] = useState<Appointment[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [appointmentsData, clientsData, servicesData, staffData] = await Promise.all([
        api.getAppointments(storeId),
        api.getClients(),
        api.getServices(storeId),
        api.getStaff(storeId)
      ]);

      setAppointments(
        role === 'COLLABORATOR' && userId 
          ? appointmentsData.filter(a => a.professional_id === userId) 
          : appointmentsData
      );
      setClients(clientsData);
      setServices(servicesData);
      setStaff(staffData);
    } catch (error) {
      console.error("Failed to fetch appointment data:", error);
    }
  }, [storeId, role, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (newAppt.client_id) {
      const client = clients.find(c => c.id === parseInt(newAppt.client_id));
      setSelectedClient(client || null);
      if (client) {
        api.getClientHistory(client.id).then(setSelectedClientHistory);
      }
    } else {
      setSelectedClient(null);
      setSelectedClientHistory([]);
    }
  }, [newAppt.client_id, clients]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAppointment({
        client_id: parseInt(newAppt.client_id, 10),
        professional_id: parseInt(newAppt.professional_id, 10),
        service_ids: [parseInt(newAppt.service_id, 10)],
        start_time: newAppt.start_time,
        storeId,
      });
      setIsModalOpen(false);
      setNewAppt({ client_id: '', professional_id: '', service_id: '', start_time: '' });
      await fetchData();
    } catch (err: any) {
      console.error("Failed to create appointment:", err);
      alert(err.message);
    }
  }, [newAppt, storeId, fetchData]);

  const updateStatus = useCallback(async (id: number, status: Appointment['status']) => {
    try {
      await api.updateAppointmentStatus(id, status);
      await fetchData();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Erro ao atualizar status do agendamento.");
    }
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Agendamentos</h2>
        {role !== 'COLLABORATOR' && (
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
            <Plus size={18} />
            <span>Novo Agendamento</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {appointments.map(appt => (
          <Card key={appt.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${ appt.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : appt.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600' }`}>
                <Clock size={20} />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900">{appt.client_name}</h4>
                <p className="text-sm text-zinc-500">{appt.service_name} • {appt.professional_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm font-medium">{new Date(appt.start_time).toLocaleDateString('pt-BR')}</p>
                <p className="text-xs text-zinc-400">{new Date(appt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="flex gap-2">
                {appt.status === 'PENDING' && (
                  <>
                    <button onClick={() => updateStatus(appt.id, 'COMPLETED')} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Concluir"><CheckCircle2 size={20} /></button>
                    <button onClick={() => updateStatus(appt.id, 'CANCELLED')} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Cancelar"><XCircle size={20} /></button>
                  </>
                )}
                {appt.status !== 'PENDING' && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider ${ appt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700' }`}>
                    {appt.status === 'COMPLETED' ? 'CONCLUÍDO' : 'CANCELADO'}
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
        {appointments.length === 0 && <div className="text-center py-12 text-zinc-400">Nenhum agendamento encontrado.</div>}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8 my-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-bold mb-6">Novo Agendamento</h3>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1"><label className="block text-sm font-medium text-zinc-700">Cliente</label></div>
                      <select required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={newAppt.client_id} onChange={e => setNewAppt({...newAppt, client_id: e.target.value})}><option value="">Selecionar Cliente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    </div>
                    <div><label className="block text-sm font-medium text-zinc-700 mb-1">Profissional</label><select required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={newAppt.professional_id} onChange={e => setNewAppt({...newAppt, professional_id: e.target.value})}><option value="">Selecionar Profissional</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-zinc-700 mb-1">Serviço</label><select required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={newAppt.service_id} onChange={e => setNewAppt({...newAppt, service_id: e.target.value})}><option value="">Selecionar Serviço</option>{services.map(s => <option key={s.id} value={s.id}>{s.name} (R${s.price})</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-zinc-700 mb-1">Data e Hora</label><input required type="datetime-local" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={newAppt.start_time} onChange={e => setNewAppt({...newAppt, start_time: e.target.value})} /></div>
                    <div className="flex gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button><button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors">Agendar Agora</button></div>
                  </form>
                </div>
                <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                  <h4 className="font-bold flex items-center gap-2 mb-4"><History size={18} className="text-zinc-400" />Resumo do Cliente</h4>
                  {selectedClient ? (
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Users size={12} /> Contato</p>
                        <p className="text-sm text-zinc-700 bg-white p-3 rounded-xl border border-zinc-100">{selectedClient.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Histórico Recente</p>
                        <div className="space-y-3">
                          {selectedClientHistory.slice(0, 3).map(h => (
                            <div key={h.id} className="bg-white p-3 rounded-xl border border-zinc-100 flex justify-between items-center">
                              <div><p className="text-sm font-bold">{h.service_name}</p><p className="text-xs text-zinc-500">{new Date(h.start_time).toLocaleDateString('pt-BR')}</p></div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${ h.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600' }`}>{h.status === 'COMPLETED' ? 'OK' : 'X'}</span>
                            </div>
                          ))}
                          {selectedClientHistory.length === 0 && <p className="text-sm text-zinc-400 text-center py-4">Primeiro atendimento.</p>}
                        </div>
                      </div>
                    </div>
                  ) : (<div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 py-12"><Users size={48} className="mb-4 opacity-20" /><p>Selecione um cliente para ver o histórico.</p></div>)}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};