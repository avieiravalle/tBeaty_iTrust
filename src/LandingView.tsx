import React from 'react';
import { motion } from 'motion/react';
import { User, Briefcase } from 'lucide-react';

interface LandingViewProps {
  onClientClick: () => void;
  onClientRegisterClick: () => void;
  onAdminClick: () => void;
  onAdminRegisterClick: () => void;
}

export const LandingView = ({ onClientClick, onClientRegisterClick, onAdminClick, onAdminRegisterClick }: LandingViewProps) => {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-5xl font-bold tracking-tighter text-black">iTrust</h1>
        <p className="text-zinc-500 mt-2">Gestão inteligente, confiança absoluta.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-16 flex flex-col md:flex-row gap-6 w-full max-w-lg"
      >
        <div className="flex-1 flex flex-col gap-3">
          <button onClick={onClientClick} className="w-full flex flex-col items-center justify-center gap-3 p-8 bg-white border border-zinc-200 rounded-2xl hover:bg-rose-50 hover:border-rose-200 transition-colors shadow-sm">
            <User size={32} className="text-rose-500" />
            <span className="font-bold text-lg text-zinc-800">Sou Cliente</span>
          </button>
          <button onClick={onClientRegisterClick} className="text-zinc-500 text-sm hover:text-zinc-800 transition-colors text-center">
            Não tem conta? <span className="underline">Cadastre-se</span>
          </button>
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <button onClick={onAdminClick} className="w-full flex flex-col items-center justify-center gap-3 p-8 bg-black text-white rounded-2xl hover:bg-zinc-800 transition-colors shadow-sm">
            <Briefcase size={32} className="text-white" />
            <span className="font-bold text-lg">Sou Gestor</span>
          </button>
          <button onClick={onAdminRegisterClick} className="text-zinc-500 text-sm hover:text-zinc-800 transition-colors text-center">
            Não tem conta? <span className="underline">Cadastre-se</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};