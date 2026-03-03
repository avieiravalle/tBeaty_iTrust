import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api.ts';
import { Client } from './types.ts';
import { Card } from './UI.tsx';
import { Users, Gift, Loader, Edit, FileText, MessageSquare } from 'lucide-react';

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
                : 'text-zinc-500 hover:text-black'
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
                    <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-4"><button className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg" title="Editar"><Edit size={18} /></button><button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Gerar Cobrança"><FileText size={18} /></button><button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Enviar Mensagem"><MessageSquare size={18} /></button></div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};