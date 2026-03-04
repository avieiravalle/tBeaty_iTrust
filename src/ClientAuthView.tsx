import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Scissors, AlertTriangle, UserPlus, CheckCircle2 } from 'lucide-react';
import { api } from './services/api.ts';
import { Client } from './types.ts';
import { phoneMask, cepMask } from './masks.ts';

interface ClientAuthViewProps {
  onLogin: (client: Client) => void;
  initialRegister?: boolean;
  onBack: () => void;
}

export const ClientAuthView = ({ onLogin, initialRegister = false, onBack }: ClientAuthViewProps) => {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>(initialRegister ? 'register' : 'login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    cep: '',
    birth_date: '',
  });
  const [error, setError] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (view === 'login') {
        const client = await api.loginClient({ phone: formData.phone, password: formData.password });
        onLogin(client);
      } else {
        const client = await api.registerClient({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cep: formData.cep,
          birth_date: formData.birth_date,
          password: formData.password,
        });
        // After successful registration, log the client in
        const loggedInClient = await api.loginClient({ phone: client.phone, password: formData.password });
        onLogin(loggedInClient);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [view, formData, onLogin]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotPasswordMessage('');
    try {
      const result = await api.requestClientPasswordReset(formData.phone);
      setForgotPasswordMessage(result.message);
    } catch (err: any) {
      // We show a generic success message even on error to prevent user enumeration
      setForgotPasswordMessage("Se uma conta com este telefone existir, instruções para redefinir a senha foram enviadas.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8 sm:p-10 border border-zinc-200/80"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-md transition-transform hover:scale-105">
            {view === 'login' ? <Scissors size={32} /> : <UserPlus size={32} />}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-black">iTrust</h1>
          <p className="text-zinc-500 mt-2">{view === 'login' ? 'Acesse sua conta' : view === 'register' ? 'Crie sua conta de cliente' : 'Recuperar Senha'}</p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm mb-6 flex items-center gap-2 border border-rose-100">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {view === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            {forgotPasswordMessage ? (
              <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm flex items-center gap-2 border border-emerald-100">
                <CheckCircle2 size={16} />
                {forgotPasswordMessage}
              </div>
            ) : (
              <>
                <p className="text-sm text-zinc-600 text-center">Digite seu número de telefone para receber as instruções de redefinição de senha.</p>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Telefone (WhatsApp)</label>
                  <input required placeholder="(00) 00000-0000" className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none" value={formData.phone} onChange={e => setFormData({ ...formData, phone: phoneMask(e.target.value) })} />
                </div>
                <button type="submit" className="w-full bg-rose-500 text-white py-3 rounded-xl font-bold hover:bg-rose-600 transition-all shadow-md shadow-rose-500/20 mt-4">Enviar</button>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {view === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Nome Completo</label>
                  <input required className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">E-mail</label>
                  <input required type="email" className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Telefone (WhatsApp)</label>
              <input required placeholder="(00) 00000-0000" className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none" value={formData.phone} onChange={e => setFormData({ ...formData, phone: phoneMask(e.target.value) })} />
            </div>
            {view === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">CEP</label>
                  <input required placeholder="00000-000" className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none" value={formData.cep} onChange={e => setFormData({ ...formData, cep: cepMask(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Data de Nascimento</label>
                  <input required type="date" className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none" value={formData.birth_date} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} />
                </div>
              </>
            )}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-zinc-700">Senha</label>
                {view === 'login' && (
                  <button type="button" onClick={() => setView('forgot')} className="text-xs font-medium text-zinc-500 hover:text-rose-500">Esqueci minha senha</button>
                )}
              </div>
              <input required type="password" className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
            </div>
            <button type="submit" className="w-full bg-rose-500 text-white py-3 rounded-xl font-bold hover:bg-rose-600 transition-all shadow-md shadow-rose-500/20 mt-6">
              {view === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center space-y-2">
          <button onClick={() => setView(view === 'login' ? 'register' : 'login')} className="text-sm font-medium text-zinc-500 hover:text-rose-500 transition-colors">
            {view === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
          </button>
          <div>
            <button onClick={onBack} className="text-xs font-medium text-zinc-400 hover:text-zinc-800 transition-colors">
              Acessar como Gestor/Admin
            </button>
          </div>
        </div>
      </motion.div>
      <footer className="absolute bottom-4 text-center text-xs text-zinc-400">
        iTrust - Gestão inteligente, confiança absoluta
      </footer>
    </div>
  );
};