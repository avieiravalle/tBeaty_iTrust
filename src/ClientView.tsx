import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, LogOut, Plus, XCircle, Wallet, TrendingUp } from 'lucide-react';
import { api } from './services/api.ts';
import { Client, Appointment, Store, Service, User } from './types.ts';
import { Card } from './UI.tsx';
import { ClientLoginView } from './ClientLoginView.tsx';
import { ClientRegisterView } from './ClientRegisterView.tsx';

export const ClientView = ({ onBack, initialRegister = false }: { onBack: () => void, initialRegister?: boolean }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [authView, setAuthView] = useState<'login' | 'register'>(initialRegister ? 'register' : 'login');

  useEffect(() => {
    // Only restore session if not coming from a register click
    if (!initialRegister) {
      const storedClient = localStorage.getItem('client');
      if (storedClient) {
        try {
          setClient(JSON.parse(storedClient));
        } catch (e) {
          console.error("Failed to parse client from localStorage", e);
          localStorage.removeItem('client');
        }
      }
    }
  }, [initialRegister]);

  const handleAuthSuccess = (authedClient: Client) => {
    setClient(authedClient);
    localStorage.setItem('client', JSON.stringify(authedClient));
  };

  const handleLogout = () => {
    setClient(null);
    localStorage.removeItem('client');
    setAuthView('login');
  };

  if (!client) {
    if (authView === 'register') {
      return (
        <ClientRegisterView
          onBack={onBack}
          onNavigateToLogin={() => setAuthView('login')}
          onRegisterSuccess={() => {
            alert('Cadastro realizado com sucesso! Agora você pode fazer o login.');
            setAuthView('login');
          }}
        />
      );
    }

    return (
      <ClientLoginView
        onBack={onBack}
        onLoginSuccess={handleAuthSuccess}
        onNavigateToRegister={() => setAuthView('register')}
      />
    );
  }

  return <ClientDashboard client={client} onLogout={handleLogout} />;
};

const ClientDashboard = ({ client, onLogout }: { client: Client, onLogout: () => void }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingDetailsForPix, setBookingDetailsForPix] = useState<{ totalPrice: number } | null>(null);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getClientAppointments(client.id);
      setAppointments(data.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()));
    } catch (error) {
      console.error("Failed to fetch client appointments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [client.id]);

  const handleCancelAppointment = useCallback(async (appointmentId: number) => {
    if (window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
      try {
        await api.updateAppointmentStatus(appointmentId, 'CANCELLED');
        // Refresh the list after cancellation
        await fetchAppointments();
      } catch (error) {
        console.error("Failed to cancel appointment:", error);
        alert('Não foi possível cancelar o agendamento. Tente novamente.');
      }
    }
  }, [fetchAppointments]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const upcomingAppointments = appointments.filter(a => new Date(a.start_time) >= new Date() && a.status === 'PENDING');
  const pastAppointments = appointments.filter(a => new Date(a.start_time) < new Date() || a.status !== 'PENDING');

  const { realizedSpending, expectedSpending } = useMemo(() => {
    const realized = appointments
      .filter(a => a.status === 'COMPLETED')
      .reduce((sum, a) => sum + (a.service_price || 0), 0);

    const expected = appointments
      .filter(a => a.status === 'PENDING' && new Date(a.start_time) >= new Date())
      .reduce((sum, a) => sum + (a.service_price || 0), 0);

    return { realizedSpending: realized, expectedSpending: expected };
  }, [appointments]);

  return (
    <div className="p-4 md:p-8 space-y-6 bg-zinc-50 min-h-screen">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Olá, {client.name.split(' ')[0]}!</h1>
          <p className="text-zinc-500">Bem-vindo(a) de volta.</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsBookingModalOpen(true)} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
            <Plus size={18} />
            <span>Agendar</span>
          </button>
          <button onClick={onLogout} className="p-2 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors" title="Sair">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main>
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Gastos Realizados</p>
              <p className="text-2xl font-bold">R$ {realizedSpending.toFixed(2)}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Gastos Previstos</p>
              <p className="text-2xl font-bold">R$ {expectedSpending.toFixed(2)}</p>
            </div>
          </Card>
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Calendar size={20} /> Próximos Agendamentos</h2>
          {isLoading ? (
            <Card><p className="text-zinc-400">Carregando agendamentos...</p></Card>
          ) : upcomingAppointments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingAppointments.map(appt => (
                <Card key={appt.id} className="flex flex-col justify-between group">
                  <div>
                    <p className="font-bold text-lg">{appt.service_name}</p>
                    <p className="text-sm text-zinc-500">com {appt.professional_name}</p>
                    <p className="text-sm text-zinc-500 mt-1">em <span className="font-medium text-zinc-700">{appt.store_name}</span></p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-bold">{new Date(appt.start_time).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                      <p className="text-zinc-500">{new Date(appt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleCancelAppointment(appt.id)}
                        className="p-2 text-rose-500 bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Cancelar Agendamento"
                      >
                        <XCircle size={20} />
                      </button>
                      <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
                        <Clock size={20} />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12 text-zinc-400">
              <p>Você não tem nenhum agendamento futuro.</p>
            </Card>
          )}
        </section>

        <section className="mt-8 space-y-4">
          <h2 className="text-xl font-bold">Histórico</h2>
          {isLoading ? (
            <Card><p className="text-zinc-400">Carregando histórico...</p></Card>
          ) : pastAppointments.length > 0 ? (
            <div className="space-y-3">
              {pastAppointments.map(appt => (
                <Card key={appt.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{appt.service_name}</p>
                    <p className="text-sm text-zinc-500">{new Date(appt.start_time).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider ${ appt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700' }`}>
                    {appt.status === 'COMPLETED' ? 'CONCLUÍDO' : 'CANCELADO'}
                  </span>
                </Card>
              ))}
            </div>
          ) : (
             <Card className="text-center py-12 text-zinc-400">
              <p>Seu histórico de agendamentos está vazio.</p>
            </Card>
          )}
        </section>
      </main>

      <AnimatePresence>
        {isBookingModalOpen && (
          <BookingModal 
            clientId={client.id} 
            onClose={() => setIsBookingModalOpen(false)} 
            onSuccess={(details) => {
              setIsBookingModalOpen(false);
              setBookingDetailsForPix(details);
            }}
          />
        )}
        {bookingDetailsForPix && (
          <PixPaymentModal
            totalPrice={bookingDetailsForPix.totalPrice}
            onClose={() => {
              setBookingDetailsForPix(null);
              fetchAppointments();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const PixPaymentModal = ({ totalPrice, onClose }: { totalPrice: number, onClose: () => void }) => {
  const pixValue = (totalPrice * 0.10).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center"
      >
        <h3 className="text-xl font-bold mb-2">Agendamento Quase Concluído!</h3>
        <p className="text-zinc-500 mb-6">Para confirmar, realize o pagamento do sinal de 10% via PIX.</p>

        <div className="flex flex-col items-center justify-center">
          {/* Este QR Code é um placeholder. O gestor deverá cadastrar o QR Code real no sistema. */}
          <img src="/pix-qrcode.png" alt="QR Code PIX" className="w-48 h-48 rounded-lg border-4 border-zinc-200 bg-gray-100" />
          <p className="mt-4 font-bold text-2xl">R$ {pixValue}</p>
          <p className="text-xs text-zinc-400">(Sinal de 10%)</p>
        </div>

        <div className="mt-6 bg-blue-50 text-blue-800 text-sm p-4 rounded-xl border border-blue-100">
          <p>Caso precise cancelar, não se preocupe! O seu adiantamento de 10% ficará guardado como crédito para você usar em um próximo serviço com a gente.</p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 px-4 py-3 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors font-bold"
        >
          Fechar
        </button>
      </motion.div>
    </div>
  );
};

const BookingModal = ({ clientId, onClose, onSuccess }: { clientId: number, onClose: () => void, onSuccess: (details: { totalPrice: number }) => void }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [newAppt, setNewAppt] = useState<{ professional_id: string; service_ids: string[]; date: string; time: string }>({
    professional_id: '',
    service_ids: [],
    date: '',
    time: '',
  });

  useEffect(() => {
    api.getStores().then(setStores);
  }, []);

  const handleServiceToggle = (serviceId: string) => {
    setNewAppt(prev => {
      const newServiceIds = prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId];
      return { ...prev, service_ids: newServiceIds };
    });
  };

  const { totalPrice, totalDuration } = useMemo(() => {
    return newAppt.service_ids.reduce(
      (acc, currentId) => {
        const service = services.find(s => s.id === parseInt(currentId, 10));
        if (service) {
          acc.totalPrice += service.price;
          acc.totalDuration += service.duration_minutes;
        }
        return acc;
      },
      { totalPrice: 0, totalDuration: 0 }
    );
  }, [newAppt.service_ids, services]);

  const timeSlots = useMemo(() => {
    const slots = [];
    // Generate time slots from 8:00 to 19:30
    for (let h = 8; h < 20; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
        slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  useEffect(() => {
    if (selectedStore) {
      const storeId = parseInt(selectedStore, 10);
      api.getServices(storeId).then(setServices);
      api.getStaff(storeId).then(setStaff);
      setNewAppt({ professional_id: '', service_ids: [], date: '', time: '' });
    } else {
      setServices([]);
      setStaff([]);
    }
  }, [selectedStore]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Combine date and time into a full ISO string for the backend
      const start_time = new Date(`${newAppt.date}T${newAppt.time}`).toISOString();

      await api.createAppointment({
        client_id: clientId,
        professional_id: parseInt(newAppt.professional_id, 10),
        service_ids: newAppt.service_ids.map(id => parseInt(id, 10)),
        storeId: parseInt(selectedStore, 10),
        start_time: start_time
      });
      onSuccess({ totalPrice });
    } catch (err: any) {
      console.error("Failed to create appointment:", err);
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.95 }} 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 my-8"
      >
        <h3 className="text-xl font-bold mb-6">Novo Agendamento</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Salão</label>
            <select required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={selectedStore} onChange={e => setSelectedStore(e.target.value)}>
              <option value="">Selecione o Salão</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {selectedStore && (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 overflow-hidden">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-700">Serviços</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-2">
                    {services.map(s => (
                      <label key={s.id} className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer has-[:checked]:bg-black has-[:checked]:text-white has-[:checked]:font-bold transition-all border border-zinc-100">
                        <input
                          type="checkbox"
                          checked={newAppt.service_ids.includes(s.id.toString())}
                          onChange={() => handleServiceToggle(s.id.toString())}
                          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <span className="flex-1 text-sm">{s.name}</span>
                        <span className="text-sm">R${s.price.toFixed(2)}</span>
                      </label>
                    ))}
                  </div>
                  {totalPrice > 0 && (
                    <div className="mt-2 text-sm flex justify-between font-medium bg-zinc-100 p-3 rounded-lg">
                      <span>Total: <span className="font-bold">R$ {totalPrice.toFixed(2)}</span></span>
                      <span>Duração Aprox.: <span className="font-bold">{totalDuration} min</span></span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Profissional</label>
                  <select required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={newAppt.professional_id} onChange={e => setNewAppt({...newAppt, professional_id: e.target.value})}>
                    <option value="">Selecionar Profissional</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Data e Hora</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      required 
                      type="date" 
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" 
                      value={newAppt.date} 
                      onChange={e => setNewAppt({...newAppt, date: e.target.value})} 
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <select 
                      required 
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" 
                      value={newAppt.time} 
                      onChange={e => setNewAppt({...newAppt, time: e.target.value})}
                    >
                      <option value="">Horário</option>
                      {timeSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                    </select>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={!selectedStore || newAppt.service_ids.length === 0 || !newAppt.professional_id || !newAppt.date || !newAppt.time} className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors disabled:bg-zinc-300 disabled:cursor-not-allowed">Agendar</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};