import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Send, MessageSquare, Copy, Check, Loader, Edit, FileText, QrCode, Plus, Search } from 'lucide-react';
import { api } from './services/api.ts';
import { Client } from './types.ts';
import { Card } from './UI.tsx';
import { phoneMask, cepMask } from './masks.ts';
import { generatePixPayload } from './pix.ts';
import QRCode from 'qrcode';

interface ClientsViewProps {
  storeId: number;
}
// Extend the Client type to include the new data from the backend
type ClientWithStats = Client & {
  appointment_count: number;
};

export const ClientsView = ({ storeId }: ClientsViewProps) => {
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState<ClientWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promotionMessage, setPromotionMessage] = useState('Olá! Temos uma promoção especial para você: ');
  const [targetClient, setTargetClient] = useState<ClientWithStats | 'all' | 'selected' | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{success: boolean, message: string} | null>(null);
  const [selectedClients, setSelectedClients] = useState<Set<number>>(new Set());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithStats | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', phone: '', cep: '', birth_date: '' });
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentClient, setPaymentClient] = useState<ClientWithStats | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [pixPayload, setPixPayload] = useState('');
  const [pixQrCode, setPixQrCode] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerFormData, setRegisterFormData] = useState({ name: '', email: '', phone: '', cep: '', birth_date: '' });
  const [registerFormErrors, setRegisterFormErrors] = useState<Record<string, string>>({});

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    // Reseta a seleção ao recarregar
    setSelectedClients(new Set());
    try {
      const data = await api.getClients(storeId);
      setClients(data as ClientWithStats[]);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
      alert('Falha ao carregar clientes.');
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.getSettings(storeId);
      setSettings(data);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  }, [storeId]);

  useEffect(() => {
    fetchClients();
    fetchSettings();
  }, [fetchClients, fetchSettings]);

  useEffect(() => {
    const results = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(results);
  }, [searchTerm, clients]);

  const handleOpenModal = (client: ClientWithStats | 'all' | 'selected') => {
    setTargetClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTargetClient(null);
    setPromotionMessage('Olá! Temos uma promoção especial para você: ');
    setCopied(false);
    setIsSending(false);
    setSendResult(null);
    // Não reseta a seleção aqui, o usuário pode querer fazer outra ação
  };

  const handleOpenEditModal = (client: ClientWithStats) => {
    setEditingClient(client);
    setEditFormData({
      name: client.name,
      phone: client.phone,
      cep: client.cep,
      birth_date: client.birth_date || '',
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingClient(null);
    setEditFormData({ name: '', phone: '', cep: '', birth_date: '' });
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    try {
      await api.updateClient(editingClient.id, { name: editFormData.name, phone: editFormData.phone, cep: editFormData.cep, birth_date: editFormData.birth_date });
      handleCloseEditModal();
      await fetchClients();
    } catch (error: any) {
      alert(`Erro ao atualizar cliente: ${error.message}`);
    }
  };

  const handleOpenRegisterModal = () => {
    setRegisterFormData({ name: '', email: '', phone: '', cep: '', birth_date: '' });
    setRegisterFormErrors({});
    setIsRegisterModalOpen(true);
  };

  const handleCloseRegisterModal = () => {
    setIsRegisterModalOpen(false);
    setRegisterFormErrors({});
  };

  const handleRegisterClient = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!registerFormData.name.trim()) {
      errors.name = 'Nome é obrigatório.';
    }
    if (!registerFormData.phone.trim()) {
      errors.phone = 'Telefone é obrigatório.';
    }
    if (!registerFormData.cep.trim()) {
      errors.cep = 'CEP é obrigatório.';
    }
    if (registerFormData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerFormData.email)) {
      errors.email = 'Formato de e-mail inválido.';
    }

    setRegisterFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await api.registerClient({ ...registerFormData, storeId });
      handleCloseRegisterModal();
      await fetchClients();
      alert('Cliente cadastrado com sucesso!');
    } catch (error: any) {
      console.error("Failed to register client:", error);
      setRegisterFormErrors({ general: error.message });
    }
  };

  const handleOpenPaymentModal = (client: ClientWithStats) => {
    setPaymentClient(client);
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentClient(null);
    setPaymentAmount('');
    setPixPayload('');
    setPixQrCode('');
    setCopiedPix(false);
  };

  // Effect to generate QR Code when amount or client changes
  useEffect(() => {
    if (isPaymentModalOpen && paymentClient && parseFloat(paymentAmount) > 0) {
      const pixKey = settings.whatsapp_number?.replace(/\D/g, ''); // Using whatsapp number as pix key
      const salonName = settings.salon_name || 'tBeauty';
      
      if (pixKey && salonName) {
        const payload = generatePixPayload(
          pixKey,
          salonName,
          'SAO PAULO', // City should ideally come from settings too
          parseFloat(paymentAmount),
          `TXID${paymentClient.id}${Date.now()}`
        );
        setPixPayload(payload);
        QRCode.toDataURL(payload)
          .then(url => setPixQrCode(url))
          .catch(err => console.error('Failed to generate QR Code', err));
      }
    } else {
      setPixQrCode('');
      setPixPayload('');
    }
  }, [paymentAmount, paymentClient, isPaymentModalOpen, settings]);

  const handleCopyPixCode = () => {
    if (!pixPayload) return;
    navigator.clipboard.writeText(pixPayload);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleSendPixCharge = async () => {
    if (!paymentClient || !pixPayload) return;
    const message = `Olá ${paymentClient.name}! Para facilitar, segue o código Pix Copia e Cola para o pagamento de R$${paymentAmount}:\n\n${pixPayload}`;
    setTargetClient(paymentClient);
    setPromotionMessage(message);
    setIsModalOpen(true); // Open the generic message modal to send the charge
  };

  const handleSendPromotion = async () => {
    if (!targetClient) return;

    const message = promotionMessage;

    if (targetClient === 'all') {
      // A funcionalidade de "copiar para todos" permanece a mesma
      navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset copied state after 2s
    } else if (targetClient === 'selected') {
      setIsSending(true);
      setSendResult(null);
      const selectedClientObjects = clients.filter(c => selectedClients.has(c.id));
      
      let successCount = 0;
      let failCount = 0;
      let lastErrorMessage = '';

      try {
        // Envia as mensagens e contabiliza sucessos e falhas individualmente
        const results = await Promise.all(selectedClientObjects.map(async (client) => {
          try {
            const phone = `+55${client.phone.replace(/\D/g, '')}`;
            await api.sendWhatsappMessage({ to: phone, message });
            return { success: true };
          } catch (error: any) {
            return { success: false, message: error.message };
          }
        }));

        results.forEach(res => {
          if (res.success) successCount++;
          else {
            failCount++;
            lastErrorMessage = res.message || 'Erro desconhecido';
          }
        });

        if (failCount === 0) {
          setSendResult({ success: true, message: `Mensagens enviadas para ${successCount} clientes.` });
          setTimeout(() => {
              handleCloseModal();
          }, 2000);
        } else {
          // Se houve falhas, mostra um resumo
          const msg = successCount === 0 
            ? `Falha no envio: ${lastErrorMessage}` 
            : `${successCount} enviadas. ${failCount} falharam.`;
          setSendResult({ success: false, message: msg });
        }
      } catch (error: any) {
          setSendResult({ success: false, message: `Erro sistêmico: ${error.message}` });
      } finally {
          setIsSending(false);
      }
    } else {
      setIsSending(true);
      setSendResult(null);
      try {
        // Adiciona o código do país (55 para Brasil) e remove caracteres não numéricos
        const phone = `+55${targetClient.phone.replace(/\D/g, '')}`;
        
        const result = await api.sendWhatsappMessage({ to: phone, message });
        setSendResult(result);
        // Fecha o modal após 2 segundos para mostrar a mensagem de sucesso
        setTimeout(() => {
          handleCloseModal();
        }, 2000);
      } catch (error: any) {
        setSendResult({ success: false, message: error.message });
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleSelectClient = (clientId: number) => {
    setSelectedClients(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(clientId)) {
            newSelection.delete(clientId);
        } else {
            newSelection.add(clientId);
        }
        return newSelection;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedClients(new Set(filteredClients.map(c => c.id)));
      } else {
          setSelectedClients(new Set());
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Heart /> Clientes</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleOpenRegisterModal} 
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <Plus size={18} />
            <span>Cadastrar Cliente</span>
          </button>
          <button 
            onClick={() => handleOpenModal('selected')} 
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:bg-zinc-400 disabled:cursor-not-allowed"
            disabled={selectedClients.size === 0}
          >
            <Send size={18} />
            <span>Enviar para ({selectedClients.size})</span>
          </button>
          <button onClick={() => handleOpenModal('all')} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors">
            <MessageSquare size={18} />
            <span>Promoção em Massa</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
        <input
          type="text"
          placeholder="Buscar cliente por nome..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
        />
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50">
              <tr>
                <th scope="col" className="p-4">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-black bg-gray-100 border-gray-300 rounded focus:ring-black"
                    onChange={handleSelectAll}
                    checked={filteredClients.length > 0 && selectedClients.size === filteredClients.length}
                    disabled={filteredClients.length === 0}
                  />
                </th>
                <th scope="col" className="px-6 py-3">Nome</th>
                <th scope="col" className="px-6 py-3">Telefone</th>
                <th scope="col" className="px-6 py-3 text-center">Agendamentos</th>
                <th scope="col" className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center p-8 text-zinc-400">Carregando...</td></tr>
              ) : filteredClients.length === 0 ? (
                <tr><td colSpan={5} className="text-center p-8 text-zinc-400">{searchTerm ? `Nenhum cliente encontrado para "${searchTerm}".` : 'Nenhum cliente cadastrado.'}</td></tr>
              ) : (
                filteredClients.map(client => (
                  <tr key={client.id} className="bg-white border-b last:border-0">
                    <td className="p-4">
                      <input 
                          type="checkbox" 
                          className="w-4 h-4 text-black bg-gray-100 border-gray-300 rounded focus:ring-black"
                          checked={selectedClients.has(client.id)}
                          onChange={() => handleSelectClient(client.id)}
                      />
                    </td>
                    <th scope="row" className="px-6 py-4 font-bold text-zinc-900 whitespace-nowrap">{client.name}</th>
                    <td className="px-6 py-4 text-zinc-600">{client.phone}</td>
                    <td className="px-6 py-4 text-zinc-600 text-center">{client.appointment_count}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <button onClick={() => handleOpenEditModal(client)} className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg" title="Editar">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleOpenPaymentModal(client)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Gerar Cobrança / QR Code">
                          <FileText size={18} />
                        </button>
                        <button onClick={() => handleOpenModal(client)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Enviar Mensagem">
                          <MessageSquare size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <MessageSquare />
                {targetClient === 'all' ? 'Enviar Promoção em Massa' 
                  : targetClient === 'selected' ? `Enviar para ${selectedClients.size} clientes`
                  : `Enviar para ${targetClient?.name}`}
              </h3>
              <p className="text-sm text-zinc-500 mb-6">
                {targetClient === 'all' 
                  ? 'A mensagem será copiada. Cole em sua lista de transmissão ou grupo do WhatsApp.'
                  : 'A mensagem será enviada diretamente para o(s) cliente(s) via WhatsApp.'
                }
              </p>
              <textarea value={promotionMessage} onChange={(e) => setPromotionMessage(e.target.value)} rows={5} className="w-full p-4 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" placeholder="Digite sua mensagem aqui..." />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors" disabled={isSending}>Cancelar</button>
                <button type="button" onClick={handleSendPromotion} className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:bg-zinc-400" disabled={isSending}>
                  {isSending ? (
                    <><Loader size={18} className="animate-spin" /> Enviando...</>
                  ) : targetClient === 'all' ? ( // Lógica para 'all' permanece como copiar
                    copied ? <><Check size={18} /> Copiado!</> : <><Copy size={18} /> Copiar Mensagem</>
                  ) : (
                    <><Send size={18} /> Enviar via WhatsApp</>
                  )}
                </button>
              </div>
              {sendResult && (
                <div className={`mt-4 text-sm p-3 rounded-lg text-center ${sendResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {sendResult.message}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Edit size={20} /> Editar Cliente</h3>
              <form onSubmit={handleUpdateClient} className="space-y-4">
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Nome</label><input required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Telefone</label><input required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: phoneMask(e.target.value)})} /></div>
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">CEP</label><input required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={editFormData.cep} onChange={e => setEditFormData({...editFormData, cep: cepMask(e.target.value)})} /></div>
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Data de Nascimento</label><input type="date" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={editFormData.birth_date} onChange={e => setEditFormData({...editFormData, birth_date: e.target.value})} /></div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={handleCloseEditModal} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors">Salvar Alterações</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPaymentModalOpen && paymentClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><QrCode /> Gerar Cobrança para {paymentClient.name}</h3>
              <p className="text-sm text-zinc-500 mb-6">Insira o valor para gerar o QR Code e o código Pix.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Valor (R$)</label>
                  <input required type="number" step="0.01" placeholder="0,00" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                </div>

                {pixQrCode && (
                  <div className="text-center p-4 bg-zinc-50 rounded-lg border">
                    <img src={pixQrCode} alt="Pix QR Code" className="w-48 h-48 mx-auto" />
                    <button onClick={handleCopyPixCode} className="mt-4 w-full text-sm flex items-center justify-center gap-2 bg-zinc-200/80 px-4 py-2 rounded-lg hover:bg-zinc-300/80 transition-colors">
                      {copiedPix ? <><Check size={16} /> Copiado!</> : <><Copy size={16} /> Copiar Código</>}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6">
                <button type="button" onClick={handleClosePaymentModal} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
                  Fechar
                </button>
                <button 
                  type="button" 
                  onClick={handleSendPixCharge}
                  disabled={!pixPayload}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:bg-zinc-400"
                >
                  <Send size={18} /> Enviar Cobrança
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Plus /> Cadastrar Novo Cliente</h3>
              <form onSubmit={handleRegisterClient} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Nome</label>
                  <input className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-black outline-none ${registerFormErrors.name ? 'border-rose-500' : 'border-zinc-200'}`} value={registerFormData.name} onChange={e => setRegisterFormData({...registerFormData, name: e.target.value})} />
                  {registerFormErrors.name && <p className="text-rose-500 text-xs mt-1">{registerFormErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">E-mail (Opcional)</label>
                  <input type="email" className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-black outline-none ${registerFormErrors.email ? 'border-rose-500' : 'border-zinc-200'}`} value={registerFormData.email} onChange={e => setRegisterFormData({...registerFormData, email: e.target.value})} />
                  {registerFormErrors.email && <p className="text-rose-500 text-xs mt-1">{registerFormErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Telefone</label>
                  <input className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-black outline-none ${registerFormErrors.phone ? 'border-rose-500' : 'border-zinc-200'}`} value={registerFormData.phone} onChange={e => setRegisterFormData({...registerFormData, phone: phoneMask(e.target.value)})} />
                  {registerFormErrors.phone && <p className="text-rose-500 text-xs mt-1">{registerFormErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">CEP</label>
                  <input className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-black outline-none ${registerFormErrors.cep ? 'border-rose-500' : 'border-zinc-200'}`} value={registerFormData.cep} onChange={e => setRegisterFormData({...registerFormData, cep: cepMask(e.target.value)})} />
                  {registerFormErrors.cep && <p className="text-rose-500 text-xs mt-1">{registerFormErrors.cep}</p>}
                </div>
                <div><label className="block text-sm font-medium text-zinc-700 mb-1">Data de Nascimento</label><input type="date" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={registerFormData.birth_date} onChange={e => setRegisterFormData({...registerFormData, birth_date: e.target.value})} /></div>
                
                {registerFormErrors.general && <p className="text-rose-500 text-sm text-center bg-rose-50 p-3 rounded-lg">{registerFormErrors.general}</p>}

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={handleCloseRegisterModal} className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-zinc-800 transition-colors">Cadastrar Cliente</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};