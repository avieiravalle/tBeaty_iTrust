import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { Scissors, CheckCircle2, ChevronRight, AlertTriangle, Eye, EyeOff, Mail, Star, Check, QrCode, Copy, Loader } from 'lucide-react';
import { api } from './services/api.ts';
import { User } from './types.ts';
import { generatePixPayload } from './pix.ts';
import QRCode from 'qrcode';

interface AuthViewProps {
  onLogin: (user: User) => void;
  initialRegister?: boolean;
}

const PlanCard = ({ title, price, features, onSelect, recommended = false }: { title: string, price: string, features: string[], onSelect: () => void, recommended?: boolean }) => (
  <div className={`relative border-2 rounded-2xl p-8 text-center transition-all ${recommended ? 'border-rose-300 bg-rose-50/50' : 'border-zinc-200 hover:border-zinc-300'}`}>
    {recommended && <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-3 py-1 text-xs font-bold rounded-full uppercase">Recomendado</div>}
    <h3 className="text-xl font-bold">{title}</h3>
    <p className="text-4xl font-bold my-4">R$ {price}<span className="text-base font-normal text-zinc-500">/mês</span></p>
    <ul className="space-y-3 text-sm text-zinc-600 mb-8">
      {features.map((feat, i) => <li key={i} className="flex items-center gap-2 justify-center"><Check size={16} className="text-emerald-500" /> {feat}</li>)}
    </ul>
    <button onClick={onSelect} className={`w-full font-bold py-3 rounded-xl transition-colors ${recommended ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-black text-white hover:bg-zinc-800'}`}>
      Selecionar Plano
    </button>
  </div>
);

const PlanStep = ({ storeName, onPlanSelect }: { storeName: string, onPlanSelect: (planId: string) => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
    <h2 className="text-2xl font-bold mb-2">Quase lá, {storeName}!</h2>
    <p className="text-zinc-500 mb-8">Escolha o plano que melhor se adapta ao seu negócio.</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <PlanCard 
        title="Básico" 
        price="49,90" 
        features={['1 Gestor', 'Até 4 Colaboradores']}
        onSelect={() => onPlanSelect('BASIC')}
      />
      <PlanCard 
        title="Intermediário" 
        price="99,90" 
        features={['1 Gestor', 'Até 9 Colaboradores']}
        onSelect={() => onPlanSelect('INTERMEDIATE')}
        recommended
      />
      <PlanCard 
        title="Avançado" 
        price="159,90" 
        features={['Até 2 Gestores', 'Colaboradores Ilimitados']}
        onSelect={() => onPlanSelect('ADVANCED')}
      />
    </div>
  </motion.div>
);

const PaymentStep = ({ details, onBackToLogin }: { details: { price: number, pixKey: string, storeName: string }, onBackToLogin: () => void }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [pixCode, setPixCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const payload = generatePixPayload(details.pixKey, 'tBeauty Inc.', 'SAO PAULO', details.price, `PLAN${Date.now()}`);
    setPixCode(payload);
    QRCode.toDataURL(payload).then(setQrCodeUrl).catch(console.error);
  }, [details]);

  const handleCopy = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} /></div>
      <h2 className="text-2xl font-bold mb-2">Pagamento Pendente</h2>
      <p className="text-zinc-500 mb-8 max-w-md mx-auto">Para ativar sua conta, realize o pagamento de <strong>R$ {details.price.toFixed(2).replace('.', ',')}</strong> via Pix. Sua conta será liberada após a confirmação do administrador.</p>
      <div className="p-4 bg-zinc-100 rounded-2xl border border-zinc-200 inline-block">
        {qrCodeUrl ? <img src={qrCodeUrl} alt="PIX QR Code" className="w-48 h-48 mx-auto" /> : <Loader className="animate-spin" />}
      </div>
      <button onClick={handleCopy} className="mt-6 w-full max-w-xs mx-auto text-sm flex items-center justify-center gap-2 bg-zinc-200 px-4 py-3 rounded-xl hover:bg-zinc-300 transition-colors">
        {copied ? <><Check size={16} /> Copiado!</> : <><Copy size={16} /> Copiar Código Pix</>}
      </button>
      <button onClick={onBackToLogin} className="mt-4 w-full max-w-xs mx-auto text-sm font-bold text-white bg-black px-4 py-3 rounded-xl hover:bg-zinc-800 transition-colors">
        Voltar para o Login
      </button>
    </motion.div>
  );
};

export const AuthView = ({ onLogin, initialRegister = false }: AuthViewProps) => {
  const [step, setStep] = useState<'login' | 'register' | 'forgot' | 'selectPlan' | 'payment'>(initialRegister ? 'register' : 'login');
  const [role, setRole] = useState<'MANAGER' | 'COLLABORATOR'>('MANAGER');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userName: '',
    storeName: '',
    storeCode: ''
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registrationData, setRegistrationData] = useState<{ storeId: number, storeName: string } | null>(null);
  const [planDetails, setPlanDetails] = useState<{ price: number, pixKey: string, storeName: string } | null>(null);

  useEffect(() => {
    if (step === 'register') {
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
  }, [step, role]);

  useEffect(() => {
    setError('');
    setSuccessMessage('');
  }, [step]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    try {
      if (step === 'login') {
        const user = await api.login({ email: formData.email, password: formData.password });
        onLogin(user);
      } else {
        if (role === 'MANAGER') {
          const { storeId } = await api.registerStore({
            storeName: formData.storeName,
            userName: formData.userName,
            email: formData.email,
            password: formData.password,
            storeCode: formData.storeCode
          });
          setRegistrationData({ storeId, storeName: formData.storeName });
          setStep('selectPlan');
        } else {
          await api.registerCollaborator({
            storeCode: formData.storeCode,
            userName: formData.userName,
            email: formData.email,
            password: formData.password
          });
          setSuccessMessage('Cadastro realizado com sucesso! Você poderá entrar no sistema após a ativação da loja pelo seu gestor.');
          setStep('login');
          setFormData(prev => ({ ...prev, userName: '', email: '', password: '' }));
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [step, role, formData, onLogin]);

  const handlePlanSelect = useCallback(async (planId: string) => {
    if (!registrationData) return;
    setError('');
    try {
      const result = await api.selectPlan(registrationData.storeId, planId);
      setPlanDetails(result);
      setStep('payment');
    } catch (err: any) {
      setError(err.message);
    }
  }, [registrationData]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotPasswordMessage('');
    try {
      const result = await api.requestPasswordReset(formData.email);
      setForgotPasswordMessage(result.message);
    } catch (err: any) {
      // We show a generic success message even on error to prevent email enumeration
      setForgotPasswordMessage("Se uma conta com este e-mail existir, um link para redefinição de senha foi enviado.");
    }
  };

  const handleBackToLogin = () => {
    setStep('login');
    setRegistrationData(null);
    setPlanDetails(null);
    setFormData({
      email: '',
      password: '',
      userName: '',
      storeName: '',
      storeCode: ''
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-lg w-full max-w-4xl p-8 sm:p-12 border border-zinc-200/80"
      >
        {step !== 'selectPlan' && step !== 'payment' && (
          <div className="text-center mb-8 max-w-md mx-auto">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-md">
              <Scissors size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-black">iTrust</h1>
            <p className="text-zinc-500 mt-2">{step === 'login' ? 'Bem-vindo de volta!' : step === 'register' ? 'Crie sua conta no sistema' : 'Recuperar Senha'}</p>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm mb-6 flex items-center gap-2 border border-rose-100">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm mb-6 flex items-center gap-2 border border-emerald-100 max-w-md mx-auto">
            <CheckCircle2 size={16} />
            {successMessage}
          </div>
        )}

        {step === 'selectPlan' && registrationData && (
          <PlanStep storeName={registrationData.storeName} onPlanSelect={handlePlanSelect} />
        )}

        {step === 'payment' && planDetails && (
          <PaymentStep details={planDetails} onBackToLogin={handleBackToLogin} />
        )}

        {step === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4 max-w-md mx-auto">
            {forgotPasswordMessage ? (
              <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm flex items-center gap-2 border border-emerald-100">
                <CheckCircle2 size={16} />
                {forgotPasswordMessage}
              </div>
            ) : (
              <>
                <p className="text-sm text-zinc-600 text-center">Digite seu e-mail para receber as instruções de redefinição de senha.</p>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">E-mail</label>
                  <input required type="email" className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition-all" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-md shadow-black/20 mt-4">Enviar</button>
              </>
            )}
          </form>
        )}
        {(step === 'login' || step === 'register') && (
          <form onSubmit={handleSubmit} className="space-y-5 max-w-md mx-auto">
            {step === 'register' && (
              <>
                <div className="flex bg-zinc-100 p-1 rounded-xl mb-4">
                  <button type="button" onClick={() => setRole('MANAGER')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${role === 'MANAGER' ? 'bg-white shadow-sm text-black' : 'text-zinc-500'}`}>Gestor</button>
                  <button type="button" onClick={() => setRole('COLLABORATOR')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${role === 'COLLABORATOR' ? 'bg-white shadow-sm text-black' : 'text-zinc-500'}`}>Colaborador</button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Seu Nome</label>
                  <input required className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition-all" value={formData.userName} onChange={e => setFormData({ ...formData, userName: e.target.value })} />
                </div>
                {role === 'MANAGER' ? (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">Nome do Salão</label>
                      <input required className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition-all" value={formData.storeName} onChange={e => setFormData({ ...formData, storeName: e.target.value })} />
                    </div>
                    <div className="bg-zinc-100 border-2 border-dashed border-zinc-200 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Código da sua Loja</p>
                      <p className="text-xl font-mono font-bold text-zinc-800">{formData.storeCode}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">Código da Loja</label>
                    <input required placeholder="Ex: GLOW123" className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition-all" value={formData.storeCode} onChange={e => setFormData({ ...formData, storeCode: e.target.value.toUpperCase() })} />
                  </div>
                )}
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">E-mail</label>
              <input required type="email" className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition-all" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            {step !== 'register' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-zinc-700">Senha</label>
                  {step === 'login' && (
                    <button type="button" onClick={() => setStep('forgot')} className="text-xs font-medium text-zinc-500 hover:text-black">Esqueci minha senha</button>
                  )}
                </div>
                <div className="relative">
                  <input required type={showPassword ? 'text' : 'password'} className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition-all pr-10" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-400 hover:text-zinc-700">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}
            {step === 'register' && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
                <div className="relative">
                  <input required type={showPassword ? 'text' : 'password'} className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-400 outline-none transition-all pr-10" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-400 hover:text-zinc-700">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}
            <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-md shadow-black/20 mt-6">{step === 'login' ? 'Entrar' : 'Continuar'}</button>
          </form>
        )}

        {step !== 'selectPlan' && step !== 'payment' && (
          <div className="mt-8 text-center space-y-2">
            <button onClick={() => setStep(step === 'login' || step === 'forgot' ? 'register' : 'login')} className="text-sm font-medium text-zinc-500 hover:text-black transition-colors">
              {step === 'login' || step === 'forgot' ? 'Não tem uma conta? Registre-se' : 'Já tem uma conta? Entre'}
            </button>
            <div>
              <button onClick={() => { setStep('login'); setFormData(prev => ({...prev, email: 'avieiravale@gmail.com', password: ''})) }} className="text-xs font-medium text-zinc-400 hover:text-black transition-colors">
                acessar como admin
              </button>
            </div>
          </div>
        )}
      </motion.div>
      <footer className="absolute bottom-4 text-center text-xs text-zinc-400">
        iTrust - Gestão inteligente, confiança absoluta
      </footer>
    </div>
  );
};