import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api.ts';
import { Card } from './UI.tsx';
import { Save, Palette, KeyRound, Target } from 'lucide-react';

interface SettingsViewProps {
  storeId: number;
}

export const SettingsView = ({ storeId }: SettingsViewProps) => {
  const [settings, setSettings] = useState({
    pix_key: '',
    primary_color: '#000000',
    logo_url: '',
    monthly_goal: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const data = await api.getSettings(storeId);
        setSettings(prev => ({
          ...prev,
          ...data,
        }));
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [storeId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSettings(storeId, settings);
      alert('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error("Failed to save settings:", error);
      alert(`Erro ao salvar configurações: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [storeId, settings]);

  if (isLoading) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Configurações da Loja</h2>
      </div>

      <form onSubmit={handleSave}>
        <div className="space-y-8 max-w-3xl">
          <Card>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><KeyRound size={20} /> Pagamentos</h3>
            <div>
              <label htmlFor="pix_key" className="block text-sm font-medium text-zinc-700 mb-1">Chave PIX</label>
              <input id="pix_key" name="pix_key" type="text" value={settings.pix_key} onChange={handleInputChange} placeholder="E-mail, CPF/CNPJ, Telefone ou Chave Aleatória" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" />
              <p className="text-xs text-zinc-500 mt-2">Esta chave será usada para gerar o QR Code de pagamento do sinal.</p>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Palette size={20} /> Aparência</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="primary_color" className="block text-sm font-medium text-zinc-700 mb-1">Cor Principal</label>
                <div className="relative">
                  <input id="primary_color" name="primary_color" type="text" value={settings.primary_color} onChange={handleInputChange} className="w-full pl-12 pr-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" />
                  <input type="color" value={settings.primary_color} onChange={handleInputChange} name="primary_color" className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 border-none cursor-pointer bg-transparent" style={{ backgroundColor: 'transparent' }} />
                </div>
                <p className="text-xs text-zinc-500 mt-2">Define a cor principal dos botões e links no app do cliente.</p>
              </div>
              <div>
                <label htmlFor="logo_url" className="block text-sm font-medium text-zinc-700 mb-1">URL da Logo</label>
                <input id="logo_url" name="logo_url" type="url" value={settings.logo_url} onChange={handleInputChange} placeholder="https://exemplo.com/logo.png" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" />
                <p className="text-xs text-zinc-500 mt-2">Link para a imagem da sua logo. Será exibida no app do cliente.</p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Target size={20} /> Metas</h3>
            <div>
              <label htmlFor="monthly_goal" className="block text-sm font-medium text-zinc-700 mb-1">Meta de Faturamento Mensal (R$)</label>
              <input id="monthly_goal" name="monthly_goal" type="number" step="100" value={settings.monthly_goal} onChange={handleInputChange} placeholder="10000" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" />
            </div>
          </Card>

          <div className="flex justify-end">
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl hover:bg-zinc-800 transition-colors disabled:bg-zinc-400">
              <Save size={18} />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};