import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api.ts';
import { Client } from './types.ts';
import { Card } from './UI.tsx';
import { Users, Gift, Loader, Edit, FileText, MessageSquare, CheckCircle2 } from 'lucide-react';

interface OpportunitiesViewProps {
  storeId: number;
  initialTab: 'inactive' | 'birthday';
}

type ClientWithStats = Client & {
  appointment_count?: number;
  last_appointment?: string;
  birth_date?: string | null;
};

export const OpportunitiesView = ({ storeId, initialTab }: OpportunitiesViewProps) => {
  const [activeTab, setActiveTab] = useState<'inactive' | 'birthday'>(initialTab);
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
      let data;
      if (activeTab === 'inactive') {
        data = await api.getInactiveClients(storeId);
      } else {
        data = await api.getBirthdayClients(storeId);
      }
      setClients(data);
    } catch (error) {
      console.error(`Failed to fetch ${activeTab} clients:`, error);
      alert(`Falha ao carregar clientes: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [storeId, activeTab]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

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

  const handleOpenMessageModal = (client: ClientWithStats) => {
    setSelectedClient(client);
    if (activeTab === 'inactive') {
        setMessage(`Olá ${client.name.split(' ')[0]}, sentimos sua falta aqui no salão! Para celebrar seu retorno, estamos oferecendo um desconto especial no seu próximo agendamento. Que tal?`);
    } else {
        setMessage(`Feliz aniversário, ${client.name.split(' ')[0]}! 🎉 Para comemorar seu dia, temos um presente especial para você em nosso salão. Válido durante todo o seu mês!`);
    }
    setIsMessageModalOpen(true);
    setSendSuccess(false);
  };

  const handleCloseMessageModal = () => {
      setIsMessageModalOpen(false);
      // Delay resetting client to allow for exit animation
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Radar de Oportunidades</h2>
        <p className="text-zinc-500">Listas de clientes para ações de marketing e relacionamento.</p>
      </div>

      <div className="flex border-b border-zinc-200">
        {Object.entries(tabConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'inactive' | 'birthday')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === key
                ? 'border-b-2 border-black text-black'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <config.icon size={16} />
            {config.title}
          </button>
        ))}
      </div>

      <Card className="p-0">
        <div className="p-6 border-b border-zinc-100">
            <h3 className="font-bold">{tabConfig[activeTab].title}</h3>
            <p className="text-sm text-zinc-500">{tabConfig[activeTab].description}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50">
              <tr>
                <th scope="col" className="px-6 py-3">Nome</th>
                <th scope="col" className="px-6 py-3">Telefone</th>
                {activeTab === 'inactive' && <th scope="col" className="px-6 py-3">Último Agendamento</th>}
                {activeTab === 'birthday' && <th scope="col" className="px-6 py-3">Aniversário</th>}
                <th scope="col" className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="text-center p-8 text-zinc-400"><Loader className="animate-spin inline-block mr-2" /> Carregando...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={4} className="text-center p-8 text-zinc-400">Nenhum cliente encontrado nesta categoria.</td></tr>
              ) : (
                clients.map(client => (
                  <tr key={client.id} className="bg-white border-b last:border-0">
                    <th scope="row" className="px-6 py-4 font-bold text-zinc-900">{client.name}</th>
                    <td className="px-6 py-4 text-zinc-600">{client.phone}</td>
                    {activeTab === 'inactive' && <td className="px-6 py-4 text-zinc-600">{client.last_appointment ? new Date(client.last_appointment).toLocaleDateString() : 'N/A'}</td>}
                    {activeTab === 'birthday' && <td className="px-6 py-4 text-zinc-600">{client.birth_date ? new Date(client.birth_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'N/A'}</td>}
                    <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-4"><button className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg" title="Editar"><Edit size={18} /></button><button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Gerar Cobrança"><FileText size={18} /></button><button onClick={() => handleOpenMessageModal(client)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Enviar Mensagem"><MessageSquare size={18} /></button></div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {isMessageModalOpen && selectedClient && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                    {sendSuccess ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold">Mensagem Enviada!</h3>
                            <p className="text-zinc-500 mt-2">A mensagem para {selectedClient.name} foi enviada com sucesso.</p>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-xl font-bold mb-2">Enviar Mensagem</h3>
                            <p className="text-sm text-zinc-500 mb-6">Para: <strong>{selectedClient.name}</strong> ({selectedClient.phone})</p>
                            <form onSubmit={handleSendMessage} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-1">Mensagem</label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        rows={6}
                                        className="w-full p-4 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                                        placeholder="Escreva sua mensagem..."
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={handleCloseMessageModal} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
                                    <button type="submit" disabled={isSending} className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors disabled:bg-zinc-400 flex items-center justify-center gap-2">
                                        {isSending ? <Loader size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                                        {isSending ? 'Enviando...' : 'Enviar via WhatsApp'}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};