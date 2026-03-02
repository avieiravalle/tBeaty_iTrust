import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { User, ArrowLeft, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { api } from './services/api.ts';
import { phoneMask } from './masks.ts';
import { Client } from './types.ts';

interface ClientLoginViewProps {
  onBack: () => void;
  onLoginSuccess: (client: Client) => void;
  onNavigateToRegister: () => void;
}

export const ClientLoginView = ({ onBack, onLoginSuccess, onNavigateToRegister }: ClientLoginViewProps) => {
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const client = await api.loginClient({
        ...formData,
        phone: formData.phone.replace(/\D/g, ''),
      });
      onLoginSuccess(client);
    } catch (err: any) {
      setError(err.message);
    }
  }, [formData, onLoginSuccess]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 relative">
      <button 
        onClick={onBack}
        className="absolute top-6 left-6 p-3 rounded-2xl bg-white border border-zinc-100 text-zinc-500 hover:text-black hover:bg-zinc-50 transition-all shadow-sm"
        aria-label="Voltar"
      >
        <ArrowLeft size={20} />
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 border border-zinc-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
            <User size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Acessar Conta</h1>
          <p className="text-zinc-500 mt-2">Bem-vindo(a) de volta!</p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm mb-6 flex items-center gap-2 border border-rose-100">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Telefone</label>
            <input required type="tel" placeholder="(XX) XXXXX-XXXX" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all" value={formData.phone} onChange={e => setFormData({ ...formData, phone: phoneMask(e.target.value) })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
            <div className="relative">
              <input required type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all pr-10" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-black">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 mt-4">
            Entrar
          </button>

          <p className="text-center text-sm text-zinc-500 pt-4">
            Não tem uma conta?{' '}
            <button type="button" onClick={onNavigateToRegister} className="font-bold text-black hover:underline">Cadastre-se</button>
          </p>
        </form>
      </motion.div>
    </div>
  );
};