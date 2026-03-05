import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, User as UserIcon, Plus, X, XCircle, Loader, Building, Star, Phone, QrCode, Copy, Check } from 'lucide-react';
import { api } from './services/api.ts';
import { Appointment, Service, User, Client, Store } from './types.ts';
import { Card } from './UI.tsx';
import { generatePixPayload } from './pix.ts';
import QRCode from 'qrcode';

interface ClientAppointmentsViewProps {
  client: Client;
  preselectedStoreId?: number | null;
  onModalOpened?: () => void;
}

export const ClientAppointmentsView = ({ client, preselectedStoreId, onModalOpened }: ClientAppointmentsViewProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewingAppointment, setReviewingAppointment] = useState<Appointment | null>(null);
  const [reviewData, setReviewData] = useState({ rating: 0, comment: '' });
  const [isPrepaymentModalOpen, setIsPrepaymentModalOpen] = useState(false);
  const [prepaymentData, setPrepaymentData] = useState<{ amount: number; qrCode: string; payload: string; percentage: number } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  
  // Dados para o modal de agendamento
  const [stores, setStores] = useState<Store[]>([]);
  const [storeSettings, setStoreSettings] = useState<Record<string, string> | null>(null);
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

  // Effect to open modal if preselectedStoreId is provided from another view
  useEffect(() => {
    if (preselectedStoreId) {
      handleOpenModal(preselectedStoreId);
      if (onModalOpened) {
        onModalOpened();
      }
    }
  }, [preselectedStoreId, onModalOpened]);

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
      Promise.all([
        api.getServices(storeId),
        api.getStaff(storeId),
        api.getSettings(storeId)
      ]).then(([servicesData, staffData, settingsData]) => {
        setServices(servicesData);
        setStaff(staffData);
        setStoreSettings(settingsData);
      }).catch(e => console.error("Failed to fetch store data", e));
    } else {
      setServices([]);
      setStaff([]);
      setStoreSettings(null);
    }
    // Reseta campos dependentes
    setFormData(prev => ({ ...prev, professional_id: '', service_ids: [], time: '' }));
  }, [formData.storeId]);

  const onlineBookingEnabled = useMemo(() => storeSettings?.allow_online_booking !== 'false', [storeSettings]);

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

  const handleOpenModal = (storeIdToSelect?: number) => {
    setFormData({ 
      storeId: storeIdToSelect ? storeIdToSelect.toString() : '', 
      professional_id: '', 
      service_ids: [], 
      date: '', 
      time: '' 
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleOpenReviewModal = (appointment: Appointment) => {
    setReviewingAppointment(appointment);
    setIsReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false);
    setReviewingAppointment(null);
    setReviewData({ rating: 0, comment: '' });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingAppointment || reviewData.rating === 0) {
      alert("Por favor, selecione uma avaliação de 1 a 5 estrelas.");
      return;
    }
    try {
      await api.addReview({
        appointment_id: reviewingAppointment.id,
        rating: reviewData.rating,
        comment: reviewData.comment,
        client_id: client.id, // Pass client id for backend auth check
      });
      handleCloseReviewModal();
      fetchAppointments(); // Refresh the list to show the new review status
    } catch (error: any) {
      alert(`Erro ao enviar avaliação: ${error.message}`);
    }
  };

  const handleClosePrepaymentModal = () => {
    setIsPrepaymentModalOpen(false);
    setPrepaymentData(null);
    setCopiedPix(false);
  };

  const handleCopyPixCode = () => {
    if (!prepaymentData?.payload) return;
    navigator.clipboard.writeText(prepaymentData.payload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

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
      const serviceObjects = formData.service_ids.map(id => services.find(s => s.id.toString() === id)).filter(Boolean) as Service[];
      const totalPrice = serviceObjects.reduce((sum, s) => sum + Number(s.price || 0), 0);
      const prepaymentPercentage = parseFloat(storeSettings?.prepayment_percentage || '10');
      const prepaymentAmount = totalPrice * (prepaymentPercentage / 100);

      // Generate PIX data before creating appointment, to show it right after.
      let pixInfo: { amount: number; qrCode: string; payload: string; percentage: number } | null = null;
      // Only show prepayment if percentage is > 0
      if (prepaymentPercentage > 0 && prepaymentAmount > 0 && storeSettings?.whatsapp_number && storeSettings?.salon_name) {
        const pixKey = storeSettings.whatsapp_number.replace(/\D/g, '');
        const salonName = storeSettings.salon_name;
        const payload = generatePixPayload(
          pixKey,
          salonName,
          'SAO PAULO', // TODO: Make city configurable
          prepaymentAmount,
          `TXID${client.id}${Date.now()}`
        );
        try {
          const qrCodeUrl = await QRCode.toDataURL(payload);
          pixInfo = {
            amount: prepaymentAmount,
            qrCode: qrCodeUrl,
            payload: payload,
            percentage: prepaymentPercentage
          };
        } catch (err) {
          console.error("Failed to generate QR Code for prepayment", err);
          // Don't block appointment if QR code fails, just log it.
        }
      }
      
      await api.createAppointment({
        client_id: client.id,
        professional_id: parseInt(formData.professional_id),
        service_ids: formData.service_ids.map(id => parseInt(id)),
        start_time,
        storeId: parseInt(formData.storeId)
      });
      
      handleCloseModal();
      fetchAppointments();
      if (pixInfo) {
        setPrepaymentData(pixInfo);
        setIsPrepaymentModalOpen(true);
      }
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
        <h2 className="text-2xl font-bold text-zinc-800">Meus Agendamentos</h2>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-xl hover:bg-rose-600 transition-colors shadow-sm">
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
              
              <div className="flex items-center gap-2">
                {apt.status === 'PENDING' && new Date(apt.start_time) > new Date() ? (
                  <button onClick={() => handleCancelAppointment(apt.id)} className="px-4 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors flex items-center justify-center gap-2">
                      <XCircle size={16} /> Cancelar
                  </button>
                ) : apt.status === 'COMPLETED' ? (
                  apt.review_id ? (
                      <div className="flex items-center gap-2 text-amber-500 text-sm font-medium">
                          <Star size={16} className="fill-current text-rose-500" />
                          <span className="text-rose-600">{apt.review_rating} Estrelas</span>
                      </div>
                  ) : (
                      <button onClick={() => handleOpenReviewModal(apt)} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors flex items-center justify-center gap-2">
                          <Star size={16} /> Avaliar
                      </button>
                  )
                ) : apt.status === 'CANCELLED' ? (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700`}>Cancelado</span>
                ) : null}
              </div>
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
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Salão</label>
                  <select required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none" value={formData.storeId} onChange={e => setFormData({...formData, storeId: e.target.value})}>
                    <option value="">Selecione um salão</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {formData.storeId && !onlineBookingEnabled && storeSettings && (
                  <div className="text-center p-6 bg-amber-50 border border-amber-200 rounded-xl my-4">
                    <h4 className="font-bold text-amber-800">Agendamento por Telefone</h4>
                    <p className="text-sm text-amber-700 mt-2 leading-relaxed">
                        Este salão não aceita agendamentos online no momento.
                        {storeSettings.whatsapp_number
                            ? <> Por favor, entre em contato pelo telefone <strong className="text-amber-800">{storeSettings.whatsapp_number}</strong> para marcar seu horário.</>
                            : " Por favor, entre em contato para marcar seu horário."
                        }
                    </p>
                    {storeSettings.whatsapp_number && (
                        <a href={`tel:${storeSettings.whatsapp_number.replace(/\D/g, '')}`} className="mt-4 inline-flex items-center gap-2 font-bold text-black bg-amber-300 px-4 py-2 rounded-lg">
                            <Phone size={16} /> Ligar para {storeSettings.whatsapp_number}
                        </a>
                    )}
                  </div>
                )}
                {formData.storeId && onlineBookingEnabled && (
                  <>
                    <div><label className="block text-sm font-medium text-zinc-700 mb-1">Profissional</label><select required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none" value={formData.professional_id} onChange={e => setFormData({...formData, professional_id: e.target.value, time: ''})}><option value="">Selecione um profissional</option>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-zinc-700 mb-1">Data</label><input required type="date" min={today} className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value, time: ''})} /></div>
                    <div><label className="block text-sm font-medium text-zinc-700 mb-2">Serviços</label><div className="space-y-2 max-h-40 overflow-y-auto border border-zinc-100 rounded-xl p-2">{services.map(service => (<label key={service.id} className="flex items-center gap-2 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer"><input type="checkbox" checked={formData.service_ids.includes(service.id.toString())} onChange={() => handleServiceToggle(service.id.toString())} className="rounded border-zinc-300 text-rose-500 focus:ring-rose-400" /><span className="text-sm">{service.name} - R${service.price}</span></label>))}</div></div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Horários Disponíveis</label>
                      {isLoadingSlots ? (<div className="text-center p-4 text-zinc-500 flex items-center justify-center gap-2"><Loader size={16} className="animate-spin" /> Carregando...</div>) : availableSlots.length > 0 ? (<div className="grid grid-cols-4 gap-2">{availableSlots.map(slot => (<button key={slot} type="button" onClick={() => setFormData({ ...formData, time: slot })} className={`p-2 rounded-lg text-sm font-semibold transition-colors ${formData.time === slot ? 'bg-rose-500 text-white' : 'bg-zinc-100 hover:bg-zinc-200'}`}>{slot}</button>))}</div>) : (<div className="text-center p-4 text-zinc-500 text-sm bg-zinc-50 rounded-lg">{formData.date && formData.professional_id && totalDuration > 0 ? 'Nenhum horário disponível.' : 'Selecione profissional, data e serviços.'}</div>)}
                      <input type="hidden" value={formData.time} required />
                    </div>
                    <button type="submit" className="w-full py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors mt-4">Agendar</button>
                  </>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPrepaymentModalOpen && prepaymentData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><QrCode /> Sinal para Confirmação</h3>
              <p className="text-sm text-zinc-500 mb-4">Para garantir seu horário, pedimos um sinal de <strong>R$ {prepaymentData.amount.toFixed(2).replace('.',',')}</strong> ({prepaymentData.percentage}% do valor).</p>
              
              <div className="text-center p-4 bg-zinc-50 rounded-lg border">
                <img src={prepaymentData.qrCode} alt="Pix QR Code" className="w-48 h-48 mx-auto" />
                <button onClick={handleCopyPixCode} className="mt-4 w-full text-sm flex items-center justify-center gap-2 bg-zinc-200/80 px-4 py-2 rounded-lg hover:bg-zinc-300/80 transition-colors">
                  {copiedPix ? <><Check size={16} /> Copiado!</> : <><Copy size={16} /> Copiar Código Pix</>}
                </button>
              </div>

              <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-200">
                <strong>Não se preocupe:</strong> caso precise cancelar, este valor ficará como crédito para um futuro agendamento.
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={handleClosePrepaymentModal} className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors">
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isReviewModalOpen && reviewingAppointment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                    <h3 className="text-xl font-bold mb-2">Avaliar Serviço</h3>
                    <p className="text-sm text-zinc-500 mb-6">Deixe sua opinião sobre o serviço de <strong>{reviewingAppointment.service_name}</strong> com <strong>{reviewingAppointment.professional_name}</strong>.</p>
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-2">Sua avaliação</label>
                            <div className="flex items-center justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button key={star} type="button" onClick={() => setReviewData({ ...reviewData, rating: star })} className="text-rose-400 transition-transform hover:scale-110">
                                        <Star size={32} className={reviewData.rating >= star ? 'fill-current' : ''} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 mb-1">Comentário (opcional)</label>
                            <textarea value={reviewData.comment} onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })} rows={4} className="w-full p-4 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none" placeholder="Conte-nos mais sobre sua experiência..." />
                        </div>
                        <div className="flex gap-3 pt-4"><button type="button" onClick={handleCloseReviewModal} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button><button type="submit" className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors">Enviar Avaliação</button></div>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};