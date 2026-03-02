import React from 'react';
import { motion } from 'motion/react';
import { Scissors } from 'lucide-react';
import { ClientIllustration } from './Illustrations.tsx';

export const LandingView = ({ onSelectSalon, onSelectClient }: { onSelectSalon: () => void, onSelectClient: () => void }) => {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
          <Scissors size={32} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">tBeauty</h1>
        <p className="text-zinc-500 mt-2">Como você quer acessar o sistema?</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl"
      >
        <button onClick={onSelectClient} className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-lg shadow-zinc-200/50 hover:shadow-xl hover:border-zinc-300 transition-all text-zinc-500 hover:text-black focus:ring-2 focus:ring-black outline-none">
          <ClientIllustration />
          <span className="text-lg font-bold">Sou Cliente</span>
        </button>
        
        <button onClick={onSelectSalon} className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-lg shadow-zinc-200/50 hover:shadow-xl hover:border-zinc-300 transition-all text-zinc-500 hover:text-black focus:ring-2 focus:ring-black outline-none">
          <Scissors size={120} className="mx-auto mb-4 p-5" strokeWidth={1.5} />
          <span className="text-lg font-bold">Sou Salão</span>
        </button>
      </motion.div>
    </div>
  );
};