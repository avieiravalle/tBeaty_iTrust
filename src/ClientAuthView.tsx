import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Scissors, AlertTriangle, UserPlus } from 'lucide-react';
import { api } from './services/api.ts';
import { Client, Store } from './types.ts';
import { phoneMask, cepMask } from './masks.ts';

interface ClientAuthViewProps {
  onLogin: (client: Client) => void;
  initialRegister?: boolean;
}

export const ClientAuthView = ({ onLogin, initialRegister = false }: ClientAuthViewProps) => {
  const [isLogin, setIsLogin] = useState(!initialRegister);
  const [stores, setStores] = useState<Store[]>([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    cep: '',
    birth_date: '',
    storeId: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLogin && stores.length === 0) {
      api.getStores().then(setStores).catch(() => setError('Não foi possível carregar a lista de salões.'));
    }
  }, [isLogin, stores.length]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
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
          storeId: parseInt(formData.storeId),
        });
        // After successful registration, log the client in
        const loggedInClient = await api.loginClient({ phone: client.phone, password: formData.password });
        onLogin(loggedInClient);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [isLogin, formData, onLogin]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 border border-zinc-100"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
            {isLogin ? <Scissors size={32} /> : <UserPlus size={32} />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">tBeauty</h1>
          <p className="text-zinc-500 mt-2">{isLogin ? 'Acesse sua conta' : 'Crie sua conta de cliente'}</p>
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
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nome Completo</label>
                <input required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">E-mail</label>
                <input required type="email" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Telefone (WhatsApp)</label>
            <input required placeholder="(00) 00000-0000" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.phone} onChange={e => setFormData({ ...formData, phone: phoneMask(e.target.value) })} />
          </div>
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">CEP</label>
                <input required placeholder="00000-000" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.cep} onChange={e => setFormData({ ...formData, cep: cepMask(e.target.value) })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Data de Nascimento</label>
                <input required type="date" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.birth_date} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Salão de Preferência</label>
                <select required className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white" value={formData.storeId} onChange={e => setFormData({ ...formData, storeId: e.target.value })}>
                  <option value="">Selecione um salão</option>
                  {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
            <input required type="password" className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
          </div>
          <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 mt-4">
            {isLogin ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-medium text-zinc-500 hover:text-black transition-colors">
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};