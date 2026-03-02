import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Scissors, CheckCircle2, ChevronRight, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { api } from './services/api.ts';
import { User } from './types.ts';

interface AuthViewProps {
  onLogin: (user: User) => void;
  initialRegister?: boolean;
}

export const AuthView = ({ onLogin, initialRegister = false }: AuthViewProps) => {
  const [isLogin, setIsLogin] = useState(!initialRegister);
  const [role, setRole] = useState<'MANAGER' | 'COLLABORATOR'>('MANAGER');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userName: '',
    storeName: '',
    storeCode: ''
  });
  const [error, setError] = useState('');
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLogin) {
      if (role === 'MANAGER' && !formData.storeCode) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, storeCode: code }));
      } else if (role === 'COLLABORATOR') {
        setFormData(prev => ({ ...prev, storeCode: '' }));
      }
    }
  }, [isLogin, role]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        const user = await api.login({ email: formData.email, password: formData.password });
        onLogin(user);
      } else {
        if (role === 'MANAGER') {
          const result = await api.registerStore({
            storeName: formData.storeName,
            userName: formData.userName,
            email: formData.email,
            password: formData.password,
            storeCode: formData.storeCode
          });
          setSuccessCode(result.storeCode);
        } else {
          await api.registerCollaborator({
            storeCode: formData.storeCode,
            userName: formData.userName,
            email: formData.email,
            password: formData.password
          });
          const user = await api.login({ email: formData.email, password: formData.password });
          onLogin(user);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [isLogin, role, formData, onLogin]);

  const handleContinue = useCallback(async () => {
    try {
      const user = await api.login({ email: formData.email, password: formData.password });
      onLogin(user);
    } catch (err: any) {
      setError(err.message);
    }
  }, [formData.email, formData.password, onLogin]);

  if (successCode) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 border border-zinc-100 text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Loja Criada com Sucesso!</h2>
          <p className="text-zinc-500 mb-8">Compartilhe o código abaixo com seus colaboradores para que eles possam acessar sua loja.</p>
          
          <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl p-6 mb-8">
            <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2">Código da sua Loja</p>
            <p className="text-4xl font-mono font-bold text-black tracking-wider">{successCode}</p>
          </div>

          <button
            onClick={handleContinue}
            className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2"
          >
            <span>Acessar o Sistema</span>
            <ChevronRight size={20} />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 border border-zinc-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
            <Scissors size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">tBeauty</h1>
          <p className="text-zinc-500 mt-2">{isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta no sistema'}</p>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm mb-6 flex items-center gap-2 border border-rose-100">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="flex bg-zinc-100 p-1 rounded-xl mb-4">
                <button type="button" onClick={() => setRole('MANAGER')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${role === 'MANAGER' ? 'bg-white shadow-sm text-black' : 'text-zinc-500'}`}>Gestor</button>
                <button type="button" onClick={() => setRole('COLLABORATOR')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${role === 'COLLABORATOR' ? 'bg-white shadow-sm text-black' : 'text-zinc-500'}`}>Colaborador</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Seu Nome</label>
                <input required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all" value={formData.userName} onChange={e => setFormData({ ...formData, userName: e.target.value })} />
              </div>
              {role === 'MANAGER' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Nome do Salão</label>
                    <input required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all" value={formData.storeName} onChange={e => setFormData({ ...formData, storeName: e.target.value })} />
                  </div>
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Código da sua Loja</p>
                    <p className="text-xl font-mono font-bold text-black">{formData.storeCode}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Código da Loja</label>
                  <input required placeholder="Ex: GLOW123" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all" value={formData.storeCode} onChange={e => setFormData({ ...formData, storeCode: e.target.value.toUpperCase() })} />
                </div>
              )}
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">E-mail</label>
            <input required type="email" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
            <div className="relative">
              <input required type={showPassword ? 'text' : 'password'} className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all pr-10" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-black">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 mt-4">{isLogin ? 'Entrar' : 'Registrar'}</button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-medium text-zinc-500 hover:text-black transition-colors">
            {isLogin ? 'Não tem uma conta? Registre-se' : 'Já tem uma conta? Entre'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};