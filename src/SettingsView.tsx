import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { Card } from './UI';
import { Image as ImageIcon, Palette, Save, Loader, Smartphone, Check } from 'lucide-react';
import { phoneMask } from './masks';

interface SettingsViewProps {
  storeId: number;
  storeCode: string;
}

export const SettingsView = ({ storeId, storeCode }: SettingsViewProps) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{ status: string, qrCode: string | null }>({ status: 'DISCONNECTED', qrCode: null });

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getSettings(storeId);
      setSettings(data);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      alert('Falha ao carregar configurações.');
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  const fetchWhatsappStatus = useCallback(async () => {
    try {
      const data = await api.getWhatsappStatus();
      setWhatsappStatus(data);
    } catch (error) {
      console.error("Failed to fetch whatsapp status", error);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    const interval = setInterval(fetchWhatsappStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchSettings, fetchWhatsappStatus]);

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (key: string, file: File | null) => {
    if (!file) return;

    setIsSaving(true);
    try {
      const { url } = await api.uploadImage(file);
      handleSettingChange(key, url);
    } catch (error: any) {
      console.error(`Failed to upload ${key}:`, error);
      alert(`Erro ao enviar imagem: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
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
  };

  const handleWhatsappLogout = async () => {
    if (!window.confirm("Tem certeza que deseja desconectar o WhatsApp?")) return;
    try {
      await api.logoutWhatsapp();
      fetchWhatsappStatus();
    } catch (error) {
      alert("Erro ao desconectar");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-10"><Loader className="animate-spin" /> Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Configurações da Loja</h2>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors disabled:bg-zinc-400"
        >
          {isSaving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
          <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
        </button>
      </div>

      <Card>
        <h3 className="text-lg font-bold mb-4">Identidade Visual</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg bg-zinc-100 flex items-center justify-center overflow-hidden border">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <ImageIcon className="text-zinc-400" />
                )}
              </div>
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={(e) => handleFileUpload('logo_url', e.target.files ? e.target.files[0] : null)}
                className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
              />
            </div>
          </div>
          {/* Background Image Upload */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Imagem de Fundo (Login)</label>
             <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg bg-zinc-100 flex items-center justify-center overflow-hidden border">
                {settings.background_url ? (
                  <img src={settings.background_url} alt="Background" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="text-zinc-400" />
                )}
              </div>
              <input 
                type="file" 
                accept="image/png, image/jpeg"
                onChange={(e) => handleFileUpload('background_url', e.target.files ? e.target.files[0] : null)}
                className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold mb-4">Cores do Tema</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <label htmlFor="primary_color" className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2"><Palette size={16} /> Cor Primária</label>
            <input 
              id="primary_color"
              type="color" 
              value={settings.primary_color || '#000000'}
              onChange={(e) => handleSettingChange('primary_color', e.target.value)}
              className="w-full h-10 p-1 bg-white border border-zinc-200 rounded-lg cursor-pointer"
            />
          </div>
           <div>
            <label htmlFor="secondary_color" className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2"><Palette size={16} /> Cor Secundária</label>
            <input 
              id="secondary_color"
              type="color" 
              value={settings.secondary_color || '#6366f1'}
              onChange={(e) => handleSettingChange('secondary_color', e.target.value)}
              className="w-full h-10 p-1 bg-white border border-zinc-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </Card>
      
      <Card>
        <h3 className="text-lg font-bold mb-4">Informações Gerais</h3>
         <div className="space-y-4">
            <div>
              <label htmlFor="salon_name" className="block text-sm font-medium text-zinc-700 mb-1">Nome do Salão</label>
              <input 
                id="salon_name"
                type="text" 
                value={settings.salon_name || ''}
                onChange={(e) => handleSettingChange('salon_name', e.target.value)}
                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
              />
            </div>
            <div>
              <label htmlFor="whatsapp_number" className="block text-sm font-medium text-zinc-700 mb-1">WhatsApp para Pagamento (Pix)</label>
              <input 
                id="whatsapp_number"
                type="text" 
                value={settings.whatsapp_number || ''}
                onChange={(e) => handleSettingChange('whatsapp_number', phoneMask(e.target.value))}
                placeholder="(00) 00000-0000"
                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
              />
              <p className="text-xs text-zinc-500 mt-1">Este número será usado para gerar o QR Code de pagamento.</p>
            </div>
            <div>
              <label htmlFor="monthly_goal" className="block text-sm font-medium text-zinc-700 mb-1">Meta Mensal de Faturamento (R$)</label>
              <input
                id="monthly_goal"
                type="number"
                value={settings.monthly_goal || ''}
                onChange={(e) => handleSettingChange('monthly_goal', e.target.value)}
                className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="opening_time" className="block text-sm font-medium text-zinc-700 mb-1">Horário de Abertura</label>
                    <input
                        id="opening_time"
                        type="time"
                        value={settings.opening_time || '09:00'}
                        onChange={(e) => handleSettingChange('opening_time', e.target.value)}
                        className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                    />
                </div>
                <div>
                    <label htmlFor="closing_time" className="block text-sm font-medium text-zinc-700 mb-1">Horário de Fechamento</label>
                    <input
                        id="closing_time"
                        type="time"
                        value={settings.closing_time || '18:00'}
                        onChange={(e) => handleSettingChange('closing_time', e.target.value)}
                        className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                    />
                </div>
            </div>
            <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-xl p-4 text-center">
                <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-1">Código da Loja</p>
                <p className="text-xl font-mono font-bold text-black tracking-wider">{storeCode}</p>
            </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Smartphone size={20} /> Integração WhatsApp</h3>
        <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 rounded-xl border border-zinc-100">
          {whatsappStatus.status === 'READY' ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Check size={32} />
              </div>
              <div>
                <h4 className="font-bold text-emerald-700">WhatsApp Conectado</h4>
                <p className="text-sm text-zinc-500">O sistema está pronto para enviar mensagens.</p>
              </div>
              <button onClick={handleWhatsappLogout} className="text-sm text-rose-600 hover:underline">
                Desconectar
              </button>
            </div>
          ) : whatsappStatus.status === 'QR_RECEIVED' && whatsappStatus.qrCode ? (
            <div className="text-center space-y-4">
              <h4 className="font-bold text-zinc-800">Escaneie o QR Code</h4>
              <p className="text-sm text-zinc-500">Abra o WhatsApp no seu celular &gt; Aparelhos conectados &gt; Conectar aparelho</p>
              <div className="bg-white p-4 rounded-xl shadow-sm inline-block">
                <img src={whatsappStatus.qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <Loader className="animate-spin mx-auto text-zinc-400" size={32} />
              <p className="text-sm text-zinc-500">Iniciando serviço do WhatsApp...</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};