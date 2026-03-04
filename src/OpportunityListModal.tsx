import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api.ts';
import { Client } from './types.ts';
import { Loader, Edit, FileText, MessageSquare, CheckCircle2, X, Users, Gift } from 'lucide-react';

type ClientWithStats = Client & {
  appointment_count?: number;
  last_appointment?: string;
  birth_date?: string | null;
};

interface OpportunityListModalProps {
  storeId: number;
  type: 'inactive' | 'birthday';
  onClose: () => void;

}

const tabConfig = {
    inactive: {
      title: 'Clientes Inativos',
      description: 'Clientes que não agendam há mais de 90 dias.',
      icon: Users,
    },
    birthday: {
      title: 'Aniversariantes do Mês',
      description: 'Clientes que fazem aniversário este mês.',
      icon: Gift,
    },
};

export const OpportunityListModal = ({ storeId, type, onClose }: OpportunityListModalProps) => {
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithStats | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = type === 'inactive' 
        ? await api.getInactiveClients(storeId) 
        : await api.getBirthdayClients(storeId);
      setClients(data);
    } catch (error) {
      console.error(`Failed to fetch ${type} clients:`, error);
      alert(`Falha ao carregar clientes.`);
    } finally {
      setIsLoading(false);
    }
  }, [storeId, type]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleOpenMessageModal = (client: ClientWithStats) => {
    setSelectedClient(client);
    if (type === 'inactive') {
        setMessage(`Olá ${client.name.split(' ')[0]}, sentimos sua falta aqui no salão! Para celebrar seu retorno, estamos oferecendo um desconto especial no seu próximo agendamento. Que tal?`);
    } else {
        setMessage(`Feliz aniversário, ${client.name.split(' ')[0]}! 🎉 Para comemorar seu dia, temos um presente especial para você em nosso salão. Válido durante todo o seu mês!`);
    }
    setIsMessageModalOpen(true);
    setSendSuccess(false);
  };

  const handleCloseMessageModal = () => {
      setIsMessageModalOpen(false);
      setTimeout(() => {
        setSelectedClient(null);
        setMessage('');
        setIsSending(false);
      }, 300);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedClient || !message) return;
      setIsSending(true);
      try {
          await api.sendWhatsappMessage({ to: selectedClient.phone, message });
          setSendSuccess(true);
          setTimeout(handleCloseMessageModal, 2000);
      } catch (error: any) {
          alert(`Falha ao enviar mensagem: ${error.message}`);
      } finally {
          setIsSending(false);
      }
  };

  const config = tabConfig[type];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-0 relative max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-zinc-100">
            <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600"><X size={24} /></button>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><config.icon size={20} /></div>
                <div>
                    <h3 className="text-xl font-bold">{config.title}</h3>
                    <p className="text-sm text-zinc-500">{config.description}</p>
                </div>
            </div>
          </div>
          
          <div className="overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3">Nome</th>
                  <th scope="col" className="px-6 py-3">Telefone</th>
                  {type === 'inactive' && <th scope="col" className="px-6 py-3">Último Agendamento</th>}
                  {type === 'birthday' && <th scope="col" className="px-6 py-3">Aniversário</th>}
                  <th scope="col" className="px-6 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center p-8 text-zinc-400"><Loader className="animate-spin inline-block mr-2" /> Carregando...</td></tr>
                ) : clients.length === 0 ? (
                  <tr><td colSpan={4} className="text-center p-8 text-zinc-400">Nenhum cliente encontrado.</td></tr>
                ) : (
                  clients.map(client => (
                    <tr key={client.id} className="bg-white border-b last:border-0">
                      <th scope="row" className="px-6 py-4 font-bold text-zinc-900">{client.name}</th>
                      <td className="px-6 py-4 text-zinc-600">{client.phone}</td>
                      {type === 'inactive' && <td className="px-6 py-4 text-zinc-600">{client.last_appointment ? new Date(client.last_appointment).toLocaleDateString() : 'N/A'}</td>}
                      {type === 'birthday' && <td className="px-6 py-4 text-zinc-600">{client.birth_date ? new Date(client.birth_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'N/A'}</td>}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-4">
                          <button className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg" title="Editar"><Edit size={18} /></button>
                          <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Gerar Cobrança"><FileText size={18} /></button>
                          <button onClick={() => handleOpenMessageModal(client)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Enviar Mensagem"><MessageSquare size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isMessageModalOpen && selectedClient && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                    {sendSuccess ? (
                        <div className="text-center"><div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div><h3 className="text-xl font-bold">Mensagem Enviada!</h3><p className="text-zinc-500 mt-2">A mensagem para {selectedClient.name} foi enviada com sucesso.</p></div>
                    ) : (
                        <><h3 className="text-xl font-bold mb-2">Enviar Mensagem</h3><p className="text-sm text-zinc-500 mb-6">Para: <strong>{selectedClient.name}</strong> ({selectedClient.phone})</p><form onSubmit={handleSendMessage} className="space-y-4"><div><label className="block text-sm font-medium text-zinc-700 mb-1">Mensagem</label><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="w-full p-4 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-primary-dark outline-none" placeholder="Escreva sua mensagem..." /></div><div className="flex gap-3 pt-4"><button type="button" onClick={handleCloseMessageModal} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button><button type="submit" disabled={isSending} className="flex-1 px-4 py-2 bg-primary-dark text-white rounded-xl hover:bg-primary-dark/90 transition-colors disabled:bg-zinc-400 flex items-center justify-center gap-2">{isSending ? <Loader size={16} className="animate-spin" /> : <MessageSquare size={16} />}{isSending ? 'Enviando...' : 'Enviar via WhatsApp'}</button></div></form></>
                    )}
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </>
  );
};